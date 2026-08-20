/**
 * Tenant resolver — hostname → organization context.
 * Supports *.smartfcra.com subdomains and verified custom domains.
 */
import { resolveTenantTheme, type TenantTheme } from './tenant-theme';
import { CANONICAL_HOST } from './public-origin';

export const PLATFORM_HOST = CANONICAL_HOST;
export const OAUTH_HOST = `app.${CANONICAL_HOST}`;

/** Subdomains reserved for platform infrastructure — never assign to tenants */
export const RESERVED_SUBDOMAINS = new Set([
  'www', 'app', 'api', 'admin', 'oauth', 'mail', 'smtp', 'ftp', 'demo',
  'static', 'cdn', 'assets', 'support', 'status', 'billing', 'stripe',
  'webhooks', 'pages', 'dev', 'staging', 'test', 'localhost',
]);

export type TenantHostOrg = {
  id: string;
  name: string;
  slug: string;
  subdomain: string | null;
  plan: string;
  legalName: string | null;
  settings: Record<string, unknown>;
  theme: TenantTheme;
  portalUrl: string;
  attributionMode: 'powered_by' | 'minimal' | 'hidden';
  hostType: 'subdomain' | 'custom_domain';
  host: string;
};

function hostnameOf(host: string | null | undefined): string {
  return String(host || '').split(':')[0].toLowerCase().trim();
}

export function isLocalDevHost(host: string): boolean {
  const h = hostnameOf(host);
  return !h || h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost');
}

export function isPlatformRootHost(host: string): boolean {
  const h = hostnameOf(host);
  return h === PLATFORM_HOST || h === `www.${PLATFORM_HOST}` || h.endsWith('.pages.dev');
}

export function isPlatformSubdomainHost(host: string): boolean {
  const h = hostnameOf(host);
  if (isLocalDevHost(h) || isPlatformRootHost(h)) return false;
  return h.endsWith(`.${PLATFORM_HOST}`);
}

export function parseTenantSubdomain(host: string | null | undefined): string | null {
  const h = hostnameOf(host);
  if (!isPlatformSubdomainHost(h)) return null;
  const sub = h.slice(0, -(PLATFORM_HOST.length + 1));
  if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.has(sub)) return null;
  return sub;
}

export function validateSubdomain(value: string): { ok: boolean; error?: string; normalized?: string } {
  const s = String(value || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  if (s.length < 3) return { ok: false, error: 'Subdomain must be at least 3 characters' };
  if (s.length > 40) return { ok: false, error: 'Subdomain must be 40 characters or fewer' };
  if (!/^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])?$/.test(s)) {
    return { ok: false, error: 'Use lowercase letters, numbers, and hyphens only' };
  }
  if (RESERVED_SUBDOMAINS.has(s)) return { ok: false, error: 'That subdomain is reserved for Smart FCRA platform use' };
  return { ok: true, normalized: s };
}

export function tenantPortalOrigin(subdomain: string | null | undefined, env?: { FRONTEND_URL?: string }): string {
  const fromEnv = String(env?.FRONTEND_URL || '').replace(/\/$/, '');
  if (fromEnv) {
    try {
      const u = new URL(fromEnv);
      if (u.hostname === 'localhost' || u.hostname === '127.0.0.1') return fromEnv;
    } catch { /* fall through */ }
  }
  const sub = String(subdomain || '').trim().toLowerCase();
  if (sub) return `https://${sub}.${PLATFORM_HOST}`;
  return `https://${PLATFORM_HOST}`;
}

export function resolvePortalUrlForOrg(
  org: { subdomain?: string | null; settings?: any; custom_domain?: string | null; custom_domain_verified?: number | boolean },
  env?: { FRONTEND_URL?: string },
): string {
  const settings = typeof org.settings === 'object' ? org.settings : {};
  const customDomain = org.custom_domain || settings.custom_domain;
  const verified = org.custom_domain_verified || settings.custom_domain_verified;
  if (customDomain && verified) return `https://${String(customDomain).replace(/^https?:\/\//, '').split('/')[0]}`;
  return tenantPortalOrigin(org.subdomain, env);
}

function parseSettings(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as Record<string, unknown>;
  try { return JSON.parse(String(raw) || '{}'); } catch { return {}; }
}

function rowToTenantHostOrg(row: any, hostType: 'subdomain' | 'custom_domain', host: string, env?: { FRONTEND_URL?: string }): TenantHostOrg {
  const settings = parseSettings(row.settings);
  const subdomain = row.subdomain ? String(row.subdomain) : null;
  const attributionRaw = String(row.attribution_mode || settings.attribution_mode || 'powered_by');
  const attributionMode = (['powered_by', 'minimal', 'hidden'].includes(attributionRaw)
    ? attributionRaw
    : 'powered_by') as TenantHostOrg['attributionMode'];

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    subdomain,
    plan: row.plan || 'free',
    legalName: row.legal_name || null,
    settings,
    theme: resolveTenantTheme(settings, row.name),
    portalUrl: resolvePortalUrlForOrg({
      subdomain,
      settings,
      custom_domain: row.custom_domain,
      custom_domain_verified: row.custom_domain_verified,
    }, env),
    attributionMode,
    hostType,
    host,
  };
}

/** Resolve tenant from verified custom domain (full hostname). */
export async function resolveOrgByCustomDomain(
  db: D1Database,
  host: string | null | undefined,
  env?: { FRONTEND_URL?: string },
): Promise<TenantHostOrg | null> {
  const h = hostnameOf(host);
  if (!h || isLocalDevHost(h) || isPlatformRootHost(h) || isPlatformSubdomainHost(h)) return null;

  const row = await db.prepare(
    `SELECT id, name, slug, subdomain, plan, legal_name, settings, custom_domain, custom_domain_verified, attribution_mode
     FROM organizations WHERE custom_domain = ? AND custom_domain_verified = 1 LIMIT 1`,
  ).bind(h).first().catch(() => null) as any;

  if (!row) {
    const bySettings = await db.prepare(
      `SELECT id, name, slug, subdomain, plan, legal_name, settings, custom_domain, custom_domain_verified, attribution_mode
       FROM organizations WHERE settings LIKE ? LIMIT 5`,
    ).bind(`%"custom_domain":"${h}"%`).all().catch(() => ({ results: [] }));
    const match = ((bySettings as any).results || []).find((r: any) => {
      try {
        const s = JSON.parse(r.settings || '{}');
        return s.custom_domain === h && s.custom_domain_verified;
      } catch { return false; }
    });
    if (!match) return null;
    return rowToTenantHostOrg(match, 'custom_domain', h, env);
  }

  return rowToTenantHostOrg(row, 'custom_domain', h, env);
}

/** Resolve tenant from *.smartfcra.com subdomain. */
export async function resolveOrgBySubdomain(
  db: D1Database,
  host: string | null | undefined,
  env?: { FRONTEND_URL?: string },
): Promise<TenantHostOrg | null> {
  const sub = parseTenantSubdomain(host);
  if (!sub) return null;

  const row = await db.prepare(
    `SELECT id, name, slug, subdomain, plan, legal_name, settings, custom_domain, custom_domain_verified, attribution_mode
     FROM organizations WHERE lower(subdomain) = ? LIMIT 1`,
  ).bind(sub).first().catch(() => null) as any;

  if (!row) return null;
  return rowToTenantHostOrg(row, 'subdomain', hostnameOf(host), env);
}

/** Primary tenant resolver — subdomain first, then custom domain. */
export async function resolveTenantByHost(
  db: D1Database,
  host: string | null | undefined,
  env?: { FRONTEND_URL?: string },
): Promise<TenantHostOrg | null> {
  const subTenant = await resolveOrgBySubdomain(db, host, env);
  if (subTenant) return subTenant;
  return resolveOrgByCustomDomain(db, host, env);
}

export function publicTenantPayload(tenant: TenantHostOrg): Record<string, unknown> {
  return {
    found: true,
    orgId: tenant.id,
    name: tenant.name,
    legalName: tenant.legalName,
    subdomain: tenant.subdomain,
    plan: tenant.plan,
    portalUrl: tenant.portalUrl,
    hostType: tenant.hostType,
    attribution: {
      mode: tenant.attributionMode,
      label: tenant.attributionMode === 'hidden' ? null : 'Powered by Smart FCRA',
    },
    theme: tenant.theme,
    branding: tenant.settings.branding || null,
    letterhead: tenant.settings.letterhead || null,
  };
}
