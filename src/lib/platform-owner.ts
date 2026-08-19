/**
 * Platform-owner ACL. Tenant admins, staff, clients, and demo hosts never inherit
 * this — super_admin role alone is not enough. Email allowlist (plus env extras).
 */

export type PlatformOwnerEnv = {
  PLATFORM_OWNER_EMAILS?: string;
  PLATFORM_BOOTSTRAP_EMAIL?: string;
};

export const PLATFORM_OWNER_EMAILS = [
  'rjbizsolution23@gmail.com',
  'rickyjefferson1006@gmail.com',
  'rickjefferson@rickjeffersonsolutions.com',
] as const;

export const PLATFORM_OWNER_ONLY_ERROR = 'Forbidden: platform owner only';

export function normalizeEmail(email?: string | null): string {
  return String(email || '').trim().toLowerCase();
}

export function extraOwnerEmailsFromEnv(env?: PlatformOwnerEnv | null): string[] {
  const extra = String(env?.PLATFORM_OWNER_EMAILS || '')
    .split(/[,;\s]+/)
    .map((s) => normalizeEmail(s))
    .filter(Boolean);
  const boot = normalizeEmail(env?.PLATFORM_BOOTSTRAP_EMAIL);
  if (boot && !extra.includes(boot)) extra.push(boot);
  return extra;
}

export function isPlatformOwnerEmail(email?: string | null, env?: PlatformOwnerEnv | null): boolean {
  const n = normalizeEmail(email);
  if (!n) return false;
  if ((PLATFORM_OWNER_EMAILS as readonly string[]).includes(n)) return true;
  return extraOwnerEmailsFromEnv(env).includes(n);
}

export function isPlatformOwnerUser(
  user?: { email?: string | null; platformOwner?: boolean } | null,
  env?: PlatformOwnerEnv | null,
): boolean {
  if (!user) return false;
  if (user.platformOwner === true && isPlatformOwnerEmail(user.email, env)) return true;
  return isPlatformOwnerEmail(user.email, env);
}

export function withPlatformOwnerFlag<T extends { email?: string | null }>(
  user: T,
  env?: PlatformOwnerEnv | null,
): T & { platformOwner: boolean } {
  return { ...user, platformOwner: isPlatformOwnerEmail(user.email, env) };
}

/** Tenant team invites cannot mint platform operators. */
export function sanitizeTenantInviteRole(role: unknown): 'member' | 'admin' | null {
  const r = String(role || 'member').toLowerCase().trim();
  if (r === 'member' || r === 'admin') return r;
  return null;
}

/** Admin-console user create: super_admin only when that email is an owner. */
export function sanitizePlatformCreatedRole(
  role: unknown,
  email: string,
  env?: PlatformOwnerEnv | null,
): 'member' | 'admin' | 'client' | 'super_admin' | null {
  const r = String(role || '').toLowerCase().trim();
  if (r === 'super_admin') return isPlatformOwnerEmail(email, env) ? 'super_admin' : null;
  if (r === 'member' || r === 'admin' || r === 'client') return r;
  return null;
}

export function sessionIdFromRequest(input: {
  authorization?: string | null;
  cookie?: string | null;
  queryToken?: string | null;
}): string {
  const auth = String(input.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (auth) return auth;
  const q = String(input.queryToken || '').trim();
  if (q) return q;
  const cookie = String(input.cookie || '');
  const m = cookie.match(/(?:^|;\s*)fcra_session=([^;]+)/i);
  if (!m) return '';
  try {
    return decodeURIComponent(m[1].trim());
  } catch {
    return m[1].trim();
  }
}

/** Public lead forms + app chrome. Everything else under /static/brand is owner-only. */
export function isPublicBrandAsset(path: string): boolean {
  const p = String(path || '').split('?')[0];
  if (p === '/static/brand/brand.css' || p === '/static/brand/forms.css' || p === '/static/brand/turnstile.js') return true;
  if (p.startsWith('/static/brand/pwa-icon')) return true;
  if (p.startsWith('/static/brand/forms/')) return true;
  return false;
}

export function isPrivateBrandHubPath(path: string): boolean {
  const p = String(path || '').split('?')[0];
  if (!p.startsWith('/static/brand')) return false;
  if (p === '/static/brand' || p === '/static/brand/') return true;
  return !isPublicBrandAsset(p);
}
