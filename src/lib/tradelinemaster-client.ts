/**
 * TradelineMaster API client (v3) — RJ Business Solutions / Smart FCRA.
 * Wholesale prices are marked up 12.5% for retail display & quoting.
 */

export const TRADELINE_MARKUP_RATE = 0.125;
export const TRADELINE_API_BASE = 'https://www.tradelinemaster.com/api';
export const TRADELINE_OPS_EMAIL_DEFAULT = 'tradelines@smartfcra.com';
export const TRADELINE_FROM_EMAIL_DEFAULT = 'welcome@tradelines.smartfcra.com';
export const TRADELINE_BRAND = 'RJ Business Solutions';

export type TradelineMasterEnv = {
  TRADELINEMASTER_USER_KEY?: string;
  TRADELINEMASTER_PASS_KEY?: string;
  TRADELINEMASTER_API_URL?: string;
  TRADELINEMASTER_REFERER?: string;
  TRADELINEMASTER_API_VERSION?: string;
  TRADELINE_MARKUP_RATE?: string;
  TRADELINE_OPS_EMAIL?: string;
  TRADELINE_FROM_EMAIL?: string;
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
};

export type RawTradeline = {
  Id: number;
  Price: number;
  SpotsAvailable: number;
  Lender: string;
  Cycles: number;
  Limit: number;
  DateOpened: string;
  StatementDate: string;
  PostingDate: string;
  CardholderAddressId?: number;
  CardholderAddressID?: number;
};

export type EnrichedTradeline = {
  id: number;
  lender: string;
  spotsAvailable: number;
  creditLimit: number;
  cycles: number;
  dateOpened: string;
  statementDate: string;
  postingDate: string;
  cardholderAddressId: number | null;
  /** Wholesale cost from TradelineMaster */
  wholesalePrice: number;
  /** Client-facing price (wholesale × 1.125) */
  retailPrice: number;
  markupRate: number;
  markupAmount: number;
  statementDay: number;
  postingDay: number;
  postingWindowStart: string;
  postingWindowEnd: string;
  postingWindowLabel: string;
  accountAgeYears: number;
  accountAgeMonths: number;
  accountAgeLabel: string;
  statementLabel: string;
};

export type TradelineMasterUser = {
  Id: string;
  UserName: string;
  Balance: number;
};

export type OrderClientPayload = {
  FirstName: string;
  LastName: string;
  Email: string;
  Phone?: string;
  DOB: string;
  SSN: string;
  GenderId: number;
  MaritalStatusId: number;
  CitizenshipStatusId: number;
  PhysicalAddress: string;
  City: string;
  StateCode: string;
  ZipCode: string;
  MiddleName?: string;
  Suffix?: string;
  CreditReportAgencyURL?: string;
  CreditReportAgencyUsername?: string;
  CreditReportAgencyPassword?: string;
};

export type OrderResult = {
  Status: number;
  OrderId: number;
  Message?: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function markupRate(env?: TradelineMasterEnv): number {
  const raw = env?.TRADELINE_MARKUP_RATE;
  if (raw === undefined || raw === '') return TRADELINE_MARKUP_RATE;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : TRADELINE_MARKUP_RATE;
}

export function applyMarkup(wholesale: number, rate = TRADELINE_MARKUP_RATE): {
  wholesalePrice: number;
  retailPrice: number;
  markupAmount: number;
  markupRate: number;
} {
  const w = round2(Number(wholesale) || 0);
  const retail = round2(w * (1 + rate));
  return {
    wholesalePrice: w,
    retailPrice: retail,
    markupAmount: round2(retail - w),
    markupRate: rate,
  };
}

export function tradelineMasterConfigured(env: TradelineMasterEnv): boolean {
  return !!(env.TRADELINEMASTER_USER_KEY && env.TRADELINEMASTER_PASS_KEY);
}

function apiBase(env: TradelineMasterEnv): string {
  return String(env.TRADELINEMASTER_API_URL || TRADELINE_API_BASE).replace(/\/$/, '');
}

function authHeader(env: TradelineMasterEnv): string {
  const u = String(env.TRADELINEMASTER_USER_KEY || '').trim();
  const p = String(env.TRADELINEMASTER_PASS_KEY || '').trim();
  // btoa works in Workers; Buffer may not
  const token =
    typeof btoa === 'function'
      ? btoa(`${u}:${p}`)
      : Buffer.from(`${u}:${p}`).toString('base64');
  return `Basic ${token}`;
}

function referer(env: TradelineMasterEnv): string {
  return (
    env.TRADELINEMASTER_REFERER ||
    env.FRONTEND_URL ||
    env.APP_BASE_URL ||
    'https://smartfcra.com'
  );
}

async function tlmFetch(
  env: TradelineMasterEnv,
  path: string,
  init: RequestInit = {},
): Promise<{ ok: boolean; status: number; data: any; text: string }> {
  if (!tradelineMasterConfigured(env)) {
    return { ok: false, status: 0, data: null, text: 'tradeline_not_configured' };
  }
  const res = await fetch(`${apiBase(env)}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: authHeader(env),
      Referer: referer(env),
      APIVersion: String(env.TRADELINEMASTER_API_VERSION || '3'),
      ...(init.headers as any),
    },
  });
  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { ok: res.ok, status: res.status, data, text };
}

function parseDate(raw: string | null | undefined): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function addDays(d: Date, days: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function ordinal(n: number): string {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

export function formatShortDate(raw: string | Date | null | undefined): string {
  const d = raw instanceof Date ? raw : parseDate(String(raw || ''));
  if (!d) return '—';
  return `${MONTHS[d.getUTCMonth()]} ${ordinal(d.getUTCDate())}`;
}

export function accountAgeParts(dateOpened: string, now = new Date()): {
  years: number;
  months: number;
  label: string;
} {
  const opened = parseDate(dateOpened);
  if (!opened) return { years: 0, months: 0, label: '—' };
  let months =
    (now.getUTCFullYear() - opened.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - opened.getUTCMonth());
  if (now.getUTCDate() < opened.getUTCDate()) months -= 1;
  if (months < 0) months = 0;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  const label = `${years} yr${years === 1 ? '' : 's'} ${rem} mo`;
  return { years, months: rem, label };
}

export function enrichTradeline(raw: RawTradeline, rate = TRADELINE_MARKUP_RATE): EnrichedTradeline {
  const money = applyMarkup(Number(raw.Price), rate);
  const statement = parseDate(raw.StatementDate);
  const posting = parseDate(raw.PostingDate);
  const postingStart = statement ? addDays(statement, 7) : null;
  const postingEnd = posting || (statement ? addDays(statement, 15) : null);
  const age = accountAgeParts(raw.DateOpened);
  return {
    id: Number(raw.Id),
    lender: String(raw.Lender || '').toUpperCase(),
    spotsAvailable: Number(raw.SpotsAvailable) || 0,
    creditLimit: Number(raw.Limit) || 0,
    cycles: Number(raw.Cycles) || 0,
    dateOpened: raw.DateOpened,
    statementDate: raw.StatementDate,
    postingDate: raw.PostingDate,
    cardholderAddressId: raw.CardholderAddressId ?? raw.CardholderAddressID ?? null,
    ...money,
    statementDay: statement ? statement.getUTCDate() : 0,
    postingDay: posting ? posting.getUTCDate() : 0,
    postingWindowStart: postingStart?.toISOString() || '',
    postingWindowEnd: postingEnd?.toISOString() || '',
    postingWindowLabel:
      postingStart && postingEnd
        ? `${formatShortDate(postingStart)} - ${formatShortDate(postingEnd)}`
        : '—',
    accountAgeYears: age.years,
    accountAgeMonths: age.months,
    accountAgeLabel: age.label,
    statementLabel: formatShortDate(statement),
  };
}

export async function fetchTradelineMasterUser(env: TradelineMasterEnv): Promise<{
  ok: boolean;
  user?: TradelineMasterUser;
  error?: string;
}> {
  const res = await tlmFetch(env, '/User');
  if (!res.ok) return { ok: false, error: res.text?.slice(0, 200) || `tlm_${res.status}` };
  return { ok: true, user: res.data as TradelineMasterUser };
}

export async function fetchTradelines(env: TradelineMasterEnv): Promise<{
  ok: boolean;
  tradelines: EnrichedTradeline[];
  error?: string;
  fetchedAt: string;
}> {
  const rate = markupRate(env);
  const res = await tlmFetch(env, '/Tradeline');
  const fetchedAt = new Date().toISOString();
  if (!res.ok) {
    return { ok: false, tradelines: [], error: res.text?.slice(0, 200) || `tlm_${res.status}`, fetchedAt };
  }
  const rows = Array.isArray(res.data) ? res.data : [];
  return {
    ok: true,
    tradelines: rows.map((r: RawTradeline) => enrichTradeline(r, rate)),
    fetchedAt,
  };
}

export async function fetchTradelineById(
  env: TradelineMasterEnv,
  id: number,
): Promise<{ ok: boolean; tradeline?: EnrichedTradeline; error?: string }> {
  const rate = markupRate(env);
  const res = await tlmFetch(env, `/Tradeline/${id}`);
  if (!res.ok) return { ok: false, error: res.text?.slice(0, 200) || `tlm_${res.status}` };
  if (!res.data?.Id) return { ok: false, error: 'not_found' };
  return { ok: true, tradeline: enrichTradeline(res.data as RawTradeline, rate) };
}

export async function submitTradelineOrder(
  env: TradelineMasterEnv,
  tradelineId: number,
  client: OrderClientPayload,
): Promise<{ ok: boolean; result?: OrderResult; error?: string; statusCode?: number }> {
  const body = {
    TradelineID: tradelineId,
    Client: {
      FirstName: client.FirstName,
      LastName: client.LastName,
      Email: client.Email,
      Phone: client.Phone || undefined,
      DOB: client.DOB,
      SSN: String(client.SSN || '').replace(/\D/g, ''),
      GenderId: Number(client.GenderId),
      MaritalStatusId: Number(client.MaritalStatusId),
      CitizenshipStatusId: Number(client.CitizenshipStatusId),
      PhysicalAddress: client.PhysicalAddress,
      City: client.City,
      StateCode: String(client.StateCode || '').toUpperCase().slice(0, 2),
      ZipCode: client.ZipCode,
      CreditReportAgencyURL: client.CreditReportAgencyURL || undefined,
      CreditReportAgencyUsername: client.CreditReportAgencyUsername || undefined,
      CreditReportAgencyPassword: client.CreditReportAgencyPassword || undefined,
    },
  };
  const res = await tlmFetch(env, '/Tradeline/OrderRequest', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok && !res.data?.Status) {
    return { ok: false, error: res.text?.slice(0, 300) || `tlm_${res.status}`, statusCode: res.status };
  }
  const result = res.data as OrderResult;
  return {
    ok: result?.Status === 1,
    result,
    error: result?.Status === 1 ? undefined : (result?.Message || `order_status_${result?.Status}`),
    statusCode: res.status,
  };
}

export async function uploadTradelineOrderFile(
  env: TradelineMasterEnv,
  opts: { orderId: number; fileBase64: string; fileName: string; type: 3 | 4 },
): Promise<{ ok: boolean; error?: string }> {
  // API expects byte[] — send as base64 string; many .NET APIs accept base64 for byte[]
  const res = await tlmFetch(env, '/OrderFile', {
    method: 'POST',
    body: JSON.stringify({
      OrderId: opts.orderId,
      File: opts.fileBase64,
      FileName: opts.fileName,
      Type: opts.type,
    }),
  });
  if (!res.ok) return { ok: false, error: res.text?.slice(0, 300) || `tlm_${res.status}` };
  return { ok: true };
}

export type TradelineFilters = {
  lender?: string;
  minLimit?: number;
  maxLimit?: number;
  statementDay?: number;
  postingDay?: number;
  minAgeYears?: number;
  maxPrice?: number;
  minPrice?: number;
  cycles?: number;
  minSpots?: number;
  q?: string;
};

export function filterTradelines(
  rows: EnrichedTradeline[],
  filters: TradelineFilters = {},
): EnrichedTradeline[] {
  const q = String(filters.q || '').trim().toLowerCase();
  return rows.filter((t) => {
    if (filters.lender && t.lender !== String(filters.lender).toUpperCase()) return false;
    if (filters.minLimit != null && t.creditLimit < filters.minLimit) return false;
    if (filters.maxLimit != null && t.creditLimit > filters.maxLimit) return false;
    if (filters.statementDay != null && t.statementDay !== filters.statementDay) return false;
    if (filters.postingDay != null && t.postingDay !== filters.postingDay) return false;
    if (filters.minAgeYears != null && t.accountAgeYears < filters.minAgeYears) return false;
    if (filters.maxPrice != null && t.retailPrice > filters.maxPrice) return false;
    if (filters.minPrice != null && t.retailPrice < filters.minPrice) return false;
    if (filters.cycles != null && t.cycles !== filters.cycles) return false;
    if (filters.minSpots != null && t.spotsAvailable < filters.minSpots) return false;
    if (q) {
      const hay = `${t.lender} ${t.id} ${t.creditLimit} ${t.retailPrice}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function summarizeInventory(rows: EnrichedTradeline[]) {
  const lenders = [...new Set(rows.map((r) => r.lender))].sort();
  const prices = rows.map((r) => r.retailPrice);
  const limits = rows.map((r) => r.creditLimit);
  return {
    count: rows.length,
    lenders,
    minPrice: prices.length ? Math.min(...prices) : 0,
    maxPrice: prices.length ? Math.max(...prices) : 0,
    minLimit: limits.length ? Math.min(...limits) : 0,
    maxLimit: limits.length ? Math.max(...limits) : 0,
    totalSpots: rows.reduce((s, r) => s + r.spotsAvailable, 0),
  };
}
