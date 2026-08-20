/** Canonical public origin for Smart FCRA (sales site, checkout return, emails). */
export const CANONICAL_HOST = 'smartfcra.com';
export const CANONICAL_ORIGIN = 'https://smartfcra.com';
export const PAGES_HOST = 'smart-fcra-v2.pages.dev';

const ALIAS_HOSTS = new Set(['www.smartfcra.com', PAGES_HOST]);

export function hostnameOf(value: string | null | undefined): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const u = raw.includes('://') ? new URL(raw) : new URL(`https://${raw}`);
    return u.hostname.toLowerCase();
  } catch {
    return raw.split('/')[0].split(':')[0].toLowerCase();
  }
}

export function isPublicAliasHost(host: string): boolean {
  return ALIAS_HOSTS.has(String(host || '').split(':')[0].toLowerCase());
}

/** True for tenant workspace hosts (*.smartfcra.com) — do not 301 to apex. */
export function isTenantWorkspaceHost(host: string): boolean {
  const h = String(host || '').split(':')[0].toLowerCase();
  if (!h || h === 'localhost' || h === '127.0.0.1') return false;
  if (h.endsWith('.pages.dev')) return false;
  if (h === CANONICAL_HOST || h === `www.${CANONICAL_HOST}`) return false;
  if (h.endsWith(`.${CANONICAL_HOST}`)) {
    const sub = h.slice(0, -(CANONICAL_HOST.length + 1));
    return !!sub && !sub.includes('.') && sub !== 'www';
  }
  return true;
}

/** 301 www / pages.dev HTML to https://smartfcra.com — never tenant subdomains or custom domains. */
export function canonicalRedirectUrl(requestUrl: string, hostHeader?: string | null): string | null {
  let host = String(hostHeader || '').split(':')[0].toLowerCase();
  if (!host) {
    try {
      host = new URL(requestUrl).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
  if (isTenantWorkspaceHost(host)) return null;
  if (!ALIAS_HOSTS.has(host)) return null;
  try {
    const u = new URL(requestUrl);
    u.protocol = 'https:';
    u.host = CANONICAL_HOST;
    return u.toString();
  } catch {
    return null;
  }
}

/**
 * Public links (checkout return, emails, payment-link after_completion).
 * Rewrites www / pages.dev / empty to the custom domain.
 * Honors an explicit FRONTEND_URL including localhost for local wrangler.
 */
export function resolvePublicOrigin(
  env: { FRONTEND_URL?: string; APP_BASE_URL?: string },
  requestUrl?: string,
): string {
  const fromEnv = String(env.FRONTEND_URL || env.APP_BASE_URL || '').replace(/\/$/, '');
  if (fromEnv) {
    try {
      const host = new URL(fromEnv).hostname.toLowerCase();
      if (isPublicAliasHost(host) || host === CANONICAL_HOST) return CANONICAL_ORIGIN;
    } catch {
      /* keep fromEnv */
    }
    return fromEnv;
  }
  try {
    if (requestUrl) {
      const u = new URL(requestUrl);
      const host = u.hostname.toLowerCase();
      if (host && host !== 'localhost' && host !== '127.0.0.1' && !isPublicAliasHost(host) && host !== CANONICAL_HOST) {
        return `${u.protocol}//${u.host}`;
      }
      if (host === CANONICAL_HOST || isPublicAliasHost(host)) return CANONICAL_ORIGIN;
    }
  } catch {
    /* ignore */
  }
  return CANONICAL_ORIGIN;
}
