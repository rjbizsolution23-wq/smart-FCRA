/**
 * Utilization math for education — never attach a guaranteed score gain.
 */

export type RevolvingAccount = {
  name: string;
  balance: number;
  limit: number;
};

export type UtilizationCard = {
  name: string;
  limit: number;
  balance: number;
  utilizationPct: number | null;
  balanceAtTarget: number | null;
  differenceToTarget: number | null;
};

export function utilizationForAccount(balance: number, limit: number, targetPct = 0.29): UtilizationCard {
  const lim = Number(limit) || 0;
  const bal = Number(balance) || 0;
  const pct = lim > 0 ? (bal / lim) * 100 : null;
  const balanceAtTarget = lim > 0 ? Math.round(lim * targetPct) : null;
  const differenceToTarget = balanceAtTarget == null ? null : Math.max(0, Math.round(bal - balanceAtTarget));
  return {
    name: '',
    limit: lim,
    balance: bal,
    utilizationPct: pct == null ? null : Math.round(pct * 10) / 10,
    balanceAtTarget,
    differenceToTarget,
  };
}

export function aggregateUtilization(accounts: RevolvingAccount[], targetPct = 0.29) {
  const cards = accounts.map((a) => ({ ...utilizationForAccount(a.balance, a.limit, targetPct), name: a.name }));
  const limit = cards.reduce((s, c) => s + c.limit, 0);
  const balance = cards.reduce((s, c) => s + c.balance, 0);
  const agg = utilizationForAccount(balance, limit, targetPct);
  return {
    cards,
    aggregatePct: agg.utilizationPct,
    availableCredit: Math.max(0, limit - balance),
    reportedRevolvingBalance: balance,
    totalLimit: limit,
    targetPct,
    disclaimer: 'Utilization targets are educational. They are not a guaranteed score change. Different creditors use different scoring models.',
  };
}
