/**
 * Deep fundability + roadmap engine for the client portal.
 */
export type FundabilityInput = {
  eqScore?: number | null;
  exScore?: number | null;
  tuScore?: number | null;
  accounts?: number;
  collections?: number;
  inquiries?: number;
  violations?: number;
  openRevolvingBalance?: number;
  openRevolvingLimit?: number;
  revolvingUtilPct?: number | null;
  estimatedIncomeMonthly?: number;
  estimatedDebtPayments?: number;
  goal?: string;
};

/** Estimate FICO lift if a violation is successfully removed (fundability-informed, not a hard guarantee). */
export function estimateViolationScoreLift(avgScore: number, severity: string): number {
  const gap = Math.max(0, 720 - avgScore);
  const factor = severity === 'critical' ? 0.35 : severity === 'high' ? 0.22 : severity === 'medium' ? 0.14 : 0.08;
  return Math.min(45, Math.max(4, Math.round(gap * factor)));
}

function utilizationPoints(utilPct: number | null | undefined): number {
  if (utilPct == null) return 5;
  if (utilPct <= 10) return 10;
  if (utilPct <= 29) return 8;
  if (utilPct <= 49) return 5;
  if (utilPct <= 74) return 2;
  return 0;
}

export function buildFundabilityReport(input: FundabilityInput) {
  const scores = [input.eqScore, input.exScore, input.tuScore].filter((n) => typeof n === 'number') as number[];
  const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 600;
  const accounts = input.accounts || 0;
  const collections = input.collections || 0;
  const inquiries = input.inquiries || 0;
  const violations = input.violations || 0;

  const scorePts = Math.max(0, Math.min(40, Math.round((avg - 500) / 5)));
  const depthPts = Math.max(0, Math.min(20, accounts * 3));
  const cleanPts = Math.max(0, 20 - collections * 6 - Math.min(10, inquiries));
  const disputePts = Math.max(0, 10 - Math.min(10, violations));
  const utilPts = utilizationPoints(input.revolvingUtilPct);
  const overall = Math.max(0, Math.min(100, scorePts + depthPts + cleanPts + disputePts + utilPts));

  const mortgageReady = Math.max(0, Math.min(100, overall - (avg < 640 ? 15 : 0) - collections * 5));
  const autoReady = Math.max(0, Math.min(100, overall - (avg < 600 ? 10 : 0)));
  const studentReady = Math.max(0, Math.min(100, overall - (avg < 580 ? 5 : 0)));
  const debtHealth = Math.max(0, Math.min(100, 80 - collections * 10 - Math.min(20, inquiries * 2)));

  const dti =
    input.estimatedIncomeMonthly && input.estimatedDebtPayments != null
      ? Math.round((input.estimatedDebtPayments / Math.max(1, input.estimatedIncomeMonthly)) * 100)
      : null;

  const blockers: string[] = [];
  if (avg < 620) blockers.push('Average bureau score below common conventional comfort zone');
  if (collections > 0) blockers.push(`${collections} collection(s) still reporting — prioritize validation/dispute or pay-for-delete strategy with counsel`);
  if (accounts < 3) blockers.push('Thin file — add legitimate positive tradelines (rent reporting / builder loan)');
  if (inquiries > 5) blockers.push('Elevated recent inquiries — freeze unnecessary applications 90 days');
  if (violations > 0) blockers.push(`${violations} FCRA accuracy flags — resolve before major credit applications`);
  if (input.revolvingUtilPct != null && input.revolvingUtilPct > 30) {
    blockers.push(`Revolving utilization at ${input.revolvingUtilPct}% — target under 30% before mortgage/auto applications`);
  }

  const actions = [
    { priority: 1, title: 'Complete tri-bureau accuracy review', detail: 'Open each bureau report in your portal and pin dispute items.' },
    { priority: 2, title: 'Crush revolving utilization', detail: 'Bring card balances under 10–30% of limits before applying.' },
    { priority: 3, title: 'Add positive data intelligently', detail: 'Use recommended rent reporters / builder products matched to your profile.' },
    { priority: 4, title: 'Season 60–90 days', detail: 'Show clean on-time history before mortgage/auto submission.' },
    { priority: 5, title: 'Document pack', detail: 'ID, income, bank statements, LOE for derogatories — ready for underwriter.' },
  ];

  const roadmaps = {
    mortgage: {
      title: 'Mortgage Roadmap',
      targetScore: 680,
      currentAvg: avg,
      readiness: mortgageReady,
      steps: [
        'Confirm EQ/EX/TU all updated and disputed items tracked',
        'Pay revolving balances; avoid new revolving debt',
        'Enable rent reporting if renting',
        'Assemble 2 years income + 2 months bank statements',
        'Get pre-approval only after 60+ days clean seasoning',
      ],
      docsNeeded: ['Government ID', 'W-2/1099 (2 yrs)', 'Pay stubs', 'Bank statements (2 mo)', 'LOE for derogatories'],
    },
    auto: {
      title: 'Auto Loan Roadmap',
      targetScore: 650,
      currentAvg: avg,
      readiness: autoReady,
      steps: [
        'Know your payment comfort zone',
        'Save down payment (10%+ preferred)',
        'Compare credit unions vs dealer financing',
        'Limit inquiries to a 14-day shopping window',
      ],
      docsNeeded: ['ID', 'Proof of income', 'Proof of residence', 'Insurance quote'],
    },
    student: {
      title: 'Student Loan / Education Funding Roadmap',
      targetScore: 620,
      currentAvg: avg,
      readiness: studentReady,
      steps: [
        'Complete FAFSA / school aid forms first',
        'Compare federal vs private — federal usually safer',
        'If private: cosigner + clean recent history helps',
        'Avoid stacking credit cards during school',
      ],
      docsNeeded: ['School award letter', 'ID', 'Income (if private)'],
    },
    debt: {
      title: 'Debt Escape Roadmap',
      targetScore: avg + 40,
      currentAvg: avg,
      readiness: debtHealth,
      steps: [
        'List every debt with APR and minimum',
        'Avalanche (highest APR) or Snowball (smallest balance)',
        'Dispute inaccurate collections in parallel',
        'Automate minimums; throw extra at priority debt',
        'Rebuild with one on-time revolving + installment',
      ],
      docsNeeded: ['Creditor statements', 'Budget worksheet', 'Hardship letters if needed'],
    },
  };

  return {
    overallScore: overall,
    avgBureauScore: avg,
    bureauScores: { equifax: input.eqScore ?? null, experian: input.exScore ?? null, transunion: input.tuScore ?? null },
    pillars: { mortgageReady, autoReady, studentReady, debtHealth },
    dti,
    blockers,
    actions,
    roadmaps,
    narrative: `Your fundability index is ${overall}/100 with an average bureau score near ${avg}.${
      input.revolvingUtilPct != null ? ` Revolving utilization: ${input.revolvingUtilPct}%.` : ''
    } ${
      blockers[0] ? `Top blocker: ${blockers[0]}.` : 'No critical blockers detected — stay disciplined and season clean history.'
    } Follow the roadmap for your goal and use your personal tutor to stay accountable.`,
    revolvingUtilPct: input.revolvingUtilPct ?? null,
    revolvingBalance: input.openRevolvingBalance ?? null,
    revolvingLimit: input.openRevolvingLimit ?? null,
  };
}
