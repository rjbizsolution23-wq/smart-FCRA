/**
 * Per-organization integration credentials — GHL, MFSN, Twilio overrides.
 * Falls back to platform env when org settings not configured.
 */
import type { GhlEnv } from './ghl-client';
import type { MfsnEnv } from '../engine/mfsn-client';
import { ghlConfigured as platformGhlConfigured } from './ghl-client';
import { resolvePartnerMfsnCredentials } from '../engine/mfsn-client';

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
  return {
    ...platformEnv,
    GHL_PIT_TOKEN: integ.pitToken || platformEnv.GHL_PIT_TOKEN,
    GHL_API_KEY: integ.pitToken || platformEnv.GHL_API_KEY,
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
  };
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
  settings.integrations = merged;
  await db.prepare(
    'UPDATE organizations SET settings = ?, updated_at = datetime(\'now\') WHERE id = ?',
  ).bind(JSON.stringify(settings), orgId).run();
  return merged;
}
