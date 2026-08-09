/**
 * GoHighLevel (LeadConnector) v2 — Private Integration Token client.
 * Upserts contacts + syncs Smart FCRA custom fields (scores, portal, case status).
 */

export type GhlEnv = {
  GHL_PIT_TOKEN?: string;
  GHL_API_KEY?: string;
  GHL_LOCATION_ID?: string;
  GHL_API_BASE?: string;
};

export type GhlContactPayload = {
  email?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  tags?: string[];
  source?: string;
  custom?: Record<string, string | number | null | undefined>;
};

const FIELD_DEFS: Array<{ key: string; name: string; dataType: string }> = [
  { key: 'smart_fcra_client_id', name: 'Smart FCRA Client ID', dataType: 'TEXT' },
  { key: 'smart_fcra_portal_url', name: 'Smart FCRA Portal URL', dataType: 'TEXT' },
  { key: 'smart_fcra_case_status', name: 'Smart FCRA Case Status', dataType: 'TEXT' },
  { key: 'smart_fcra_payment_status', name: 'Smart FCRA Payment Status', dataType: 'TEXT' },
  { key: 'smart_fcra_eq_score', name: 'Equifax Score', dataType: 'NUMERICAL' },
  { key: 'smart_fcra_ex_score', name: 'Experian Score', dataType: 'NUMERICAL' },
  { key: 'smart_fcra_tu_score', name: 'TransUnion Score', dataType: 'NUMERICAL' },
  { key: 'smart_fcra_lvs_score', name: 'Litigation Viability Score', dataType: 'NUMERICAL' },
  { key: 'smart_fcra_violation_count', name: 'FCRA Violation Count', dataType: 'NUMERICAL' },
  { key: 'smart_fcra_signup_source', name: 'Smart FCRA Signup Source', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_email', name: 'MFSN Member Email', dataType: 'TEXT' },
  { key: 'smart_fcra_analysis_unlocked', name: 'Portal Analysis Unlocked', dataType: 'TEXT' },
];

function ghlBase(env: GhlEnv): string {
  return String(env.GHL_API_BASE || 'https://services.leadconnectorhq.com').replace(/\/$/, '');
}

export function ghlConfigured(env: GhlEnv): boolean {
  const token = env.GHL_PIT_TOKEN || env.GHL_API_KEY;
  return !!(token && env.GHL_LOCATION_ID);
}

function authHeaders(env: GhlEnv): Record<string, string> {
  const token = env.GHL_PIT_TOKEN || env.GHL_API_KEY || '';
  return {
    Authorization: `Bearer ${token}`,
    Version: '2021-07-28',
    Accept: 'application/json',
    'Content-Type': 'application/json',
    // GHL edge blocks bare script UAs (CF 1010) — identify as Smart FCRA
    'User-Agent': 'Mozilla/5.0 (compatible; SmartFCRA/2.0; +https://smart-fcra-v2.pages.dev)',
  };
}

async function ghlFetch(env: GhlEnv, path: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: any }> {
  const res = await fetch(`${ghlBase(env)}${path}`, {
    ...init,
    headers: { ...authHeaders(env), ...(init.headers as any) },
  });
  let data: any = null;
  try { data = await res.json(); } catch { data = null; }
  return { ok: res.ok, status: res.status, data };
}

/** Normalize US phone to E.164-ish for GHL/Twilio. */
export function toE164Phone(phone?: string | null): string | null {
  if (!phone) return null;
  const digits = String(phone).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(phone).startsWith('+')) return `+${digits}`;
  return `+${digits}`;
}

let fieldCache: { at: number; map: Record<string, string> } | null = null;

async function ensureCustomFields(env: GhlEnv): Promise<Record<string, string>> {
  if (fieldCache && Date.now() - fieldCache.at < 10 * 60 * 1000) return fieldCache.map;
  const locationId = env.GHL_LOCATION_ID!;
  const listed = await ghlFetch(env, `/locations/${locationId}/customFields`);
  const map: Record<string, string> = {};
  const rows = listed.data?.customFields || listed.data?.fields || listed.data || [];
  if (Array.isArray(rows)) {
    for (const f of rows) {
      const key = String(f.fieldKey || f.key || '').replace(/^contact\./, '');
      const name = String(f.name || '').toLowerCase();
      if (f.id && key) map[key] = f.id;
      // also index by name for fuzzy match
      if (f.id && name) map[`name:${name}`] = f.id;
    }
  }

  for (const def of FIELD_DEFS) {
    if (map[def.key]) continue;
    const byName = map[`name:${def.name.toLowerCase()}`];
    if (byName) {
      map[def.key] = byName;
      continue;
    }
    // Create missing field
    const created = await ghlFetch(env, `/locations/${locationId}/customFields`, {
      method: 'POST',
      body: JSON.stringify({
        name: def.name,
        dataType: def.dataType,
        fieldKey: `contact.${def.key}`,
        model: 'contact',
      }),
    });
    const id = created.data?.customField?.id || created.data?.id;
    if (id) map[def.key] = id;
  }

  fieldCache = { at: Date.now(), map };
  return map;
}

function buildCustomFieldPayload(
  fieldIds: Record<string, string>,
  custom: Record<string, string | number | null | undefined>,
): Array<{ id: string; field_value: string }> {
  const out: Array<{ id: string; field_value: string }> = [];
  for (const [key, val] of Object.entries(custom || {})) {
    if (val === undefined || val === null || val === '') continue;
    const id = fieldIds[key];
    if (!id) continue;
    out.push({ id, field_value: String(val) });
  }
  return out;
}

/**
 * Upsert a contact in GHL and attach Smart FCRA custom fields.
 */
export async function upsertGhlContact(
  env: GhlEnv,
  payload: GhlContactPayload,
): Promise<{ ok: boolean; contactId?: string; created?: boolean; error?: string; raw?: any }> {
  if (!ghlConfigured(env)) {
    return { ok: false, error: 'ghl_not_configured' };
  }
  const locationId = env.GHL_LOCATION_ID!;
  const email = payload.email ? String(payload.email).trim().toLowerCase() : undefined;
  const phone = toE164Phone(payload.phone);
  if (!email && !phone) {
    return { ok: false, error: 'email_or_phone_required' };
  }

  try {
    const fieldIds = await ensureCustomFields(env);
    const customFields = buildCustomFieldPayload(fieldIds, payload.custom || {});

    const body: any = {
      locationId,
      firstName: payload.firstName || undefined,
      lastName: payload.lastName || undefined,
      name: [payload.firstName, payload.lastName].filter(Boolean).join(' ') || undefined,
      email: email || undefined,
      phone: phone || undefined,
      address1: payload.address1 || undefined,
      city: payload.city || undefined,
      state: payload.state || undefined,
      postalCode: payload.postalCode || undefined,
      source: payload.source || 'Smart FCRA',
      tags: payload.tags?.length ? payload.tags : ['Smart FCRA', 'Credit Client'],
    };
    if (customFields.length) body.customFields = customFields;

    const upsert = await ghlFetch(env, '/contacts/upsert', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    if (upsert.ok) {
      const contactId =
        upsert.data?.contact?.id ||
        upsert.data?.id ||
        upsert.data?.contactId;
      return {
        ok: true,
        contactId: contactId ? String(contactId) : undefined,
        created: !!upsert.data?.new || upsert.data?.contact?.new === true,
        raw: upsert.data,
      };
    }

    // Fallback: create
    const created = await ghlFetch(env, '/contacts/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (created.ok) {
      const contactId = created.data?.contact?.id || created.data?.id;
      return { ok: true, contactId: contactId ? String(contactId) : undefined, created: true, raw: created.data };
    }

    return {
      ok: false,
      error: created.data?.message || upsert.data?.message || `ghl_${upsert.status}`,
      raw: upsert.data || created.data,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'ghl_error' };
  }
}

/** Build custom field map from a Smart FCRA client row + extras. */
export function clientToGhlCustom(
  client: any,
  extras: {
    portalUrl?: string;
    violationCount?: number;
    analysisUnlocked?: boolean;
  } = {},
): Record<string, string | number | null | undefined> {
  return {
    smart_fcra_client_id: client.id,
    smart_fcra_portal_url: extras.portalUrl || null,
    smart_fcra_case_status: client.case_status || null,
    smart_fcra_payment_status: client.payment_status || null,
    smart_fcra_eq_score: client.eq_score ?? null,
    smart_fcra_ex_score: client.ex_score ?? null,
    smart_fcra_tu_score: client.tu_score ?? null,
    smart_fcra_lvs_score: client.lvs_score ?? null,
    smart_fcra_violation_count: extras.violationCount ?? null,
    smart_fcra_signup_source: client.signup_source || null,
    smart_fcra_mfsn_email: client.mfsn_member_email || null,
    smart_fcra_analysis_unlocked:
      extras.analysisUnlocked === undefined
        ? (client.portal_analysis_unlocked === 0 ? 'no' : 'yes')
        : (extras.analysisUnlocked ? 'yes' : 'no'),
  };
}

export async function syncClientToGhl(
  env: GhlEnv,
  client: any,
  extras: { portalUrl?: string; violationCount?: number; analysisUnlocked?: boolean; tags?: string[] } = {},
): Promise<{ ok: boolean; contactId?: string; error?: string }> {
  return upsertGhlContact(env, {
    email: client.email,
    phone: client.phone_e164 || client.phone,
    firstName: client.first_name,
    lastName: client.last_name,
    address1: client.address_line1,
    city: client.city,
    state: client.state,
    postalCode: client.zip,
    source: client.signup_source === 'mfsn_public_signup' ? 'Smart FCRA MFSN Signup' : 'Smart FCRA',
    tags: extras.tags || ['Smart FCRA', 'Credit Client', client.signup_source === 'mfsn_public_signup' ? 'MFSN Signup' : 'CRM'],
    custom: clientToGhlCustom(client, extras),
  });
}

export async function verifyGhlConnection(env: GhlEnv): Promise<{ ok: boolean; locationId?: string; error?: string }> {
  if (!ghlConfigured(env)) return { ok: false, error: 'ghl_not_configured' };
  const locationId = env.GHL_LOCATION_ID!;
  const res = await ghlFetch(env, `/locations/${locationId}`);
  if (res.ok) return { ok: true, locationId };
  // Some PITs can't read location detail — try custom fields as probe
  const fields = await ghlFetch(env, `/locations/${locationId}/customFields`);
  if (fields.ok) return { ok: true, locationId };
  return { ok: false, locationId, error: res.data?.message || fields.data?.message || `ghl_${res.status}` };
}
