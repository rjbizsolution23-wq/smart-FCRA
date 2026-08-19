/**
 * Per-organization integration credentials — GHL, MFSN, Twilio overrides.
 * Falls back to platform env when org settings not configured.
 */
import type { GhlEnv } from './ghl-client';
import type { MfsnEnv } from '../engine/mfsn-client';
import { ghlConfigured as platformGhlConfigured } from './ghl-client';
import { resolvePartnerMfsnCredentials } from '../engine/mfsn-client';
import { loadIntegrationSecret } from './credential-vault';

export type OrgIntegrations = {
  ghl?: {
    enabled?: boolean;
    pitToken?: string;
    locationId?: string;
    apiBase?: string;
  };
  mfsn?: {
    enabled?: boolean;
    email?: string;
    password?: string;
    clientToken?: string;
    affiliateId?: string;
    apiUrl?: string;
  };
  twilio?: {
    accountSid?: string;
    authToken?: string;
    phoneNumber?: string;
  };
};

export function parseOrgIntegrations(settings: any): OrgIntegrations {
  if (!settings || typeof settings !== 'object') return {};
  return settings.integrations || {};
}

export function mergeGhlEnv(platformEnv: GhlEnv, orgSettings: any): GhlEnv {
  const integ = parseOrgIntegrations(orgSettings).ghl || {};
  if (!integ.enabled && !integ.pitToken) return platformEnv;
  const token = integ.pitToken === '__vault__' ? platformEnv.GHL_PIT_TOKEN : integ.pitToken;
  if (!token && !integ.locationId) return platformEnv;
  return {
    ...platformEnv,
    GHL_PIT_TOKEN: token || platformEnv.GHL_PIT_TOKEN,
    GHL_API_KEY: token || platformEnv.GHL_API_KEY,
    GHL_LOCATION_ID: integ.locationId || platformEnv.GHL_LOCATION_ID,
    GHL_API_BASE: integ.apiBase || platformEnv.GHL_API_BASE,
  };
}

export function orgGhlConfigured(platformEnv: GhlEnv, orgSettings: any): boolean {
  const merged = mergeGhlEnv(platformEnv, orgSettings);
  return platformGhlConfigured(merged);
}

export function mergeMfsnEnv(platformEnv: MfsnEnv, orgSettings: any): MfsnEnv {
  const integ = parseOrgIntegrations(orgSettings).mfsn || {};
  if (!integ.enabled && !integ.email) return platformEnv;
  return {
    ...platformEnv,
    MFSN_EMAIL: integ.email || platformEnv.MFSN_EMAIL,
    MFSN_PASSWORD: integ.password || platformEnv.MFSN_PASSWORD,
    MFSN_CLIENT_TOKEN: integ.clientToken || platformEnv.MFSN_CLIENT_TOKEN,
    MFSN_API_URL: integ.apiUrl || platformEnv.MFSN_API_URL,
  };
}

export function resolveOrgMfsnCredentials(platformEnv: MfsnEnv, orgSettings: any) {
  const merged = mergeMfsnEnv(platformEnv, orgSettings);
  return resolvePartnerMfsnCredentials(merged);
}

/** Mask secrets for API responses — show last 4 chars only. */
export function maskSecret(value?: string | null): string | null {
  if (!value) return null;
  const s = String(value);
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.min(8, s.length - 4))}${s.slice(-4)}`;
}

export function integrationsStatusView(orgSettings: any, platformEnv: any): Record<string, unknown> {
  const integ = parseOrgIntegrations(orgSettings);
  const platformTwilio = !!(platformEnv.TWILIO_ACCOUNT_SID && platformEnv.TWILIO_AUTH_TOKEN && platformEnv.TWILIO_PHONE_NUMBER);
  return {
    ghl: {
      orgConfigured: !!(integ.ghl?.pitToken && integ.ghl?.locationId),
      platformConfigured: platformGhlConfigured(platformEnv),
      enabled: integ.ghl?.enabled !== false,
      locationId: integ.ghl?.locationId || platformEnv.GHL_LOCATION_ID || null,
      pitTokenMasked: maskSecret(integ.ghl?.pitToken || platformEnv.GHL_PIT_TOKEN),
    },
    mfsn: {
      orgConfigured: !!(integ.mfsn?.email && integ.mfsn?.password),
      platformConfigured: !!resolvePartnerMfsnCredentials(platformEnv),
      enabled: integ.mfsn?.enabled !== false,
      email: integ.mfsn?.email || null,
      affiliateId: integ.mfsn?.affiliateId || 'A8289',
      passwordMasked: maskSecret(integ.mfsn?.password),
      clientTokenMasked: maskSecret(integ.mfsn?.clientToken),
    },
    twilio: {
      orgConfigured: !!(integ.twilio?.accountSid && integ.twilio?.phoneNumber),
      platformConfigured: platformTwilio,
      enabled: integ.twilio?.enabled !== false,
      phoneNumber: integ.twilio?.phoneNumber || platformEnv.TWILIO_PHONE_NUMBER || null,
      accountSidMasked: maskSecret(integ.twilio?.accountSid === '__vault__' ? 'vault' : integ.twilio?.accountSid),
      authTokenMasked: integ.twilio?.accountSid ? '********' : null,
      source: integ.twilio?.accountSid ? 'org' : platformTwilio ? 'platform' : 'none',
    },
  };
}

export type TwilioCredentials = {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
  source: 'org' | 'platform';
};

/** Resolve Twilio credentials: org vault first, then platform env. */
export async function loadOrgTwilioCredentials(
  db: D1Database,
  orgId: string,
  platformEnv: { TWILIO_ACCOUNT_SID?: string; TWILIO_AUTH_TOKEN?: string; TWILIO_PHONE_NUMBER?: string },
  encryptionKey: string,
): Promise<TwilioCredentials | null> {
  const org = await db.prepare('SELECT settings FROM organizations WHERE id = ?').bind(orgId).first() as any;
  let settings: any = {};
  try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
  const integ = parseOrgIntegrations(settings).twilio || {};
  if (integ.enabled !== false && (integ.accountSid === '__vault__' || integ.accountSid)) {
    const sid = integ.accountSid === '__vault__'
      ? await loadIntegrationSecret({ db, orgId, provider: 'twilio', secretKey: 'account_sid', encryptionKey }).catch(() => null)
      : integ.accountSid;
    const token = await loadIntegrationSecret({ db, orgId, provider: 'twilio', secretKey: 'auth_token', encryptionKey }).catch(() => null);
    const from = integ.phoneNumber;
    if (sid && token && from) {
      return { accountSid: sid, authToken: token, phoneNumber: from, source: 'org' };
    }
  }
  if (platformEnv.TWILIO_ACCOUNT_SID && platformEnv.TWILIO_AUTH_TOKEN && platformEnv.TWILIO_PHONE_NUMBER) {
    return {
      accountSid: platformEnv.TWILIO_ACCOUNT_SID,
      authToken: platformEnv.TWILIO_AUTH_TOKEN,
      phoneNumber: platformEnv.TWILIO_PHONE_NUMBER,
      source: 'platform',
    };
  }
  return null;
}

export async function saveOrgIntegrations(
  db: D1Database,
  orgId: string,
  patch: Partial<OrgIntegrations>,
): Promise<OrgIntegrations> {
  const org = await db.prepare('SELECT settings FROM organizations WHERE id = ?').bind(orgId).first() as any;
  let settings: any = {};
  try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
  const current = parseOrgIntegrations(settings);
  const merged: OrgIntegrations = {
    ghl: { ...current.ghl, ...patch.ghl },
    mfsn: { ...current.mfsn, ...patch.mfsn },
    twilio: { ...current.twilio, ...patch.twilio },
  };
  if (patch.ghl?.pitToken === '') delete merged.ghl?.pitToken;
  if (patch.mfsn?.password === '') delete merged.mfsn?.password;
  if (patch.twilio?.authToken === '') delete merged.twilio?.authToken;
  settings.integrations = merged;
  await db.prepare(
    'UPDATE organizations SET settings = ?, updated_at = datetime(\'now\') WHERE id = ?',
  ).bind(JSON.stringify(settings), orgId).run();
  return merged;
}
