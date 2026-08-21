/**
 * Tenant provisioning + public tenant resolution routes.
 */
import type { Hono } from 'hono';
import {
  resolveTenantByHost,
  publicTenantPayload,
  validateSubdomain,
  tenantPortalOrigin,
  OAUTH_HOST,
} from './tenant-resolver';
import { provisionTenant, cloneTenantConfiguration, assignOrgSubdomain, backfillOrgSubdomains } from './tenant-provision';
import { tenantConfigSchemaPayload } from './tenant-config-lock';
import {
  decodeOAuthState,
  encodeOAuthState,
  exchangeOAuthCode,
  oauthAuthorizeUrl,
  oauthCallbackUrl,
  oauthClientCredentials,
  oauthReturnUrl,
  persistOAuthTokens,
  type OAuthProviderId,
} from './oauth-hub';
import { isPlatformOwnerUser } from './platform-owner';

export function registerTenantRoutes(
  app: Hono<any>,
  deps: {
    authMiddleware: any;
    adminGateMiddleware: any;
  },
): void {
  /** Public — SPA boot loads tenant branding from hostname */
  app.get('/api/public/tenant-by-host', async (c) => {
    const host = c.req.query('host') || c.req.header('host');
    const tenant = await resolveTenantByHost(c.env.DB, host, c.env);
    if (!tenant) return c.json({ found: false, host: String(host || '').split(':')[0] });
    return c.json(publicTenantPayload(tenant));
  });

  /** Check subdomain availability before CREATE BUSINESS */
  app.get('/api/admin/tenants/subdomain-check', deps.authMiddleware, deps.adminGateMiddleware, async (c) => {
    const raw = c.req.query('subdomain') || '';
    const check = validateSubdomain(raw);
    if (!check.ok) return c.json({ available: false, error: check.error });
    const taken = await c.env.DB.prepare(
      'SELECT id, name FROM organizations WHERE lower(subdomain) = ? LIMIT 1',
    ).bind(check.normalized).first();
    return c.json({
      available: !taken,
      normalized: check.normalized,
      portalUrl: tenantPortalOrigin(check.normalized, c.env),
      takenBy: taken?.name || null,
    });
  });

  /** One-click CREATE BUSINESS */
  app.post('/api/admin/tenants/provision', deps.authMiddleware, deps.adminGateMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    try {
      const result = await provisionTenant(c.env.DB, user.id, {
        businessName: body.businessName || body.business,
        legalName: body.legalName || body.legal_name,
        ownerName: body.ownerName || body.owner,
        ownerEmail: body.ownerEmail || body.email,
        ownerPassword: body.ownerPassword || body.password,
        phone: body.phone,
        supportEmail: body.supportEmail || body.support_email,
        address: body.address,
        city: body.city,
        state: body.state,
        zip: body.zip,
        subdomain: body.subdomain,
        primaryColor: body.primaryColor || body.primary_color,
        secondaryColor: body.secondaryColor || body.secondary_color,
        logoUrl: body.logoUrl || body.logo_url,
        logoBase64: body.logoBase64 || body.logo_base64,
        timezone: body.timezone,
        plan: body.plan || 'professional',
        attributionMode: body.attributionMode || body.attribution_mode || 'powered_by',
      });
      return c.json({ ok: true, ...result });
    } catch (e: any) {
      return c.json({ error: e.message || 'Provision failed' }, 400);
    }
  });

  /** Clone branding/workflows config — never secrets or consumer data */
  app.post('/api/admin/tenants/:targetOrgId/clone-config', deps.authMiddleware, deps.adminGateMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const sourceOrgId = String(body.sourceOrgId || body.fromOrgId || '').trim();
    const targetOrgId = c.req.param('targetOrgId');
    if (!sourceOrgId) return c.json({ error: 'sourceOrgId required' }, 400);
    try {
      const result = await cloneTenantConfiguration(c.env.DB, user.id, sourceOrgId, targetOrgId);
      return c.json({ ok: true, ...result });
    } catch (e: any) {
      return c.json({ error: e.message || 'Clone failed' }, 400);
    }
  });

  app.get('/api/admin/tenants/config-schema', deps.authMiddleware, async (c) => {
    return c.json(tenantConfigSchemaPayload());
  });

  app.put('/api/admin/tenants/:orgId/subdomain', deps.authMiddleware, deps.adminGateMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    try {
      const result = await assignOrgSubdomain(
        c.env.DB,
        user.id,
        c.req.param('orgId'),
        String(body.subdomain || ''),
      );
      return c.json({ ok: true, ...result });
    } catch (e: any) {
      return c.json({ error: e.message || 'Assign failed' }, 400);
    }
  });

  app.post('/api/admin/tenants/backfill-subdomains', deps.authMiddleware, deps.adminGateMiddleware, async (c) => {
    const user = c.get('user');
    try {
      const result = await backfillOrgSubdomains(c.env.DB, user.id);
      return c.json({ ok: true, ...result });
    } catch (e: any) {
      return c.json({ error: e.message || 'Backfill failed' }, 400);
    }
  });

  /** Start OAuth from tenant workspace — redirects to provider */
  app.get('/api/oauth/:provider/start', deps.authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role === 'client') return c.json({ error: 'Staff only' }, 403);
    const provider = c.req.param('provider') as OAuthProviderId;
    if (!['ghl', 'meta', 'google'].includes(provider)) {
      return c.json({ error: 'Unsupported OAuth provider' }, 400);
    }
    const creds = oauthClientCredentials(c.env, provider);
    if (!creds) {
      return c.json({
        ok: false,
        error: `${provider} OAuth is not configured on the platform. Set ${provider.toUpperCase()}_OAUTH_CLIENT_ID and _CLIENT_SECRET.`,
      }, 400);
    }
    const org = await c.env.DB.prepare('SELECT subdomain FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    const state = await encodeOAuthState({
      orgId: user.org_id,
      subdomain: org?.subdomain || '',
      userId: user.id,
      provider,
    }, c.env);
    const redirectUri = oauthCallbackUrl(c.env, provider);
    const authorizeUrl = oauthAuthorizeUrl({ provider, clientId: creds.clientId, redirectUri, state });
    if (!authorizeUrl) return c.json({ error: 'Unable to build authorize URL' }, 500);
    if (c.req.query('redirect') === '0') {
      return c.json({ ok: true, authorizeUrl, redirectUri, state: 'signed' });
    }
    return c.redirect(authorizeUrl);
  });

  /** Central OAuth callback hub — exchange code, store vault tokens, return to tenant subdomain */
  app.get('/api/oauth/:provider/callback', async (c) => {
    const provider = c.req.param('provider') as OAuthProviderId;
    const errQ = c.req.query('error');
    const state = await decodeOAuthState(c.req.query('state') || '', c.env);
    const fallback = `https://${OAUTH_HOST}`;
    if (!state) {
      return c.redirect(`${fallback}/app?oauth=error&reason=invalid_state&provider=${encodeURIComponent(provider)}`);
    }
    const returnBase = oauthReturnUrl(state, c.env, { oauth: 'error', provider });
    if (errQ) {
      return c.redirect(oauthReturnUrl(state, c.env, { oauth: 'error', provider, reason: String(errQ) }));
    }
    const code = c.req.query('code');
    if (!code) return c.redirect(returnBase);

    try {
      const tokens = await exchangeOAuthCode(provider, String(code), c.env);
      await persistOAuthTokens({
        db: c.env.DB,
        env: c.env,
        orgId: state.orgId,
        userId: state.userId,
        provider,
        tokens,
      });
      return c.redirect(oauthReturnUrl(state, c.env, { oauth: 'connected', provider }));
    } catch (e: any) {
      return c.redirect(oauthReturnUrl(state, c.env, {
        oauth: 'error',
        provider,
        reason: String(e.message || 'exchange_failed').slice(0, 80),
      }));
    }
  });

  app.get('/api/admin/tenants/provision-log/:orgId', deps.authMiddleware, deps.adminGateMiddleware, async (c) => {
    const orgId = c.req.param('orgId');
    const rows = await c.env.DB.prepare(
      `SELECT * FROM tenant_provision_log WHERE org_id = ? ORDER BY created_at DESC LIMIT 50`,
    ).bind(orgId).all().catch(() => ({ results: [] }));
    return c.json({ log: rows.results || [] });
  });
}

export { isPlatformOwnerUser };
