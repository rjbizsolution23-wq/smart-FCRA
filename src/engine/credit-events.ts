/**
 * Credit digital twin + append-only event ledger.
 * Do not overwrite previous account data. Do not treat every status change as a deletion.
 */

export const RESULT_TAXONOMY = [
  'DELETED',
  'CORRECTED',
  'UPDATED',
  'VERIFIED',
  'NO_CHANGE',
  'REINSERTED',
  'NEW_ACCOUNT',
  'NEW_DEROGATORY',
  'BALANCE_CHANGE',
  'STATUS_CHANGE',
  'INQUIRY_REMOVED',
  'RESPONSE_PENDING',
  'UNKNOWN',
] as const;

export type ResultTaxonomy = (typeof RESULT_TAXONOMY)[number];

export type TradelineSnapshot = {
  accountKey: string;
  bureau: string;
  furnisherName: string;
  accountNumberMasked?: string;
  accountType?: string;
  accountStatus?: string;
  balance?: number | null;
  creditLimit?: number | null;
  pastDue?: number | null;
  paymentStatus?: string;
  remarks?: string;
  dateOpened?: string;
  dateClosed?: string;
  dateReported?: string;
  paymentHistory?: string;
};

export type CreditEventDraft = {
  accountKey: string;
  bureau: string;
  eventType: string;
  field: string;
  previousValue: string | number | null;
  newValue: string | number | null;
  taxonomy: ResultTaxonomy;
};

const DEROGATORY_RE = /charge.?off|collection|late|delinquen|repossess|foreclos|settled|profit.?loss/i;

export function maskAccountNumber(raw: string | null | undefined): string {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****${digits.slice(-4)}`;
}

export function tradelineAccountKey(bureau: string, furnisher: string, accountNumber?: string): string {
  const name = String(furnisher || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 28);
  const last4 = String(accountNumber || '').replace(/\D/g, '').slice(-4);
  return `${String(bureau || 'UNK').toUpperCase()}:${name}:${last4 || 'none'}`;
}

export function classifyFieldChange(field: string, previousValue: unknown, newValue: unknown): ResultTaxonomy {
  const prev = previousValue == null || previousValue === '' ? null : previousValue;
  const next = newValue == null || newValue === '' ? null : newValue;
  if (prev === next) return 'NO_CHANGE';
  if (field === 'balance') return 'BALANCE_CHANGE';
  if (field === 'accountStatus' || field === 'paymentStatus') {
    const nextStr = String(next || '');
    if (DEROGATORY_RE.test(nextStr) && !DEROGATORY_RE.test(String(prev || ''))) return 'NEW_DEROGATORY';
    return 'STATUS_CHANGE';
  }
  if (field === 'account' && prev && !next) return 'DELETED';
  if (field === 'account' && !prev && next) return 'NEW_ACCOUNT';
  if (field === 'inquiry' && prev && !next) return 'INQUIRY_REMOVED';
  return 'UPDATED';
}

export function diffTradelineSnapshots(
  previous: TradelineSnapshot[],
  current: TradelineSnapshot[],
): CreditEventDraft[] {
  const prevMap = new Map(previous.map((s) => [s.accountKey, s]));
  const curMap = new Map(current.map((s) => [s.accountKey, s]));
  const events: CreditEventDraft[] = [];

  for (const [key, cur] of curMap) {
    const prev = prevMap.get(key);
    if (!prev) {
      events.push({
        accountKey: key,
        bureau: cur.bureau,
        eventType: 'ACCOUNT_APPEARED',
        field: 'account',
        previousValue: null,
        newValue: cur.furnisherName,
        taxonomy: DEROGATORY_RE.test(String(cur.accountStatus || cur.paymentStatus || ''))
          ? 'NEW_DEROGATORY'
          : 'NEW_ACCOUNT',
      });
      continue;
    }
    const fields: Array<keyof TradelineSnapshot> = [
      'balance', 'creditLimit', 'pastDue', 'accountStatus', 'paymentStatus',
      'remarks', 'dateOpened', 'dateClosed', 'dateReported', 'paymentHistory',
    ];
    for (const field of fields) {
      const a = prev[field] ?? null;
      const b = cur[field] ?? null;
      if (String(a ?? '') === String(b ?? '')) continue;
      events.push({
        accountKey: key,
        bureau: cur.bureau,
        eventType: `${String(field).replace(/[A-Z]/g, (m) => `_${m}`).toUpperCase()}_CHANGED`.replace(/^_/, ''),
        field: String(field),
        previousValue: a as any,
        newValue: b as any,
        taxonomy: classifyFieldChange(String(field), a, b),
      });
    }
  }

  for (const [key, prev] of prevMap) {
    if (curMap.has(key)) continue;
    events.push({
      accountKey: key,
      bureau: prev.bureau,
      eventType: 'ACCOUNT_DISAPPEARED',
      field: 'account',
      previousValue: prev.furnisherName,
      newValue: null,
      taxonomy: 'DELETED',
    });
  }

  return events;
}

export function tallyResultTaxonomy(events: { taxonomy?: string; eventType?: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of RESULT_TAXONOMY) counts[t] = 0;
  for (const e of events) {
    const key = (e.taxonomy || 'UNKNOWN') as string;
    counts[key] = (counts[key] || 0) + 1;
  }
  return counts;
}

export function consumerChangeSummary(events: CreditEventDraft[]): string[] {
  const lines: string[] = [];
  for (const e of events.slice(0, 12)) {
    if (e.taxonomy === 'DELETED') lines.push(`Account no longer reported: ${e.previousValue}`);
    else if (e.taxonomy === 'BALANCE_CHANGE') lines.push(`Balance changed ${e.previousValue} → ${e.newValue}`);
    else if (e.taxonomy === 'NEW_DEROGATORY') lines.push(`New derogatory status on ${e.accountKey}`);
    else if (e.taxonomy === 'NEW_ACCOUNT') lines.push(`New account reported: ${e.newValue}`);
    else if (e.taxonomy === 'INQUIRY_REMOVED') lines.push('Inquiry no longer reported');
    else if (e.taxonomy === 'STATUS_CHANGE') lines.push(`Status changed ${e.previousValue} → ${e.newValue}`);
    else if (e.taxonomy === 'UPDATED') lines.push(`${e.field} updated on ${e.accountKey}`);
  }
  return lines;
}
