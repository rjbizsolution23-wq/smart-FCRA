/**
 * Billing is not an isolated Stripe toggle.
 * CLIENT → STATE → SERVICE → CHANNEL → CONTRACT → TSR → CROA → COMPLETION → BILLABLE?
 */

export type BillingDecision = 'ALLOW' | 'BLOCK' | 'MANUAL_REVIEW';

export type BillingEvalInput = {
  clientState?: string;
  companyState?: string;
  serviceType: string;
  salesChannel: 'ONLINE' | 'TELEMARKETED' | 'IN_PERSON' | 'OTHER';
  contractSigned: boolean;
  croaDisclosuresAcknowledged: boolean;
  serviceFullyPerformed: boolean;
  coveredCreditRepair: boolean;
  tsrApplies?: boolean;
  /** ISO timestamp the service_records completion row was written. Preferred over daysSinceCompletion. */
  serviceCompletedAt?: string | null;
  /** Pre-computed days elapsed since completion. Overrides serviceCompletedAt if both are supplied. */
  daysSinceCompletion?: number;
};

export type BillingEvalResult = {
  result: BillingDecision;
  requirements: string[];
  explanation: string[];
  policyVersion: string;
};

export const BILLING_POLICY_VERSION = '2026.08.2';

/**
 * Company billing-hold policy: on top of the statutory CROA/TSR "no charge before
 * the service is fully performed" floor, this company does not invoice or collect
 * any fee for covered credit-repair services until six (6) months (180 days) have
 * elapsed AFTER the service completion record was written. This is a voluntary,
 * stricter-than-required consumer-protection commitment stated in the CROA Service
 * Agreement (see src/data/legal-contracts.ts) and enforced here, not just on paper.
 */
export const BILLING_HOLD_DAYS_AFTER_COMPLETION = 180; // ~6 months

function computeDaysSinceCompletion(input: BillingEvalInput): number | null {
  if (typeof input.daysSinceCompletion === 'number' && Number.isFinite(input.daysSinceCompletion)) {
    return input.daysSinceCompletion;
  }
  if (input.serviceCompletedAt) {
    const completed = new Date(input.serviceCompletedAt).getTime();
    if (!Number.isNaN(completed)) {
      return Math.floor((Date.now() - completed) / (24 * 60 * 60 * 1000));
    }
  }
  return null;
}

/**
 * CROA prohibits charging for covered credit-repair services before the
 * promised service has been fully performed. TSR can add telemarketing restrictions.
 * Company policy additionally holds billing for BILLING_HOLD_DAYS_AFTER_COMPLETION
 * days after that completion is recorded (see constant above).
 */
export function evaluateBillableEvent(input: BillingEvalInput): BillingEvalResult {
  const requirements: string[] = [];
  const explanation: string[] = [];
  const tsrApplies = input.tsrApplies ?? input.salesChannel === 'TELEMARKETED';

  if (input.coveredCreditRepair && !input.contractSigned) {
    requirements.push('Written CROA contract must be signed.');
    explanation.push('CROA requires a written contract before covered credit-repair services.');
  }
  if (input.coveredCreditRepair && !input.croaDisclosuresAcknowledged) {
    requirements.push('Required credit-file-rights disclosure must be separately acknowledged.');
    explanation.push('Do not rely solely on a generic Terms & Conditions checkbox.');
  }
  if (input.coveredCreditRepair && !input.serviceFullyPerformed) {
    explanation.push('CROA prohibits charging for covered credit-repair services before the promised service is fully performed.');
    return {
      result: 'BLOCK',
      requirements: [...requirements, 'Service completion record required before billing covered credit repair.'],
      explanation,
      policyVersion: BILLING_POLICY_VERSION,
    };
  }
  if (input.coveredCreditRepair && tsrApplies && !input.serviceFullyPerformed) {
    explanation.push('The Telemarketing Sales Rule can impose additional advance-fee restrictions on telemarketed credit-repair transactions.');
    return {
      result: 'BLOCK',
      requirements: [...requirements, 'TSR advance-fee restriction: do not bill before completion when TSR applies.'],
      explanation,
      policyVersion: BILLING_POLICY_VERSION,
    };
  }
  if (input.coveredCreditRepair && input.serviceFullyPerformed) {
    const daysSince = computeDaysSinceCompletion(input);
    if (daysSince === null || daysSince < BILLING_HOLD_DAYS_AFTER_COMPLETION) {
      explanation.push(
        `Company policy: no charge or invoice for covered credit-repair services until ${BILLING_HOLD_DAYS_AFTER_COMPLETION} days (6 months) after the service completion record was written.`,
      );
      if (daysSince !== null) {
        explanation.push(`${daysSince} of ${BILLING_HOLD_DAYS_AFTER_COMPLETION} required days elapsed since completion.`);
      }
      return {
        result: 'BLOCK',
        requirements: [
          ...requirements,
          `Six-month (${BILLING_HOLD_DAYS_AFTER_COMPLETION}-day) post-completion billing hold has not elapsed.`,
        ],
        explanation,
        policyVersion: BILLING_POLICY_VERSION,
      };
    }
  }
  if (requirements.length) {
    return {
      result: 'MANUAL_REVIEW',
      requirements,
      explanation: explanation.length ? explanation : ['Missing contract or disclosure artifacts — human review required.'],
      policyVersion: BILLING_POLICY_VERSION,
    };
  }
  return {
    result: 'ALLOW',
    requirements: [],
    explanation: ['Billing event passed CROA / TSR / completion checks for this service type.'],
    policyVersion: BILLING_POLICY_VERSION,
  };
}

export function isCoveredCreditRepairService(serviceType: string): boolean {
  const t = String(serviceType || '').toLowerCase();
  if (t.includes('education') || t.includes('monitoring_connect') || t.includes('notary')) return false;
  return t.includes('credit') || t.includes('dispute') || t.includes('repair') || t.includes('analysis');
}
