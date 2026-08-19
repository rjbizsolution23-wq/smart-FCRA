/**
 * Tri-bureau tradeline matching matrix for comparison UI.
 */
import { type BureauFieldRow, detectCrossBureauVariances, matchConfidence } from '../engine/metro2-findings';

export type BureauAccountSlice = {
  bureau: string;
  creditorName?: string;
  accountNumber?: string;
  accountStatus?: string;
  currentBalance?: number;
  creditLimit?: number;
  paymentStatus?: string;
  dateOpened?: string;
};

export type TradelineMatrixRow = {
  matchKey: string;
  label: string;
  equifax: BureauAccountSlice | null;
  experian: BureauAccountSlice | null;
  transunion: BureauAccountSlice | null;
  matchConfidence: 'HIGH' | 'POSSIBLE' | 'SINGLE';
  variances: string[];
};

function normName(n?: string): string {
  return String(n || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24);
}

function last4(n?: string): string {
  return String(n || '').replace(/\D/g, '').slice(-4);
}

export function buildTradelineMatrix(bureaus: Array<{
  bureau: string;
  accounts?: BureauAccountSlice[];
}>): TradelineMatrixRow[] {
  const allRows: BureauFieldRow[] = [];
  for (const b of bureaus) {
    for (const a of b.accounts || []) {
      allRows.push({
        tradelineId: `${b.bureau}-${normName(a.creditorName)}-${last4(a.accountNumber)}`,
        bureau: b.bureau,
        furnisherName: a.creditorName || 'Unknown',
        accountKey: `${normName(a.creditorName)}:${last4(a.accountNumber)}`,
        balance: a.currentBalance ?? null,
        accountStatus: a.accountStatus,
        dateOpened: a.dateOpened,
        creditLimit: a.creditLimit ?? null,
        pastDue: null,
      });
    }
  }

  const variances = detectCrossBureauVariances(allRows);
  const groups: Map<string, BureauFieldRow[]> = new Map();

  for (const row of allRows) {
    let key: string | null = null;
    for (const [gk, members] of groups) {
      if (members.some((m) => matchConfidence(m, row) !== 'NO_MATCH')) {
        key = gk;
        members.push(row);
        break;
      }
    }
    if (!key) {
      key = row.accountKey || row.tradelineId;
      groups.set(key, [row]);
    }
  }

  const matrix: TradelineMatrixRow[] = [];
  for (const [matchKey, members] of groups) {
    const byBureau: Record<string, BureauAccountSlice> = {};
    for (const m of members) {
      byBureau[m.bureau] = {
        bureau: m.bureau,
        creditorName: m.furnisherName,
        accountStatus: m.accountStatus,
        currentBalance: m.balance ?? undefined,
        creditLimit: m.creditLimit ?? undefined,
        dateOpened: m.dateOpened,
      };
    }
    const label = members[0]?.furnisherName || matchKey;
    const rowVariances = variances
      .filter((v) => v.sourceAccounts.some((s) => members.some((m) => s.includes(m.furnisherName))))
      .map((v) => v.note);

    const bureauCount = ['Equifax', 'Experian', 'TransUnion'].filter((b) => byBureau[b]).length;
    matrix.push({
      matchKey,
      label,
      equifax: byBureau.Equifax || null,
      experian: byBureau.Experian || null,
      transunion: byBureau.TransUnion || null,
      matchConfidence: bureauCount >= 3 ? 'HIGH' : bureauCount === 2 ? 'POSSIBLE' : 'SINGLE',
      variances: rowVariances,
    });
  }

  return matrix.sort((a, b) => a.label.localeCompare(b.label));
}
