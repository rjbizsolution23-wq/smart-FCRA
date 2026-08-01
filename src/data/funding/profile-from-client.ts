/**
 * Build institutional matching profile from portal client + report meta.
 */
import type { ClientCreditProfileInput, ComprehensiveMatchingReport, LenderMatchResult } from './institutional-matching';

export function buildInstitutionalProfile(input: {
  eqScore?: number | null;
  exScore?: number | null;
  tuScore?: number | null;
  utilizationPct?: number | null;
  inquiries?: number;
  collections?: number;
  negativeAccounts?: number;
  hasBankruptcy?: boolean;
  highestLimit?: number;
  monthlyIncome?: number | null;
  state?: string | null;
  isBusinessOwner?: boolean;
}): ClientCreditProfileInput {
  const utilPct = input.utilizationPct ?? 20;
  const util = utilPct > 1 ? utilPct / 100 : utilPct;
  return {
    transunionScore: Number(input.tuScore) || 600,
    equifaxScore: Number(input.eqScore) || 600,
    experianScore: Number(input.exScore) || 600,
    revolvingUtilizationRatio: Math.max(0, Math.min(1, util)),
    recentInquiriesLast6Months: Number(input.inquiries) || 0,
    totalNegativeAccounts: Number(input.negativeAccounts ?? input.collections) || 0,
    hasUnpaidCollections: (input.collections || 0) > 0,
    hasBankruptcy: Boolean(input.hasBankruptcy),
    highestPrimaryCreditLimit: Number(input.highestLimit) || 2500,
    averageAccountAgeYears: 3.5,
    grossMonthlyIncome: Number(input.monthlyIncome) || 5000,
    isLLCOrCorpOwner: Boolean(input.isBusinessOwner),
    stateResidency: input.state || undefined,
  };
}

function slimMatches(rows: LenderMatchResult[], n = 12) {
  return rows.slice(0, n).map((m) => ({
    id: m.lender.id,
    name: m.lender.name,
    type: m.lender.type,
    minCreditScore: m.lender.minCreditScore,
    bureauPulled: m.lender.bureauPulled,
    softPullPrequal: m.lender.softPullPrequal,
    maxLimitRange: m.lender.maxLimitRange,
    affiliateOrAppUrl: m.lender.affiliateOrAppUrl,
    state: m.lender.state,
    matchPercentage: m.matchPercentage,
    approvalTier: m.approvalTier,
    relevantBureauScore: m.relevantBureauScore,
    estimatedApprovalLimit: m.estimatedApprovalLimit,
    whyApproved: m.whyApproved.slice(0, 3),
    holdbackFactors: m.holdbackFactors.slice(0, 3),
    actionableStepsTo100: m.actionableStepsTo100.slice(0, 3),
  }));
}

/** Slim payload for portal JSON (avoid dumping all 600 matches). */
export function slimInstitutionalReport(report: ComprehensiveMatchingReport) {
  return {
    generatedAt: report.generatedAt,
    totalLendersEvaluated: report.totalLendersEvaluated,
    guaranteedApprovalsCount: report.guaranteedApprovalsCount,
    highApprovalsCount: report.highApprovalsCount,
    totalEstimatedCapitalPotential: report.totalEstimatedCapitalPotential,
    topCreditUnions: slimMatches(report.topCreditUnions),
    top0PercentBusinessCards: slimMatches(report.top0PercentBusinessCards),
    topPrimaryTradelines: slimMatches(report.topPrimaryTradelines),
    topUnsecuredLoans: slimMatches(report.topUnsecuredLoans),
    topOverall: slimMatches(report.allMatchesSorted, 15),
  };
}
