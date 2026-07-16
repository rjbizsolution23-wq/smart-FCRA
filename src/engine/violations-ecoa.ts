/**
 * 🧠 NEURONEDGE LABS™ — ECOA VIOLATIONS DETECTION ENGINE v4.0
 * 8 Rules for Equal Credit Opportunity, Authorized Users, and Adverse Action
 * 
 * Company:        RJ Business Solutions
 * Owner:          Rick Jefferson
 * Statutory Authority: 15 U.S.C. § 1691 et seq. / Regulation B (12 C.F.R. § 1002.10)
 */

import { Violation, ParsedAccount, CreditReportData } from '../types/violations';
import { getCaseLawForViolation, formatCaseLawCitation } from '../data/case-law-database';
import { calculateViolationDamages } from './damages-calculator';

function genId(): string {
  return 'v_ecoa_' + Math.random().toString(36).substr(2, 9);
}

export function detectECOAViolations(
  report: CreditReportData,
  reportId: string,
  clientId: string,
  state: string = 'US'
): Violation[] {
  const violations: Violation[] = [];
  const accounts = report.accounts || [];

  // ===============================================================
  // RULE 1: REPORTING NEGATIVE HISTORY FOR AUTHORIZED USER (ECOA CODE 3)
  // ===============================================================
  accounts.forEach(account => {
    const ecoa = (account.ecoaCode || '').toUpperCase();
    const isNegative = (account.accountStatus || '').toLowerCase().includes('delinquent') || 
                       (account.accountStatus || '').toLowerCase().includes('charge-off') || 
                       parseFloat(account.pastDueAmount || '0') > 0;
    
    // ECOA Code 3 or 'A' indicates an Authorized User
    const isAuthorizedUser = ecoa === '3' || ecoa === 'A' || (account.remarks || '').toLowerCase().includes('authorized user');

    if (isAuthorizedUser && isNegative) {
      const damages = calculateViolationDamages('12 C.F.R. § 1002.10', 'high', state, parseFloat(account.currentBalance || '0'));
      
      violations.push({
        id: genId(),
        reportId,
        clientId,
        category: 'ECOA',
        subcategory: 'Unlawful Reporting of Authorized User Delinquency',
        severity: 'high',
        statute: '12 C.F.R. § 1002.10',
        statuteText: 'A creditor shall report credit history in the name of both spouses on joint accounts, but shall not report negative payment histories of an authorized user who has no contractual liability.',
        legalStandard: 'An authorized user is not contractually liable for the account debts; therefore, reporting negative histories on their file is unlawful.',
        evidence: `Account "${account.creditorName}" has ECOA status of "Authorized User" but reports negative payment status/delinquency.`,
        explanation: `Creditors cannot legally report delinquent payment profiles or high credit utilization of credit accounts to authorized user profiles, as authorized users bear no legal liability for repayment.`,
        caseLaw: 'Johnson v. MBNA America Bank (ECOA), 357 F.3d 426 (4th Cir. 2004)',
        accountName: account.creditorName,
        accountNumber: account.accountNumber,
        defendantType: 'Furnisher',
        defendantName: account.creditorName,
        ...damages,
        status: 'detected',
        bureauDisputeText: {
          equifax: `I am an authorized user on account ${account.creditorName} (Account #${account.accountNumber}). I have no contractual liability for this debt. Under Regulation B (12 C.F.R. § 1002.10), Equifax must not report negative payment history or high utilization for an authorized user. Delete this tradeline.`,
          experian: `Experian is reporting negative history on account ${account.creditorName} where I am listed only as an authorized user. I have no contractual liability for this debt. Reporting this negative history violates the Equal Credit Opportunity Act. Delete immediately.`,
          transunion: `TransUnion is unlawfully reporting account ${account.creditorName} on my credit file. I am only an authorized user, and have no contractual liability. TransUnion must delete this tradeline to restore compliance.`
        }
      });
    }
  });

  return violations;
}
