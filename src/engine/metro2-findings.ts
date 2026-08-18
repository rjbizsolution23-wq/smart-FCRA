/**
 * Cross-bureau / Metro 2 review layer.
 * Flag differences without automatically labeling them legal violations.
 */

export const FINDING_STATUSES = [
  'OBSERVATION',
  'REVIEW',
  'POSSIBLE_INCONSISTENCY',
  'SUPPORTED_DISPUTE_ISSUE',
  'RESOLVED',
  'FALSE_POSITIVE',
] as const;

export type FindingStatus = (typeof FINDING_STATUSES)[number];

export type BureauFieldRow = {
  tradelineId: string;
  bureau: string;
  furnisherName: string;
  accountKey?: string;
  balance?: number | null;
  accountStatus?: string;
  dateOpened?: string;
  pastDue?: number | null;
  creditLimit?: number | null;
};

export type CrossBureauFinding = {
  findingType: 'CROSS_BUREAU_FIELD_VARIANCE';
  field: string;
  severity: FindingStatus;
  sourceAccounts: string[];
  values: Record<string, string | number | null>;
  requiresConsumerConfirmation: boolean;
  legalCharacterization: null;
  note: string;
};

const FORBIDDEN_AUTO_LABELS = [
  'FCRA VIOLATION',
  'METRO 2 VIOLATION',
  'ILLEGAL',
  'FRAUD',
];

export function matchConfidence(a: BureauFieldRow, b: BureauFieldRow): 'HIGH_CONFIDENCE_MATCH' | 'POSSIBLE_MATCH' | 'NO_MATCH' {
  const nameA = String(a.furnisherName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const nameB = String(b.furnisherName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!nameA || !nameB) return 'NO_MATCH';
  const nameHit = nameA.includes(nameB.slice(0, 8)) || nameB.includes(nameA.slice(0, 8));
  if (!nameHit) return 'NO_MATCH';
  const openA = String(a.dateOpened || '').slice(0, 7);
  const openB = String(b.dateOpened || '').slice(0, 7);
  const openClose = !openA || !openB || openA === openB || monthsApart(openA, openB) <= 2;
  const balA = Number(a.balance ?? 0);
  const balB = Number(b.balance ?? 0);
  const balClose = Math.abs(balA - balB) <= Math.max(50, Math.max(balA, balB) * 0.15);
  if (openClose && (balClose || a.accountKey && a.accountKey === b.accountKey)) return 'HIGH_CONFIDENCE_MATCH';
  return 'POSSIBLE_MATCH';
}

function monthsApart(a: string, b: string): number {
  const [ay, am] = a.split('-').map(Number);
  const [by, bm] = b.split('-').map(Number);
  if (!ay || !am || !by || !bm) return 99;
  return Math.abs((ay * 12 + am) - (by * 12 + bm));
}

export function detectCrossBureauVariances(rows: BureauFieldRow[]): CrossBureauFinding[] {
  const findings: CrossBureauFinding[] = [];
  const groups: BureauFieldRow[][] = [];

  for (const row of rows) {
    let placed = false;
    for (const g of groups) {
      if (g.some((x) => matchConfidence(x, row) !== 'NO_MATCH')) {
        g.push(row);
        placed = true;
        break;
      }
    }
    if (!placed) groups.push([row]);
  }

  for (const g of groups) {
    if (g.length < 2) continue;
    for (const field of ['balance', 'accountStatus', 'dateOpened', 'pastDue', 'creditLimit'] as const) {
      const values: Record<string, string | number | null> = {};
      const uniq = new Set<string>();
      for (const r of g) {
        const v = (r as any)[field];
        values[r.bureau] = v ?? null;
        uniq.add(String(v ?? ''));
      }
      if (uniq.size <= 1) continue;
      findings.push({
        findingType: 'CROSS_BUREAU_FIELD_VARIANCE',
        field,
        severity: field === 'accountStatus' ? 'POSSIBLE_INCONSISTENCY' : 'REVIEW',
        sourceAccounts: g.map((r) => r.tradelineId),
        values,
        requiresConsumerConfirmation: true,
        legalCharacterization: null,
        note: 'Field differs across bureaus. This is an observation for consumer review — not an automatic legal violation.',
      });
    }
  }

  return findings;
}

export function findingHasForbiddenLabel(text: string): boolean {
  const u = String(text || '').toUpperCase();
  return FORBIDDEN_AUTO_LABELS.some((l) => u.includes(l));
}
