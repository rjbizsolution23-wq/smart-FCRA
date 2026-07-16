/**
 * 🧠 NEURONEDGE LABS™ — DAMAGES CALCULATOR ENGINE v4.0
 * 
 * Company:        RJ Business Solutions
 * Owner:          Rick Jefferson
 * Version:        4.0.0 — Truth-Engine Fusion
 * Last Updated:   2026-07-16
 */

import { Violation } from '../types/violations';
import { getStateDamages } from '../data/state-damages-multipliers';

export interface DamagesProfile {
  statutoryDamagesMin: number;
  statutoryDamagesMax: number;
  actualDamagesEst: number;
  punitiveDamagesEst: number;
  attorneyFeesEst: number;
  totalDamagesMin: number;
  totalDamagesMax: number;
}

/**
 * Calculate appropriate damages profile for a violation
 */
export function calculateViolationDamages(
  statute: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  state: string = 'US',
  balance: number = 0
): DamagesProfile {
  let statutoryMin = 100;
  let statutoryMax = 1000;
  let actualEst = 500;
  let punitiveEst = 0;
  let attorneyEst = 1500;

  const isFDCPA = statute.includes('1692');
  const isFCRA = statute.includes('1681');
  const isECOA = statute.includes('1691');

  // 1. Compute Federal Statutory Limits
  if (isFDCPA) {
    statutoryMin = 100;
    statutoryMax = 1000; // FDCPA cap per action
  } else if (isFCRA) {
    statutoryMin = 100;
    statutoryMax = 1000; // FCRA willful range per violation
  } else if (isECOA) {
    statutoryMin = 500;
    statutoryMax = 10000; // ECOA cap
  }

  // 2. Adjust based on severity & balance
  if (severity === 'critical') {
    actualEst = Math.max(2500, Math.round(balance * 0.25));
    punitiveEst = Math.max(5000, Math.round(balance * 0.5));
    attorneyEst = 5000;
  } else if (severity === 'high') {
    actualEst = Math.max(1000, Math.round(balance * 0.15));
    punitiveEst = Math.max(2000, Math.round(balance * 0.25));
    attorneyEst = 3500;
  } else if (severity === 'medium') {
    actualEst = 500;
    punitiveEst = 500;
    attorneyEst = 2000;
  } else {
    actualEst = 100;
    punitiveEst = 0;
    attorneyEst = 1000;
  }

  // 3. Layer on State multipliers if applicable
  const stateSpec = getStateDamages(state);
  let stateDamagesMin = 0;
  let stateDamagesMax = 0;
  if (stateSpec) {
    stateDamagesMin = stateSpec.statutoryMin;
    stateDamagesMax = stateSpec.statutoryMax;
    
    // Treble actual damages if state permits and severity is critical
    if (stateSpec.allowsTreble && severity === 'critical') {
      actualEst = actualEst * 3;
    }
  }

  const statutoryDamagesMin = statutoryMin + stateDamagesMin;
  const statutoryDamagesMax = statutoryMax + stateDamagesMax;

  const totalDamagesMin = statutoryDamagesMin + actualEst + punitiveEst + attorneyEst;
  const totalDamagesMax = statutoryDamagesMax + actualEst + punitiveEst + attorneyEst;

  return {
    statutoryDamagesMin,
    statutoryDamagesMax,
    actualDamagesEst: actualEst,
    punitiveDamagesEst: punitiveEst,
    attorneyFeesEst: attorneyEst,
    totalDamagesMin,
    totalDamagesMax
  };
}
