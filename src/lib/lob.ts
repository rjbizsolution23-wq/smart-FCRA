/**
 * Lob Print & Mail — primary mailing vendor for Smart FCRA.
 * Auth: HTTP Basic with secret API key as username, blank password.
 * @see https://docs.lob.com/
 */
export type LobEnv = {
  LOB_SECRET_KEY?: string;
  LOB_PUBLISHABLE_KEY?: string;
  LOB_API_KEY?: string;
  LOB_TEST_SECRET_KEY?: string;
  LOB_TEST_PUBLISHABLE_KEY?: string;
  LOB_LIVE_SECRET_KEY?: string;
  LOB_LIVE_PUBLISHABLE_KEY?: string;
  LOB_MODE?: string;
  LOB_WEBHOOK_SECRET?: string;
  COMPANY_NAME?: string;
  COMPANY_ADDRESS?: string;
  COMPANY_OWNER?: string;
};

export type LobMailClass = 'STANDARD' | 'FIRST_CLASS' | 'CERTIFIED';

export type LobRecipient = {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  company?: string;
};

export type LobAddress = {
  id?: string;
  name?: string;
  company?: string;
  address_line1?: string;
  address_line2?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
};

export const LOB_LETTER_PAGE_CSS = '@page { size: Letter; margin: 0.75in; }';

const LOB_API = 'https://api.lob.com/v1';

/** Lob keys are lowercase prefixes (test_ / live_ / test_pub_ / live_pub_). */
export function normalizeLobKey(raw?: string | null): string {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^test_pub_/i.test(s)) return `test_pub_${s.slice(9)}`;
  if (/^live_pub_/i.test(s)) return `live_pub_${s.slice(9)}`;
  if (/^test_/i.test(s)) return `test_${s.slice(5)}`;
  if (/^live_/i.test(s)) return `live_${s.slice(5)}`;
  return s;
}

export function lobSecretKey(env: LobEnv): string {
  const mode = String(env.LOB_MODE || '').toLowerCase();
  if (mode === 'live') {
    return normalizeLobKey(env.LOB_LIVE_SECRET_KEY || env.LOB_SECRET_KEY || env.LOB_API_KEY);
  }
  if (mode === 'test') {
    return normalizeLobKey(env.LOB_TEST_SECRET_KEY || env.LOB_SECRET_KEY || env.LOB_API_KEY);
  }
  // Prefer explicit secret; fall back to live/test named keys
  return normalizeLobKey(
    env.LOB_SECRET_KEY || env.LOB_API_KEY || env.LOB_LIVE_SECRET_KEY || env.LOB_TEST_SECRET_KEY,
  );
}

export function lobPublishableKey(env: LobEnv): string {
  const mode = lobModeFromSecret(lobSecretKey(env), env);
  if (mode === 'live') {
    return normalizeLobKey(env.LOB_LIVE_PUBLISHABLE_KEY || env.LOB_PUBLISHABLE_KEY);
  }
  return normalizeLobKey(env.LOB_TEST_PUBLISHABLE_KEY || env.LOB_PUBLISHABLE_KEY);
}

function lobModeFromSecret(key: string, env: LobEnv): 'test' | 'live' {
  if (key.startsWith('live_')) return 'live';
  if (key.startsWith('test_')) return 'test';
  return String(env.LOB_MODE || '').toLowerCase() === 'live' ? 'live' : 'test';
}

export function lobConfigured(env: LobEnv): boolean {
  return !!lobSecretKey(env);
}

export function lobMode(env: LobEnv): 'test' | 'live' {
  return lobModeFromSecret(lobSecretKey(env), env);
}

function basicAuthHeader(apiKey: string): string {
  const bytes = new TextEncoder().encode(`${apiKey}:`);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `Basic ${btoa(binary)}`;
}

async function lobFetch(env: LobEnv, path: string, init: RequestInit = {}, usePublishable = false) {
  const key = usePublishable ? lobPublishableKey(env) : lobSecretKey(env);
  if (!key) {
    throw Object.assign(new Error('Lob is not configured. Set LOB_SECRET_KEY on the Pages project.'), { status: 503 });
  }
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', basicAuthHeader(key));
  if (init.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  const res = await fetch(`${LOB_API}${path}`, { ...init, headers });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok) {
    const msg = data?.error?.message || data?.message || text || `Lob HTTP ${res.status}`;
    throw Object.assign(new Error(msg), { status: res.status >= 500 ? 502 : res.status, lob: data });
  }
  return data;
}

export function normalizeLobMailClass(input?: string | null): LobMailClass {
  const v = String(input || 'FIRST_CLASS').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (v === 'CERTIFIED' || v === 'CERTIFIED_MAIL' || v === 'CERTIFIED_RETURN_RECEIPT') return 'CERTIFIED';
  if (v === 'STANDARD' || v === 'STANDARD_MAIL' || v === 'USPS_STANDARD') return 'STANDARD';
  return 'FIRST_CLASS';
}

export function resolveMailClass(opts: {
  bodyMailClass?: string | null;
  orgDefault?: string | null;
}): LobMailClass {
  if (opts.bodyMailClass) return normalizeLobMailClass(opts.bodyMailClass);
  if (opts.orgDefault) return normalizeLobMailClass(opts.orgDefault);
  return 'FIRST_CLASS';
}

function mailTypeForClass(mailClass: LobMailClass): 'usps_first_class' | 'usps_standard' {
  return mailClass === 'STANDARD' ? 'usps_standard' : 'usps_first_class';
}

function extraServiceForClass(mailClass: LobMailClass): 'certified' | 'certified_return_receipt' | null {
  if (mailClass === 'CERTIFIED') return 'certified_return_receipt';
  return null;
}

function toLobAddress(addr: LobRecipient) {
  return {
    name: addr.name || undefined,
    company: addr.company || undefined,
    address_line1: addr.address1,
    address_line2: addr.address2 || undefined,
    address_city: addr.city,
    address_state: addr.state,
    address_zip: addr.zip,
    address_country: 'US',
  };
}

function parseCompanyAddress(env: LobEnv): LobRecipient {
  const raw = String(env.COMPANY_ADDRESS || '1342 NM 333, Tijeras, NM 87059');
  const parts = raw.split(',').map((s) => s.trim());
  let line1 = parts[0] || '1342 NM 333';
  let city = 'Tijeras';
  let state = 'NM';
  let zip = '87059';
  if (parts.length >= 3) {
    city = parts[1];
    const stZip = parts[2].split(/\s+/).filter(Boolean);
    state = stZip[0] || state;
    zip = stZip[1] || zip;
  }
  return {
    name: env.COMPANY_OWNER || env.COMPANY_NAME || 'RJ Business Solutions',
    company: env.COMPANY_NAME || 'RJ Business Solutions',
    address1: line1,
    city,
    state,
    zip,
  };
}

export function letterHtmlFromPlainText(title: string, content: string): string {
  const escape = (s: string) => String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const body = escape(content).replace(/\n/g, '<br/>');
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
    ${LOB_LETTER_PAGE_CSS}
    html, body { width: 8.5in; min-height: 11in; margin: 0; padding: 0; }
    body { box-sizing: border-box; font-family: Georgia, 'Times New Roman', serif; font-size: 11pt; line-height: 1.4; color: #111; }
    h1 { font-size: 14pt; line-height: 1.25; margin: 0 0 16pt; page-break-after: avoid; }
    .letter-body { overflow-wrap: anywhere; white-space: normal; widows: 3; orphans: 3; }
  </style></head><body>
    <h1>${escape(title || 'Dispute Letter')}</h1>
    <div class="letter-body">${body}</div>
  </body></html>`;
}

export async function verifyUsAddress(env: LobEnv, addr: {
  primary_line: string;
  secondary_line?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}) {
  return lobFetch(env, '/us_verifications', {
    method: 'POST',
    body: JSON.stringify(addr),
  }, true);
}

export async function createLobAddress(env: LobEnv, addr: LobRecipient): Promise<LobAddress> {
  return lobFetch(env, '/addresses', {
    method: 'POST',
    body: JSON.stringify(toLobAddress(addr)),
  });
}

export async function getLobLetter(env: LobEnv, letterId: string) {
  return lobFetch(env, `/letters/${encodeURIComponent(letterId)}`);
}

export async function sendLetterViaLob(env: LobEnv, opts: {
  title: string;
  content: string;
  recipient: LobRecipient;
  from?: LobRecipient;
  mailClass?: LobMailClass | string;
  html?: string;
  metadata?: Record<string, string>;
}): Promise<{
  mailingId: string;
  documentId: string;
  mailClass: string;
  provider: 'lob';
  mode: 'test' | 'live';
  expectedDeliveryDate?: string;
  trackingNumber?: string | null;
  url?: string;
}> {
  if (!lobConfigured(env)) {
    throw Object.assign(new Error('Lob is not configured. Set LOB_SECRET_KEY on the Pages project.'), { status: 503 });
  }

  const mailClass = normalizeLobMailClass(opts.mailClass);
  const from = opts.from || parseCompanyAddress(env);
  const file = opts.html || letterHtmlFromPlainText(opts.title, opts.content);
  const extra = extraServiceForClass(mailClass);

  const payload: Record<string, unknown> = {
    description: String(opts.title || 'Smart FCRA letter').slice(0, 255),
    to: toLobAddress(opts.recipient),
    from: toLobAddress(from),
    file,
    color: false,
    double_sided: true,
    mail_type: mailTypeForClass(mailClass),
    use_type: 'operational',
    metadata: {
      source: 'smart_fcra',
      ...(opts.metadata || {}),
    },
  };
  if (extra) payload.extra_service = extra;

  const letter = await lobFetch(env, '/letters', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return {
    mailingId: String(letter.id || ''),
    documentId: String(letter.id || ''),
    mailClass,
    provider: 'lob',
    mode: lobMode(env),
    expectedDeliveryDate: letter.expected_delivery_date || undefined,
    trackingNumber: letter.tracking_number || null,
    url: letter.url || undefined,
  };
}

/** Unified send used by document + portal dispute flows. Prefers Lob. */
export async function sendLetter(env: LobEnv, opts: Parameters<typeof sendLetterViaLob>[1]) {
  return sendLetterViaLob(env, opts);
}

export function lobPublicStatus(env: LobEnv) {
  const configured = lobConfigured(env);
  const mode = configured ? lobMode(env) : null;
  return {
    configured,
    provider: 'lob' as const,
    mode,
    status: configured ? 'connected' : 'not_configured',
    label: configured ? `CONNECTED (${mode})` : 'NOT CONFIGURED',
    publishableConfigured: !!lobPublishableKey(env),
  };
}
