/**
 * Central OAuth hub — one callback URL for all tenants.
 * https://app.smartfcra.com/api/oauth/{provider}/callback
 * Signed state tells Smart FCRA which org initiated the connection.
 */
import { generateId } from './auth';
import { storeIntegrationSecret, type VaultProvider } from './credential-vault';
import { upsertIntegrationConnection } from './integration-hub';
import { tenantPortalOrigin, OAUTH_HOST } from './tenant-resolver';
import { resolveOrgEncryptionKey } from './platform-extensions';

export type OAuthProviderId = 'ghl' | 'meta' | 'google';

export type OAuthStatePayload = {
  orgId: string;
  subdomain: string;
  userId: string;
  provider: OAuthProviderId;
  exp: number;
  nonce: string;
};

export type OAuthEnv = {
  PII_ENCRYPTION_KEY?: string;
  OAUTH_STATE_SECRET?: string;
  APP_BASE_URL?: string;
  FRONTEND_URL?: string;
  GHL_OAUTH_CLIENT_ID?: string;
  GHL_OAUTH_CLIENT_SECRET?: string;
  META_OAUTH_CLIENT_ID?: string;
  META_OAUTH_CLIENT_SECRET?: string;
  GOOGLE_OAUTH_CLIENT_ID?: string;
  GOOGLE_OAUTH_CLIENT_SECRET?: string;
};

const PROVIDER_VAULT: Record<OAuthProviderId, VaultProvider> = {
  ghl: 'ghl',
  meta: 'meta',
  google: 'google',
};

export function oauthCallbackUrl(env: OAuthEnv, provider: OAuthProviderId): string {
  const base = String(env.APP_BASE_URL || env.FRONTEND_URL || `https://${OAUTH_HOST}`).replace(/\/$/, '');
  try {
    const host = new URL(base).hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') {
      return `${base}/api/oauth/${provider}/callback`;
    }
  } catch { /* */ }
  return `https://${OAUTH_HOST}/api/oauth/${provider}/callback`;
}

function stateSecret(env: OAuthEnv): string {
  return String(env.OAUTH_STATE_SECRET || env.PII_ENCRYPTION_KEY || 'smart-fcra-oauth-state-dev');
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64url(s: string): string {
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromB64url(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
}

export async function encodeOAuthState(payload: Omit<OAuthStatePayload, 'exp' | 'nonce'>, env: OAuthEnv): Promise<string> {
  const body: OAuthStatePayload = {
    ...payload,
    nonce: generateId(),
    exp: Date.now() + 15 * 60 * 1000,
  };
  const json = JSON.stringify(body);
  const sig = await hmacHex(stateSecret(env), json);
  return `${b64url(json)}.${sig}`;
}

export async function decodeOAuthState(raw: string, env: OAuthEnv): Promise<OAuthStatePayload | null> {
  const [encoded, sig] = String(raw || '').split('.');
  if (!encoded || !sig) return null;
  let json: string;
  try { json = fromB64url(encoded); } catch { return null; }
  const expected = await hmacHex(stateSecret(env), json);
  if (expected !== sig) return null;
  try {
    const parsed = JSON.parse(json) as OAuthStatePayload;
    if (!parsed.orgId || !parsed.provider || !parsed.exp) return null;
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function oauthAuthorizeUrl(opts: {
  provider: OAuthProviderId;
  clientId: string;
  redirectUri: string;
  state: string;
}): string | null {
  const { provider, clientId, redirectUri, state } = opts;
  if (provider === 'ghl') {
    return `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;
  }
  if (provider === 'meta') {
    const scope = ['ads_management', 'ads_read', 'pages_show_list', 'instagram_basic', 'business_management'].join(',');
    return `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code&scope=${encodeURIComponent(scope)}`;
  }
  if (provider === 'google') {
    const scope = ['https://www.googleapis.com/auth/adwords', 'https://www.googleapis.com/auth/userinfo.email'].join(' ');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}&response_type=code&access_type=offline&prompt=consent&scope=${encodeURIComponent(scope)}`;
  }
  return null;
}

export function oauthClientCredentials(env: OAuthEnv, provider: OAuthProviderId): { clientId: string; clientSecret: string } | null {
  if (provider === 'ghl' && env.GHL_OAUTH_CLIENT_ID && env.GHL_OAUTH_CLIENT_SECRET) {
    return { clientId: env.GHL_OAUTH_CLIENT_ID, clientSecret: env.GHL_OAUTH_CLIENT_SECRET };
  }
  if (provider === 'meta' && env.META_OAUTH_CLIENT_ID && env.META_OAUTH_CLIENT_SECRET) {
    return { clientId: env.META_OAUTH_CLIENT_ID, clientSecret: env.META_OAUTH_CLIENT_SECRET };
  }
  if (provider === 'google' && env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET) {
    return { clientId: env.GOOGLE_OAUTH_CLIENT_ID, clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET };
  }
  return null;
}

export type TokenExchangeResult = {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  extra?: Record<string, string>;
};

export async function exchangeOAuthCode(
  provider: OAuthProviderId,
  code: string,
  env: OAuthEnv,
): Promise<TokenExchangeResult> {
  const creds = oauthClientCredentials(env, provider);
  if (!creds) throw new Error(`${provider} OAuth is not configured on the platform`);
  const redirectUri = oauthCallbackUrl(env, provider);

  if (provider === 'ghl') {
    const res = await fetch('https://services.leadconnectorhq.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        client_id: creds.clientId,
        client_secret: creds.clientSecret,
        grant_type: 'authorization_code',
        code,
        user_type: 'Location',
        redirect_uri: redirectUri,
      }),
    });
    const data = await res.json() as any;
    if (!res.ok || !data.access_token) throw new Error(data.message || data.error || 'GHL token exchange failed');
    return {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
      expiresIn: Number(data.expires_in) || undefined,
      extra: {
        locationId: String(data.locationId || data.location_id || ''),
        companyId: String(data.companyId || data.company_id || ''),
      },
    };
  }

  if (provider === 'meta') {
    const url = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    url.searchParams.set('client_id', creds.clientId);
    url.searchParams.set('client_secret', creds.clientSecret);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('code', code);
    const res = await fetch(url.toString());
    const data = await res.json() as any;
    if (!res.ok || !data.access_token) throw new Error(data.error?.message || 'Meta token exchange failed');
    return {
      accessToken: String(data.access_token),
      expiresIn: Number(data.expires_in) || undefined,
    };
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });
  const data = await res.json() as any;
  if (!res.ok || !data.access_token) throw new Error(data.error_description || data.error || 'Google token exchange failed');
  return {
    accessToken: String(data.access_token),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    expiresIn: Number(data.expires_in) || undefined,
  };
}

export async function persistOAuthTokens(opts: {
  db: D1Database;
  env: OAuthEnv;
  orgId: string;
  userId: string;
  provider: OAuthProviderId;
  tokens: TokenExchangeResult;
}): Promise<void> {
  const encryptionKey = resolveOrgEncryptionKey(opts.env.PII_ENCRYPTION_KEY, opts.orgId);
  const vaultProvider = PROVIDER_VAULT[opts.provider];
  await storeIntegrationSecret({
    db: opts.db,
    orgId: opts.orgId,
    provider: vaultProvider,
    secretKey: 'access_token',
    plaintext: opts.tokens.accessToken,
    encryptionKey,
    createdBy: opts.userId,
    id: generateId(),
  });
  if (opts.tokens.refreshToken) {
    await storeIntegrationSecret({
      db: opts.db,
      orgId: opts.orgId,
      provider: vaultProvider,
      secretKey: 'refresh_token',
      plaintext: opts.tokens.refreshToken,
      encryptionKey,
      createdBy: opts.userId,
      id: generateId(),
    });
  }
  const expiresAt = opts.tokens.expiresIn
    ? new Date(Date.now() + opts.tokens.expiresIn * 1000).toISOString()
    : undefined;
  await upsertIntegrationConnection({
    db: opts.db,
    orgId: opts.orgId,
    provider: opts.provider,
    id: generateId(),
    patch: {
      authType: 'oauth',
      status: 'connected',
      healthStatus: 'healthy',
      lastSuccessAt: new Date().toISOString(),
      lastError: '',
      tokenExpiresAt: expiresAt,
      locationId: opts.tokens.extra?.locationId || undefined,
      config: opts.tokens.extra || {},
    },
  });
}

export function oauthReturnUrl(state: OAuthStatePayload, env: OAuthEnv, query: Record<string, string>): string {
  const base = tenantPortalOrigin(state.subdomain, env);
  const q = new URLSearchParams(query);
  return `${base}/app?${q.toString()}`;
}
