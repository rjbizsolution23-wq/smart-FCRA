/**
 * GoHighLevel (LeadConnector) v2 — Private Integration Token client.
 * Full Smart FCRA + MyFreeScoreNow custom fields, tags, and upsert sync.
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

/**
 * Canonical custom fields. Keys are our internal names; ensureCustomFields matches
 * existing GHL fields by display name (GHL auto-keys like contact.equifax_score).
 */
export const GHL_FIELD_DEFS: Array<{ key: string; name: string; dataType: string }> = [
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
  { key: 'smart_fcra_affiliate_offer', name: 'MFSN Affiliate Offer Code', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_member_id', name: 'MFSN Member ID', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_plan', name: 'MFSN Plan Name', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_status', name: 'MFSN Account Status', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_amount', name: 'MFSN Plan Amount', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_sub_date', name: 'MFSN Subscription Date', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_next_due', name: 'MFSN Next Due Date', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_customer_token', name: 'MFSN Customer Token', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_member_type', name: 'MFSN Member Type', dataType: 'TEXT' },
  { key: 'smart_fcra_mfsn_publisher_id', name: 'MFSN Publisher / Offer ID', dataType: 'TEXT' },
  { key: 'smart_fcra_org_name', name: 'Smart FCRA Org Name', dataType: 'TEXT' },
  { key: 'smart_fcra_ghl_synced_at', name: 'Smart FCRA Last GHL Sync', dataType: 'TEXT' },
];

/** Extra GHL field keys (auto-named) we also write when present in the location. */
const LEGACY_FIELD_ALIASES: Record<string, string> = {
  smart_fcra_eq_score: 'equifax_score',
  smart_fcra_ex_score: 'experian_score',
  smart_fcra_tu_score: 'transunion_score',
  smart_fcra_lvs_score: 'litigation_viability_score',
  smart_fcra_violation_count: 'fcra_violation_count',
  smart_fcra_mfsn_email: 'mfsn_member_email',
  smart_fcra_analysis_unlocked: 'portal_analysis_unlocked',
  smart_fcra_client_id: 'smartfcra_client_id',
  smart_fcra_affiliate_offer: 'mfsn_affiliate_offer_code',
};

// Back-compat alias used by older imports/tests
const FIELD_DEFS = GHL_FIELD_DEFS;

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

/** Clear cached GHL field IDs (tests / after field catalog changes). */
export function clearGhlFieldCache(): void {
  fieldCache = null;
}

export async function ensureCustomFields(env: GhlEnv): Promise<Record<string, string>> {
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
    const created = await ghlFetch(env, `/locations/${locationId}/customFields`, {
      method: 'POST',
      body: JSON.stringify({
        name: def.name,
        dataType: def.dataType,
        model: 'contact',
      }),
    });
    const createdField = created.data?.customField || created.data;
    const id = createdField?.id;
    if (id) {
      map[def.key] = id;
      const createdKey = String(createdField?.fieldKey || createdField?.key || '').replace(/^contact\./, '');
      if (createdKey) map[createdKey] = id;
    }
  }

  // Point catalog keys at legacy auto-keys when GHL named them differently
  for (const [catalogKey, legacyKey] of Object.entries(LEGACY_FIELD_ALIASES)) {
    if (!map[catalogKey] && map[legacyKey]) map[catalogKey] = map[legacyKey];
    if (map[catalogKey] && !map[legacyKey]) map[legacyKey] = map[catalogKey];
  }

  fieldCache = { at: Date.now(), map };
  return map;
}

function buildCustomFieldPayload(
  fieldIds: Record<string, string>,
  custom: Record<string, string | number | null | undefined>,
): Array<{ id: string; field_value: string }> {
  const out: Array<{ id: string; field_value: string }> = [];
  const seen = new Set<string>();
  for (const [key, val] of Object.entries(custom || {})) {
    if (val === undefined || val === null || val === '') continue;
    const id = fieldIds[key];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, field_value: String(val) });
  }
  return out;
}

/** Unique, trimmed tags — preserves order. */
export function normalizeGhlTags(tags: Array<string | null | undefined> = []): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const s = String(t || '').trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

/**
 * Lifecycle tags from Smart FCRA client + MFSN membership state.
 */
export function buildGhlTagsForClient(
  client: any,
  extras: {
    analysisUnlocked?: boolean;
    mfsnStatus?: string | null;
    includeDefaults?: boolean;
  } = {},
): string[] {
  const unlocked =
    extras.analysisUnlocked !== undefined
      ? extras.analysisUnlocked
      : client?.portal_analysis_unlocked !== 0 && client?.portal_analysis_unlocked !== '0';
  const offer = String(client?.mfsn_affiliate_offer_code || client?.publisher_id || '').trim().toUpperCase();
  const pay = String(client?.payment_status || '').toLowerCase();
  const mfsnStatus = String(extras.mfsnStatus || client?.mfsn_account_status || '').toUpperCase();
  const tags = [
    'Smart FCRA',
    'Credit Client',
    client?.signup_source === 'mfsn_public_signup' || client?.mfsn_member_email ? 'MFSN Signup' : 'CRM',
    client?.mfsn_member_email || client?.mfsn_member_id ? 'MFSN Member' : null,
    unlocked ? 'Analysis Unlocked' : 'Portal Pending Unlock',
    unlocked || pay === 'paid' || pay === 'active' ? 'Paid Client' : 'Payment Pending',
    mfsnStatus === 'ACTIVE' ? 'MFSN Active' : null,
    mfsnStatus && mfsnStatus !== 'ACTIVE' ? `MFSN ${mfsnStatus}` : null,
    offer ? `Offer ${offer}` : null,
    offer.endsWith('A8289') ? 'Affiliate A8289' : null,
    client?.case_status ? `Case ${String(client.case_status)}` : null,
  ];
  return normalizeGhlTags(tags);
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
      tags: normalizeGhlTags(payload.tags?.length ? payload.tags : ['Smart FCRA', 'Credit Client']),
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
    orgName?: string;
    mfsnMember?: Record<string, any> | null;
  } = {},
): Record<string, string | number | null | undefined> {
  const m = extras.mfsnMember || {};
  const offer =
    client.mfsn_affiliate_offer_code ||
    m.publisher_id ||
    null;
  const nextDue =
    m?.memberSubscription?.next_due_date ||
    client.mfsn_next_due ||
    null;

  const unlocked =
    extras.analysisUnlocked === undefined
      ? (client.portal_analysis_unlocked === 0 || client.portal_analysis_unlocked === '0' ? 'no' : 'yes')
      : (extras.analysisUnlocked ? 'yes' : 'no');
  const offerCode = offer ? String(offer).toUpperCase() : null;
  const base: Record<string, string | number | null | undefined> = {
    smart_fcra_client_id: client.id || null,
    smart_fcra_portal_url: extras.portalUrl || null,
    smart_fcra_case_status: client.case_status || null,
    smart_fcra_payment_status: client.payment_status || null,
    smart_fcra_eq_score: client.eq_score ?? null,
    smart_fcra_ex_score: client.ex_score ?? null,
    smart_fcra_tu_score: client.tu_score ?? null,
    smart_fcra_lvs_score: client.lvs_score ?? null,
    smart_fcra_violation_count: extras.violationCount ?? null,
    smart_fcra_signup_source: client.signup_source || null,
    smart_fcra_mfsn_email: client.mfsn_member_email || m.email || client.email || null,
    smart_fcra_analysis_unlocked: unlocked,
    smart_fcra_affiliate_offer: offerCode,
    smart_fcra_mfsn_member_id: m.member_id || client.mfsn_member_id || null,
    smart_fcra_mfsn_plan: m.planName || client.mfsn_plan_name || null,
    smart_fcra_mfsn_status: m.account_status || client.mfsn_account_status || null,
    smart_fcra_mfsn_amount: m.amount || client.mfsn_amount || null,
    smart_fcra_mfsn_sub_date: m.subscription_date || client.mfsn_subscription_date || null,
    smart_fcra_mfsn_next_due: nextDue,
    smart_fcra_mfsn_customer_token: m.customer_token || client.mfsn_customer_token || null,
    smart_fcra_mfsn_member_type: m.memberType || client.mfsn_member_type || null,
    smart_fcra_mfsn_publisher_id: m.publisher_id || offerCode || null,
    smart_fcra_org_name: extras.orgName || null,
    smart_fcra_ghl_synced_at: new Date().toISOString(),
  };

  // Dual-write onto GHL auto-keys / older field names already in the location
  base.equifax_score = base.smart_fcra_eq_score;
  base.experian_score = base.smart_fcra_ex_score;
  base.transunion_score = base.smart_fcra_tu_score;
  base.litigation_viability_score = base.smart_fcra_lvs_score;
  base.lvs_score = base.smart_fcra_lvs_score;
  base.fcra_violation_count = base.smart_fcra_violation_count;
  base.mfsn_member_email = base.smart_fcra_mfsn_email;
  base.portal_analysis_unlocked = unlocked;
  base.smartfcra_client_id = base.smart_fcra_client_id;
  base.mfsn_affiliate_offer_code = offerCode;
  base.mfsn_member_id = base.smart_fcra_mfsn_member_id;
  base.mfsn_plan_name = base.smart_fcra_mfsn_plan;
  base.mfsn_account_status = base.smart_fcra_mfsn_status;
  base.mfsn_plan_amount = base.smart_fcra_mfsn_amount;
  base.mfsn_subscription_date = base.smart_fcra_mfsn_sub_date;
  base.mfsn_next_due_date = base.smart_fcra_mfsn_next_due;
  base.mfsn_customer_token = base.smart_fcra_mfsn_customer_token;
  base.mfsn_member_type = base.smart_fcra_mfsn_member_type;
  base.mfsn_publisher_offer_id = base.smart_fcra_mfsn_publisher_id;

  return base;
}

/** Map a raw MFSN admin member-list row into a GHL upsert payload. */
export function mfsnMemberToGhlPayload(
  member: any,
  extras: {
    portalUrl?: string;
    clientId?: string | null;
    caseStatus?: string | null;
    paymentStatus?: string | null;
    analysisUnlocked?: boolean;
    eqScore?: number | null;
    exScore?: number | null;
    tuScore?: number | null;
    lvsScore?: number | null;
    violationCount?: number | null;
    orgName?: string | null;
    tags?: string[];
  } = {},
): GhlContactPayload {
  const offer = String(member?.publisher_id || '').trim().toUpperCase();
  const clientLike = {
    id: extras.clientId || null,
    case_status: extras.caseStatus || 'ONBOARDING',
    payment_status: extras.paymentStatus || (String(member?.account_status).toUpperCase() === 'ACTIVE' ? 'mfsn_active' : 'pending'),
    eq_score: extras.eqScore ?? null,
    ex_score: extras.exScore ?? null,
    tu_score: extras.tuScore ?? null,
    lvs_score: extras.lvsScore ?? null,
    signup_source: 'mfsn_member_sync',
    mfsn_member_email: member?.email || null,
    portal_analysis_unlocked: extras.analysisUnlocked ? 1 : 0,
    mfsn_affiliate_offer_code: offer || null,
  };

  const tags = extras.tags || buildGhlTagsForClient(clientLike, {
    analysisUnlocked: !!extras.analysisUnlocked,
    mfsnStatus: member?.account_status,
  });

  return {
    email: member?.email,
    phone: member?.phone_number,
    firstName: member?.first_name,
    lastName: member?.last_name,
    address1: member?.street_address,
    city: member?.city,
    state: member?.state,
    postalCode: member?.zip,
    source: 'Smart FCRA MFSN Sync',
    tags: normalizeGhlTags([...tags, 'MFSN Bulk Sync']),
    custom: clientToGhlCustom(clientLike, {
      portalUrl: extras.portalUrl,
      violationCount: extras.violationCount ?? undefined,
      analysisUnlocked: extras.analysisUnlocked,
      orgName: extras.orgName || undefined,
      mfsnMember: member,
    }),
  };
}

export async function syncClientToGhl(
  env: GhlEnv,
  client: any,
  extras: {
    portalUrl?: string;
    violationCount?: number;
    analysisUnlocked?: boolean;
    tags?: string[];
    orgName?: string;
    mfsnMember?: Record<string, any> | null;
  } = {},
): Promise<{ ok: boolean; contactId?: string; error?: string; created?: boolean }> {
  const unlocked =
    extras.analysisUnlocked !== undefined
      ? extras.analysisUnlocked
      : client?.portal_analysis_unlocked !== 0 && client?.portal_analysis_unlocked !== '0';
  const tags =
    extras.tags ||
    buildGhlTagsForClient(
      { ...client, mfsn_account_status: extras.mfsnMember?.account_status },
      { analysisUnlocked: unlocked, mfsnStatus: extras.mfsnMember?.account_status },
    );

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
    tags,
    custom: clientToGhlCustom(client, {
      portalUrl: extras.portalUrl,
      violationCount: extras.violationCount,
      analysisUnlocked: unlocked,
      orgName: extras.orgName,
      mfsnMember: extras.mfsnMember,
    }),
  });
}

export async function syncMfsnMemberToGhl(
  env: GhlEnv,
  member: any,
  extras: Parameters<typeof mfsnMemberToGhlPayload>[1] = {},
): Promise<{ ok: boolean; contactId?: string; error?: string; created?: boolean; email?: string }> {
  const payload = mfsnMemberToGhlPayload(member, extras);
  const result = await upsertGhlContact(env, payload);
  return { ...result, email: member?.email };
}

export async function verifyGhlConnection(env: GhlEnv): Promise<{
  ok: boolean;
  locationId?: string;
  fieldCount?: number;
  error?: string;
}> {
  if (!ghlConfigured(env)) return { ok: false, error: 'ghl_not_configured' };
  const locationId = env.GHL_LOCATION_ID!;
  const res = await ghlFetch(env, `/locations/${locationId}`);
  const fields = await ensureCustomFields(env).catch(() => ({} as Record<string, string>));
  const fieldCount = Object.keys(fields).filter((k) => !k.startsWith('name:')).length;
  if (res.ok) return { ok: true, locationId, fieldCount };
  const probe = await ghlFetch(env, `/locations/${locationId}/customFields`);
  if (probe.ok) return { ok: true, locationId, fieldCount };
  return { ok: false, locationId, fieldCount, error: res.data?.message || probe.data?.message || `ghl_${res.status}` };
}

export function listGhlFieldCatalog(): Array<{ key: string; name: string; dataType: string }> {
  return GHL_FIELD_DEFS.slice();
}
