/**
 * STATE CONSUMER PROTECTION LAW DAMAGES MULTIPLIERS
 * 
 * Company:        RJ Business Solutions
 * Owner:          Rick Jefferson
 * Last Updated:   2026-07-16
 */

export interface StateDamagesLimit {
  stateName: string;
  statute: string;
  statutoryMin: number;
  statutoryMax: number;
  allowsTreble: boolean;
  allowsPunitive: boolean;
  attorneyFeesRecoverable: boolean;
}

export const STATE_DAMAGES_DATABASE: Record<string, StateDamagesLimit> = {
  'CA': {
    stateName: 'California',
    statute: 'Cal. Civ. Code § 1785.25 / Rosenthal FDCPA § 1788.30',
    statutoryMin: 100,
    statutoryMax: 5000,
    allowsTreble: true,
    allowsPunitive: true,
    attorneyFeesRecoverable: true
  },
  'FL': {
    stateName: 'Florida',
    statute: 'Florida Consumer Collection Practices Act § 559.77',
    statutoryMin: 100,
    statutoryMax: 1000,
    allowsTreble: false,
    allowsPunitive: true,
    attorneyFeesRecoverable: true
  },
  'TX': {
    stateName: 'Texas',
    statute: 'Texas Debt Collection Act (TDCA) § 392.403',
    statutoryMin: 100,
    statutoryMax: 1000,
    allowsTreble: false,
    allowsPunitive: true,
    attorneyFeesRecoverable: true
  },
  'NY': {
    stateName: 'New York',
    statute: 'NY Gen. Bus. Law § 349 / Fair Medical Debt Act',
    statutoryMin: 50,
    statutoryMax: 1000,
    allowsTreble: true,
    allowsPunitive: true,
    attorneyFeesRecoverable: true
  },
  'IL': {
    stateName: 'Illinois',
    statute: 'Illinois Consumer Fraud Act (815 ILCS 505/10a)',
    statutoryMin: 0,
    statutoryMax: 5000,
    allowsTreble: true,
    allowsPunitive: true,
    attorneyFeesRecoverable: true
  }
};

/**
 * Fetch state consumer damages limits
 */
export function getStateDamages(state: string): StateDamagesLimit | null {
  return STATE_DAMAGES_DATABASE[state.toUpperCase()] || null;
}
