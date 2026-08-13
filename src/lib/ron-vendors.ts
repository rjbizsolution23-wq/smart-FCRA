/**
 * Live RON vendor adapters — Proof (formerly Notarize) and BlueNotary.
 * Sandbox path stays in ron-service.ts. These adapters only run when
 * RON_VENDOR is proof|bluenotary|custom and RON_VENDOR_API_KEY is set.
 *
 * Proof Business API: https://dev.proof.com  (ApiKey header, https://api.proof.com)
 * BlueNotary v2: https://bluenotary.readme.io  (Bearer, https://app.bluenotary.us/api/integrationsv2)
 */

export type RonVendorId = 'sandbox' | 'proof' | 'bluenotary' | 'custom' | string;

export type RonVendorSigner = {
  email: string;
  firstName: string;
  lastName: string;
};

export type RonVendorCreateInput = {
  vendor: RonVendorId;
  apiKey: string;
  apiUrl?: string;
  sessionId: string;
  principalState: string;
  contractId?: string;
  documentUrl?: string;
  callbackUrl: string;
  signer: RonVendorSigner;
  transactionName?: string;
};

export type RonVendorCreateResult = {
  vendorSessionId: string | null;
  ceremonyUrl: string | null;
  raw: Record<string, unknown>;
  error?: string;
};

export type RonVendorStatus = {
  completed: boolean;
  status?: string;
  ceremonyUrl?: string | null;
  notaryName?: string;
  notaryCommission?: string;
  notaryState?: string;
  recordingRef?: string;
  raw?: Record<string, unknown>;
};

export const PROOF_API_BASE = 'https://api.proof.com';
export const BLUENOTARY_API_BASE = 'https://app.bluenotary.us/api/integrationsv2';
export const PROOF_SAMPLE_DOCUMENT = 'https://static.notarize.com/Example.pdf';

export function defaultRonApiUrl(vendor: string, override?: string): string {
  if (override && override.trim()) return override.replace(/\/$/, '');
  const v = String(vendor || '').toLowerCase();
  if (v === 'proof' || v === 'notarize') return PROOF_API_BASE;
  if (v === 'bluenotary' || v === 'blue_notary') return BLUENOTARY_API_BASE;
  return '';
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : { value: data };
}

function pickString(...vals: unknown[]): string | null {
  for (const v of vals) {
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
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

function timingSafeEqual(a: string, b: string): boolean {
  const aa = a.toLowerCase();
  const bb = b.toLowerCase();
  if (aa.length !== bb.length) return false;
  let out = 0;
  for (let i = 0; i < aa.length; i++) out |= aa.charCodeAt(i) ^ bb.charCodeAt(i);
  return out === 0;
}

/** Shared-secret or HMAC-SHA256 (sha256=<hex>) against the raw webhook body. */
export async function verifyRonWebhookSignature(opts: {
  secret?: string;
  signature?: string | null;
  rawBody: string;
}): Promise<boolean> {
  if (!opts.secret) return true;
  const sig = String(opts.signature || '').trim();
  if (!sig) return false;
  if (sig === opts.secret) return true;
  const hex = await hmacSha256Hex(opts.secret, opts.rawBody);
  const normalized = sig.replace(/^sha256=/i, '').trim();
  return timingSafeEqual(hex, normalized);
}

export function extractRonWebhookIds(payload: any): { sessionHint: string | null; event: string } {
  const p = payload || {};
  const data = p.data || p.transaction || p.session || {};
  const sessionHint = pickString(
    p.externalId,
    p.notarization_id,
    p.sessionId,
    p.session_id,
    data.externalId,
    data.id,
    p.id,
    p.transaction_id,
  );
  const event = String(p.event || p.type || p.status || p.response || data.status || '').toLowerCase();
  return { sessionHint, event };
}

export function webhookMarksComplete(event: string, payload: any): boolean {
  const e = String(event || '').toLowerCase();
  if (/(complete|completed|notarized|closed|done)/.test(e)) return true;
  const status = String(payload?.status || payload?.data?.status || payload?.transaction?.status || '').toLowerCase();
  return /(complete|completed|notarized|closed)/.test(status);
}

export async function createRonVendorSession(
  input: RonVendorCreateInput,
  fetchImpl: typeof fetch = fetch,
): Promise<RonVendorCreateResult> {
  const vendor = String(input.vendor || '').toLowerCase();
  const base = defaultRonApiUrl(vendor, input.apiUrl);
  if (!base) {
    return { vendorSessionId: null, ceremonyUrl: null, raw: {}, error: `No API URL for vendor ${vendor}. Set RON_VENDOR_API_URL.` };
  }
  if (vendor === 'proof' || vendor === 'notarize') {
    return createProofTransaction(base, input, fetchImpl);
  }
  if (vendor === 'bluenotary' || vendor === 'blue_notary') {
    return createBlueNotarySession(base, input, fetchImpl);
  }
  return createGenericVendorSession(base, input, fetchImpl);
}

async function createProofTransaction(
  base: string,
  input: RonVendorCreateInput,
  fetchImpl: typeof fetch,
): Promise<RonVendorCreateResult> {
  const documentUrl = input.documentUrl || PROOF_SAMPLE_DOCUMENT;
  const res = await fetchImpl(`${base}/transactions`, {
    method: 'POST',
    headers: {
      ApiKey: input.apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transaction_name: input.transactionName || `Smart FCRA RON ${input.sessionId}`,
      transaction_type: 'Limited Power of Attorney / FCRA representation',
      external_id: input.sessionId,
      signers: [{
        email: input.signer.email,
        first_name: input.signer.firstName,
        last_name: input.signer.lastName,
      }],
      documents: [{
        resource: documentUrl,
        requirement: 'notarization',
      }],
      webhook_url: input.callbackUrl,
      message_to_signer: 'Complete identity proofing and remote online notarization for your Smart FCRA legal documents.',
    }),
  });
  const raw = asRecord(await res.json().catch(() => ({ error: `HTTP ${res.status}` })));
  if (!res.ok) {
    return { vendorSessionId: null, ceremonyUrl: null, raw, error: String(raw.message || raw.errors || `Proof HTTP ${res.status}`) };
  }
  const signers = Array.isArray(raw.signers) ? raw.signers as any[] : [];
  const ceremonyUrl = pickString(
    raw.transaction_access_link,
    signers[0]?.transaction_access_link,
    signers[0]?.signing_url,
  );
  return {
    vendorSessionId: pickString(raw.id, raw.transaction_id),
    ceremonyUrl,
    raw,
  };
}

async function createBlueNotarySession(
  base: string,
  input: RonVendorCreateInput,
  fetchImpl: typeof fetch,
): Promise<RonVendorCreateResult> {
  const res = await fetchImpl(`${base}/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      notarization_id: input.sessionId,
      signing_type: 'ron',
      notarization_timing_type: 'notarize_now',
      webhook_url: input.callbackUrl,
      all_signers: [{
        email: input.signer.email,
        first_name: input.signer.firstName,
        last_name: input.signer.lastName,
      }],
    }),
  });
  const raw = asRecord(await res.json().catch(() => ({ error: `HTTP ${res.status}` })));
  if (!res.ok || String(raw.response || '').toLowerCase() === 'fail') {
    return {
      vendorSessionId: null,
      ceremonyUrl: null,
      raw,
      error: String(raw.response_message || raw.message || `BlueNotary HTTP ${res.status}`),
    };
  }
  return {
    vendorSessionId: pickString(raw.bn_session_id, raw.session_id, raw.id),
    ceremonyUrl: pickString(raw.full_signing_url, raw.bn_signing_url),
    raw,
  };
}

async function createGenericVendorSession(
  base: string,
  input: RonVendorCreateInput,
  fetchImpl: typeof fetch,
): Promise<RonVendorCreateResult> {
  const res = await fetchImpl(`${base}/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      externalId: input.sessionId,
      principalState: input.principalState,
      contractId: input.contractId,
      callbackUrl: input.callbackUrl,
      signer: input.signer,
    }),
  });
  const raw = asRecord(await res.json().catch(() => ({ error: `HTTP ${res.status}` })));
  if (!res.ok) {
    return { vendorSessionId: null, ceremonyUrl: null, raw, error: String(raw.message || `Vendor HTTP ${res.status}`) };
  }
  return {
    vendorSessionId: pickString(raw.id, raw.sessionId, raw.vendorSessionId),
    ceremonyUrl: pickString(raw.ceremonyUrl, raw.signingUrl, raw.url),
    raw,
  };
}

export async function fetchRonVendorStatus(
  opts: {
    vendor: string;
    apiKey: string;
    apiUrl?: string;
    vendorSessionId?: string | null;
  },
  fetchImpl: typeof fetch = fetch,
): Promise<RonVendorStatus> {
  const vendor = String(opts.vendor || '').toLowerCase();
  const base = defaultRonApiUrl(vendor, opts.apiUrl);
  if (!base || !opts.vendorSessionId) return { completed: false };
  try {
    if (vendor === 'proof' || vendor === 'notarize') {
      const res = await fetchImpl(`${base}/transactions/${opts.vendorSessionId}`, {
        headers: { ApiKey: opts.apiKey },
      });
      const raw = asRecord(await res.json().catch(() => ({})));
      const status = String(raw.status || '').toLowerCase();
      const completed = /(complete|completed|closed)/.test(status);
      const signers = Array.isArray(raw.signers) ? raw.signers as any[] : [];
      return {
        completed,
        status,
        ceremonyUrl: pickString(raw.transaction_access_link, signers[0]?.transaction_access_link),
        notaryName: pickString(raw.notary?.name, raw.notary_name),
        notaryCommission: pickString(raw.notary?.commission, raw.notary_commission),
        notaryState: pickString(raw.notary?.state, raw.notary_state),
        recordingRef: pickString(raw.recording_url, raw.recordingUrl),
        raw,
      };
    }
    if (vendor === 'bluenotary' || vendor === 'blue_notary') {
      const res = await fetchImpl(`${base}/sessions/${opts.vendorSessionId}`, {
        headers: { Authorization: `Bearer ${opts.apiKey}` },
      });
      const raw = asRecord(await res.json().catch(() => ({})));
      const status = String(raw.status || raw.session_status || raw.response || '').toLowerCase();
      const completed = /(complete|completed|notarized|pass)/.test(status) && !/fail/.test(status);
      return {
        completed,
        status,
        ceremonyUrl: pickString(raw.full_signing_url, raw.bn_signing_url),
        raw,
      };
    }
    const res = await fetchImpl(`${base}/sessions/${opts.vendorSessionId}`, {
      headers: { Authorization: `Bearer ${opts.apiKey}` },
    });
    const raw = asRecord(await res.json().catch(() => ({})));
    const status = String(raw.status || '').toLowerCase();
    return {
      completed: /(complete|completed|notarized)/.test(status),
      status,
      ceremonyUrl: pickString(raw.ceremonyUrl, raw.signingUrl),
      raw,
    };
  } catch (e: any) {
    return { completed: false, status: 'error', raw: { error: e.message } };
  }
}

export function ceremonyUrlFromMeta(metadataJson?: string | null): string | null {
  try {
    const meta = JSON.parse(metadataJson || '{}');
    return pickString(meta.ceremonyUrl, meta.vendorCreate?.transaction_access_link, meta.vendorCreate?.full_signing_url);
  } catch {
    return null;
  }
}
