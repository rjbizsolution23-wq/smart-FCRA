/**
 * Precision Institutional Lender & Primary Tradeline Matching Engine
 * 
 * Underwrites client credit profiles against 600+ Credit Unions, Major Banks,
 * 0% APR Business Credit Cards, and Primary Tradelines.
 * 
 * Computes exact approval probability %, positive approval drivers,
 * risk holdback factors, estimated limit ranges, and step-by-step action plans.
 */

import { MASTER_LENDERS_DATABASE, type InstitutionalLender, type BureauPulled } from './lenders-database';

export interface ClientCreditProfileInput {
  transunionScore: number;
  equifaxScore: number;
  experianScore: number;
  revolvingUtilizationRatio: number; // 0.0 - 1.0 (e.g. 0.18)
  recentInquiriesLast6Months: number;
  totalNegativeAccounts: number;
  hasUnpaidCollections: boolean;
  hasBankruptcy: boolean;
  highestPrimaryCreditLimit: number; // e.g. 5000
  averageAccountAgeYears: number; // e.g. 4.2
  grossMonthlyIncome: number; // e.g. 7500
  isLLCOrCorpOwner: boolean;
  stateResidency?: string; // e.g. "GA"
}

export type ApprovalTier = 
  | "GUARANTEED_APPROVAL" // 95 - 99%
  | "HIGH_APPROVAL_ODDS"  // 80 - 94%
  | "MODERATE_APPROVAL_ODDS" // 50 - 79%
  | "RISK_EXPOSURE";      // < 50%

export interface LenderMatchResult {
  lender: InstitutionalLender;
  matchPercentage: number; // 0 - 99
  approvalTier: ApprovalTier;
  relevantBureauScore: number;
  bureauUsed: BureauPulled;
  whyApproved: string[];
  holdbackFactors: string[];
  estimatedApprovalLimit: string;
  actionableStepsTo100: string[];
}

export interface ComprehensiveMatchingReport {
  clientProfile: ClientCreditProfileInput;
  totalLendersEvaluated: number;
  guaranteedApprovalsCount: number;
  highApprovalsCount: number;
  totalEstimatedCapitalPotential: number; // Total $ capacity
  topCreditUnions: LenderMatchResult[];
  top0PercentBusinessCards: LenderMatchResult[];
  topPrimaryTradelines: LenderMatchResult[];
  topUnsecuredLoans: LenderMatchResult[];
  allMatchesSorted: LenderMatchResult[];
  generatedAt: string;
}

export class LenderMatchingEngine {

  /**
   * Evaluate a single lender against client credit profile
   */
  static evaluateLender(
    lender: InstitutionalLender,
    profile: ClientCreditProfileInput
  ): LenderMatchResult {
    const whyApproved: string[] = [];
    const holdbackFactors: string[] = [];
    const actionableStepsTo100: string[] = [];

    // 1. Determine Relevant Score based on Bureau Pulled
    let relevantBureauScore = profile.experianScore;
    if (lender.bureauPulled === "TransUnion") {
      relevantBureauScore = profile.transunionScore;
    } else if (lender.bureauPulled === "Equifax") {
      relevantBureauScore = profile.equifaxScore;
    } else if (lender.bureauPulled === "Experian + Equifax") {
      relevantBureauScore = Math.min(profile.experianScore, profile.equifaxScore);
    } else if (lender.bureauPulled === "Soft Pull Only") {
      relevantBureauScore = Math.max(profile.transunionScore, profile.equifaxScore, profile.experianScore);
    }

    // Special Handling for Primary Tradelines & Rent Reporters
    if (lender.type === "PRIMARY_TRADELINE" || lender.type === "RENT_REPORTER") {
      const matchPercentage = profile.hasBankruptcy ? 85 : 98;
      whyApproved.push("Soft pull pre-qualification guaranteed with zero impact to credit scores.");
      whyApproved.push(`Reports payment history to credit bureaus to boost primary tradeline depth.`);
      
      if (profile.hasBankruptcy) {
        holdbackFactors.push("Prior bankruptcy on file, but soft pull primary line is still eligible.");
      }

      return {
        lender,
        matchPercentage,
        approvalTier: "GUARANTEED_APPROVAL",
        relevantBureauScore,
        bureauUsed: lender.bureauPulled,
        whyApproved,
        holdbackFactors,
        estimatedApprovalLimit: lender.maxLimitRange,
        actionableStepsTo100: ["Apply via soft-pull portal to immediately report primary line."]
      };
    }

    // 2. Base Probability Calculation from Score Delta
    const scoreDelta = relevantBureauScore - lender.minCreditScore;
    let baseMatch = 75;

    if (scoreDelta >= 60) {
      baseMatch = 96;
      whyApproved.push(`${lender.bureauPulled} score of ${relevantBureauScore} significantly exceeds the ${lender.minCreditScore} minimum (+${scoreDelta} pts).`);
    } else if (scoreDelta >= 30) {
      baseMatch = 88;
      whyApproved.push(`${lender.bureauPulled} score of ${relevantBureauScore} comfortably exceeds the ${lender.minCreditScore} threshold.`);
    } else if (scoreDelta >= 10) {
      baseMatch = 80;
      whyApproved.push(`${lender.bureauPulled} score of ${relevantBureauScore} meets ${lender.minCreditScore} tier criteria.`);
    } else if (scoreDelta >= 0) {
      baseMatch = 70;
      whyApproved.push(`${lender.bureauPulled} score of ${relevantBureauScore} meets minimum requirement (${lender.minCreditScore}).`);
    } else if (scoreDelta >= -20) {
      baseMatch = 45;
      holdbackFactors.push(`${lender.bureauPulled} score (${relevantBureauScore}) is slightly below target (${lender.minCreditScore}).`);
      actionableStepsTo100.push(`Boost ${lender.bureauPulled} score by +${Math.abs(scoreDelta)} points via utilization paydown.`);
    } else {
      baseMatch = 20;
      holdbackFactors.push(`${lender.bureauPulled} score (${relevantBureauScore}) is significantly below ${lender.minCreditScore} minimum.`);
      actionableStepsTo100.push(`Requires +${Math.abs(scoreDelta)} point score increase on ${lender.bureauPulled}.`);
    }

    // 3. Utilization Impact
    if (profile.revolvingUtilizationRatio < 0.10) {
      baseMatch += 5;
      whyApproved.push("Revolving utilization is under 10% (Prime Tier).");
    } else if (profile.revolvingUtilizationRatio > 0.45) {
      baseMatch -= 25;
      holdbackFactors.push(`High revolving utilization (${Math.round(profile.revolvingUtilizationRatio * 100)}%) triggers risk algorithms.`);
      actionableStepsTo100.push("Pay down revolving credit card balances below 29% total utilization.");
    } else if (profile.revolvingUtilizationRatio > 0.29) {
      baseMatch -= 10;
      holdbackFactors.push(`Revolving utilization is ${Math.round(profile.revolvingUtilizationRatio * 100)}% (Target: < 29%).`);
      actionableStepsTo100.push("Lower revolving card balances below 29%.");
    }

    // 4. Inquiry Sensitivity
    if (profile.recentInquiriesLast6Months <= 1) {
      baseMatch += 5;
      whyApproved.push("Low hard inquiry velocity in last 6 months.");
    } else if (profile.recentInquiriesLast6Months >= 4) {
      const penalty = lender.inquirySensitivity === "HIGH" ? 25 : 12;
      baseMatch -= penalty;
      holdbackFactors.push(`${profile.recentInquiriesLast6Months} recent hard inquiries detected (High velocity flag).`);
      actionableStepsTo100.push("Pause new credit applications for 60-90 days to cool inquiry velocity.");
    }

    // 5. Negative Accounts & Collections
    if (profile.totalNegativeAccounts === 0) {
      baseMatch += 5;
      whyApproved.push("Zero derogatory trade lines on record.");
    } else {
      baseMatch -= profile.totalNegativeAccounts * 12;
      holdbackFactors.push(`${profile.totalNegativeAccounts} derogatory trade lines present on credit report.`);
      actionableStepsTo100.push("File AI Metro 2 disputes to challenge derogatory accounts.");
    }

    if (profile.hasUnpaidCollections) {
      baseMatch -= 20;
      holdbackFactors.push("Unpaid collection account detected.");
      actionableStepsTo100.push("Execute Pay-for-Delete or validation challenge on collection item.");
    }

    // 6. Bankruptcy Sensitivity
    if (profile.hasBankruptcy) {
      if (lender.bankruptcySensitive) {
        baseMatch = Math.min(baseMatch, 25);
        holdbackFactors.push("Lender underwriting is strictly sensitive to prior bankruptcies.");
      } else {
        baseMatch -= 10;
        holdbackFactors.push("Prior bankruptcy on file, but lender permits seasoned discharge.");
      }
    }

    // 7. Primary Limit Check for Business Cards
    if (lender.type === "BUSINESS_CARD") {
      if (profile.highestPrimaryCreditLimit >= 10000) {
        baseMatch += 8;
        whyApproved.push(`High primary credit limit ($${profile.highestPrimaryCreditLimit.toLocaleString()}) establishes high-limit credibility.`);
      } else if (profile.highestPrimaryCreditLimit < 3000) {
        baseMatch -= 15;
        holdbackFactors.push("Highest personal primary credit card is under $3,000.");
        actionableStepsTo100.push("Add a $10,000+ primary or Authorized User card prior to applying.");
      }
    }

    // Clamp Final Match Score between 5% and 99%
    const finalMatch = Math.max(5, Math.min(99, Math.round(baseMatch)));

    let approvalTier: ApprovalTier = "GUARANTEED_APPROVAL";
    if (finalMatch >= 95) approvalTier = "GUARANTEED_APPROVAL";
    else if (finalMatch >= 80) approvalTier = "HIGH_APPROVAL_ODDS";
    else if (finalMatch >= 50) approvalTier = "MODERATE_APPROVAL_ODDS";
    else approvalTier = "RISK_EXPOSURE";

    // Estimated Approval Limit Calculation
    let estimatedApprovalLimit = lender.maxLimitRange;
    if (finalMatch >= 85 && profile.grossMonthlyIncome > 6000) {
      const upperEst = Math.min(50000, Math.round(profile.grossMonthlyIncome * 3.5));
      estimatedApprovalLimit = `$15,000 - $${upperEst.toLocaleString()}`;
    } else if (finalMatch >= 70) {
      estimatedApprovalLimit = "$5,000 - $15,000";
    } else {
      estimatedApprovalLimit = "$2,500 - $7,500";
    }

    return {
      lender,
      matchPercentage: finalMatch,
      approvalTier,
      relevantBureauScore,
      bureauUsed: lender.bureauPulled,
      whyApproved,
      holdbackFactors,
      estimatedApprovalLimit,
      actionableStepsTo100
    };
  }

  /**
   * Underwrite client profile against all 600+ lenders and generate comprehensive report
   */
  static runComprehensiveMatch(profile: ClientCreditProfileInput): ComprehensiveMatchingReport {
    const evaluatedMatches: LenderMatchResult[] = MASTER_LENDERS_DATABASE.map((lender) =>
      this.evaluateLender(lender, profile)
    );

    // Sort by Match Percentage descending
    evaluatedMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    const guaranteedApprovals = evaluatedMatches.filter((m) => m.matchPercentage >= 95);
    const highApprovals = evaluatedMatches.filter((m) => m.matchPercentage >= 80 && m.matchPercentage < 95);

    const topCreditUnions = evaluatedMatches.filter((m) => m.lender.type === "CREDIT_UNION").slice(0, 15);
    const top0PercentBusinessCards = evaluatedMatches.filter((m) => m.lender.type === "BUSINESS_CARD").slice(0, 10);
    const topPrimaryTradelines = evaluatedMatches.filter((m) => m.lender.type === "PRIMARY_TRADELINE" || m.lender.type === "RENT_REPORTER").slice(0, 10);
    const topUnsecuredLoans = evaluatedMatches.filter((m) => m.lender.type === "UNSECURED_LOAN" || m.lender.type === "MAJOR_BANK").slice(0, 10);

    // Calculate total capital potential
    const topMatchesForCapital = evaluatedMatches.filter((m) => m.matchPercentage >= 75).slice(0, 10);
    let totalEstimatedCapitalPotential = topMatchesForCapital.length * 25000;
    if (profile.experianScore >= 720 && profile.revolvingUtilizationRatio < 0.15) {
      totalEstimatedCapitalPotential = Math.max(150000, topMatchesForCapital.length * 35000);
    }

    return {
      clientProfile: profile,
      totalLendersEvaluated: MASTER_LENDERS_DATABASE.length,
      guaranteedApprovalsCount: guaranteedApprovals.length,
      highApprovalsCount: highApprovals.length,
      totalEstimatedCapitalPotential,
      topCreditUnions,
      top0PercentBusinessCards,
      topPrimaryTradelines,
      topUnsecuredLoans,
      allMatchesSorted: evaluatedMatches,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Helper method that normalizes various input formats and runs underwriting
   */
  static runPrecisionMatching(rawInput: any): ComprehensiveMatchingReport {
    const utilRaw = rawInput.revolvingUtilizationRatio ?? rawInput.utilizationRatio ?? 12;
    const utilNorm = utilRaw > 1 ? utilRaw / 100 : utilRaw;

    const normalizedProfile: ClientCreditProfileInput = {
      transunionScore: Number(rawInput.transunionScore) || 720,
      equifaxScore: Number(rawInput.equifaxScore) || 715,
      experianScore: Number(rawInput.experianScore) || 730,
      revolvingUtilizationRatio: utilNorm,
      recentInquiriesLast6Months: Number(rawInput.recentInquiriesLast6Months ?? rawInput.inquiries6m ?? 1),
      totalNegativeAccounts: Number(rawInput.totalNegativeAccounts ?? rawInput.negativeAccounts ?? 0),
      hasUnpaidCollections: Boolean(rawInput.hasUnpaidCollections),
      hasBankruptcy: Boolean(rawInput.hasBankruptcy),
      highestPrimaryCreditLimit: Number(rawInput.highestPrimaryCreditLimit ?? rawInput.highestLimit ?? 7500),
      averageAccountAgeYears: Number(rawInput.averageAccountAgeYears ?? 3.5),
      grossMonthlyIncome: Number(rawInput.grossMonthlyIncome ?? rawInput.monthlyIncome ?? 8500),
      isLLCOrCorpOwner: Boolean(rawInput.isLLCOrCorpOwner ?? true),
      stateResidency: rawInput.stateResidency
    };

    return this.runComprehensiveMatch(normalizedProfile);
  }
}

export default LenderMatchingEngine;
