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
import { provisionTenant, cloneTenantConfiguration } from './tenant-provision';
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

  /** Central OAuth callback hub — state carries tenant subdomain for redirect */
  app.get('/api/oauth/:provider/callback', async (c) => {
    const provider = c.req.param('provider');
    const stateRaw = c.req.query('state') || '';
    let state: { orgId?: string; subdomain?: string; returnUrl?: string } = {};
    try {
      state = JSON.parse(atob(String(stateRaw).replace(/-/g, '+').replace(/_/g, '/')));
    } catch { /* invalid state */ }

    const returnBase = state.subdomain
      ? tenantPortalOrigin(state.subdomain, c.env)
      : (state.returnUrl || `https://${OAUTH_HOST}`);

    if (provider === 'ghl') {
      const code = c.req.query('code');
      if (!code || !state.orgId) {
        return c.redirect(`${returnBase}/app?oauth=error&provider=ghl`);
      }
      // GHL token exchange wired in integration-os; redirect back to tenant workspace
      return c.redirect(`${returnBase}/app?oauth=ghl&code=${encodeURIComponent(String(code))}&org=${encodeURIComponent(state.orgId)}`);
    }

    return c.redirect(`${returnBase}/app?oauth=unsupported&provider=${encodeURIComponent(provider)}`);
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
