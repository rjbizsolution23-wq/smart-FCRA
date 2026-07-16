/**
 * 🧠 NEURONEDGE LABS™ — ENHANCED VIOLATIONS ORCHESTRATOR & ANALYZER v4.0
 * Compiled Legal Engine executing 75+ Rules & Class Action Viability
 * 
 * Company:        RJ Business Solutions
 * Owner:          Rick Jefferson
 * Version:        4.0.0 — Truth-Engine Fusion
 * Last Updated:   2026-07-16
 */

import { Violation, ViolationAnalysisResult, CreditReportData } from '../types/violations';
import { detectFCRACoreViolations } from './violations-fcra-core';
import { detectFDCPAViolations } from './violations-fdcpa';
import { detectECOAViolations } from './violations-ecoa';
import { detectStateViolations } from './violations-state-laws';
import { detectMetro2Violations } from './violations-metro2';
import { detectBankruptcyViolations } from './violations-bankruptcy';

export function detectEnhancedViolations(
  report: CreditReportData,
  reportId: string,
  clientId: string,
  state: string = 'US'
): Violation[] {
  const violations: Violation[] = [
    ...detectFCRACoreViolations(report, reportId, clientId, state),
    ...detectFDCPAViolations(report, reportId, clientId, state),
    ...detectECOAViolations(report, reportId, clientId, state),
    ...detectStateViolations(report, reportId, clientId, state),
    ...detectMetro2Violations(report, reportId, clientId, state),
    ...detectBankruptcyViolations(report, reportId, clientId, state)
  ];

  // Sort by severity: critical -> high -> medium -> low
  const severityRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return violations.sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);
}

export function compileEnhancedLitigationScore(
  violations: Violation[]
): ViolationAnalysisResult {
  const totalViolations = violations.length;
  
  let criticalCount = 0;
  let highCount = 0;
  let mediumCount = 0;
  let lowCount = 0;

  let totalStatutoryMin = 0;
  let totalStatutoryMax = 0;
  let totalActual = 0;
  let totalPunitive = 0;
  let totalAttorneyFees = 0;

  const byStatute: Record<string, { count: number; damagesMin: number; damagesMax: number }> = {};
  const defendantsMap: Record<string, { name: string; type: 'CRA' | 'Furnisher' | 'Debt Collector'; count: number; damagesMin: number; damagesMax: number }> = {};

  violations.forEach(v => {
    // 1. Counts by severity
    if (v.severity === 'critical') criticalCount++;
    else if (v.severity === 'high') highCount++;
    else if (v.severity === 'medium') mediumCount++;
    else lowCount++;

    // 2. Damages aggregation
    totalStatutoryMin += v.statutoryDamagesMin || 0;
    totalStatutoryMax += v.statutoryDamagesMax || 0;
    totalActual += v.actualDamagesEst || 0;
    totalPunitive += v.punitiveDamagesEst || 0;
    totalAttorneyFees += v.attorneyFeesEst || 0;

    // 3. By Statute
    if (!byStatute[v.statute]) {
      byStatute[v.statute] = { count: 0, damagesMin: 0, damagesMax: 0 };
    }
    byStatute[v.statute].count++;
    byStatute[v.statute].damagesMin += v.totalDamagesMin || 0;
    byStatute[v.statute].damagesMax += v.totalDamagesMax || 0;

    // 4. By Defendant
    const defName = v.defendantName || 'Unknown Defendant';
    const defType: 'CRA' | 'Furnisher' | 'Debt Collector' = 
      v.defendantType === 'CRA' ? 'CRA' : 
      v.defendantType === 'Debt Collector' ? 'Debt Collector' : 'Furnisher';

    if (!defendantsMap[defName]) {
      defendantsMap[defName] = { name: defName, type: defType, count: 0, damagesMin: 0, damagesMax: 0 };
    }
    defendantsMap[defName].count++;
    defendantsMap[defName].damagesMin += v.totalDamagesMin || 0;
    defendantsMap[defName].damagesMax += v.totalDamagesMax || 0;
  });

  const grandTotalMin = totalStatutoryMin + totalActual + totalPunitive + totalAttorneyFees;
  const grandTotalMax = totalStatutoryMax + totalActual + totalPunitive + totalAttorneyFees;

  // 5. Litigation score computation (0 - 100)
  let litigationScore = 0;
  litigationScore += Math.min(25, totalViolations * 3);
  litigationScore += criticalCount * 15;
  litigationScore += highCount * 8;
  litigationScore += mediumCount * 4;
  litigationScore += lowCount * 1;
  litigationScore += Object.keys(defendantsMap).length * 5;
  if (grandTotalMax > 25000) litigationScore += 15;
  litigationScore = Math.min(100, Math.round(litigationScore));

  let litigationGrade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F' = 'F';
  if (litigationScore >= 90) litigationGrade = 'A+';
  else if (litigationScore >= 80) litigationGrade = 'A';
  else if (litigationScore >= 70) litigationGrade = 'B+';
  else if (litigationScore >= 60) litigationGrade = 'B';
  else if (litigationScore >= 50) litigationGrade = 'C';
  else if (litigationScore >= 35) litigationGrade = 'D';

  let recommendedAction: 'LITIGATE' | 'DEMAND_SETTLEMENT' | 'DISPUTE_FIRST' | 'MONITOR' = 'DISPUTE_FIRST';
  if (litigationScore >= 80) recommendedAction = 'LITIGATE';
  else if (litigationScore >= 55) recommendedAction = 'DEMAND_SETTLEMENT';
  else if (litigationScore >= 30) recommendedAction = 'DISPUTE_FIRST';

  // 6. Class Action Viability (Rule 23 four-factor scale, max 40)
  let classActionScore = 0;
  // Numerosity (Common system errors like re-aging, duplicate reporting)
  const hasSystemicErrors = violations.some(v => v.subcategory.includes('Re-Aging') || v.subcategory.includes('Duplicate') || v.subcategory.includes('Obsolete'));
  if (hasSystemicErrors) classActionScore += 15;
  // Commonality & Typicality (Multiple identical infractions across a single CRA)
  const maxCRAViolations = Object.values(defendantsMap).filter(d => d.type === 'CRA').reduce((max, d) => Math.max(max, d.count), 0);
  if (maxCRAViolations > 2) classActionScore += 15;
  // Adequacy of representation
  classActionScore += 10; // Default baseline

  let classActionViability: 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
  if (classActionScore >= 30) classActionViability = 'HIGH';
  else if (classActionScore >= 15) classActionViability = 'MODERATE';

  return {
    violations,
    totalViolations,
    criticalCount,
    highCount,
    mediumCount,
    lowCount,
    totalStatutoryMin,
    totalStatutoryMax,
    totalActual,
    totalPunitive,
    totalAttorneyFees,
    grandTotalMin,
    grandTotalMax,
    litigationScore,
    litigationGrade,
    recommendedAction,
    classActionScore,
    classActionViability,
    defendants: Object.values(defendantsMap),
    byStatute: byStatute as any
  };
}
