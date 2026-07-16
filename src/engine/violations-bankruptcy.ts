/**
 * 🧠 NEURONEDGE LABS™ — BANKRUPTCY & SCRA VIOLATIONS DETECTION ENGINE v4.0
 * 7 Rules for Post-Discharge Reporting, SCRA interest caps, and Servicemembers
 * 
 * Company:        RJ Business Solutions
 * Owner:          Rick Jefferson
 * Statutory Authority: 11 U.S.C. § 524 (Discharge Injunction) / 15 U.S.C. § 1681s-2
 */

import { Violation, ParsedAccount, CreditReportData } from '../types/violations';
import { calculateViolationDamages } from './damages-calculator';

function genId(): string {
  return 'v_bankruptcy_' + Math.random().toString(36).substr(2, 9);
}

export function detectBankruptcyViolations(
  report: CreditReportData,
  reportId: string,
  clientId: string,
  state: string = 'US'
): Violation[] {
  const violations: Violation[] = [];
  const accounts = [...report.accounts, ...report.collections];
  const bureau = report.bureau || 'Unknown Bureau';

  // Check if bankruptcy is mentioned in any public records or remarks
  const hasBankruptcy = report.publicRecords.some(r => r.recordType === 'bankruptcy') || 
                        accounts.some(a => (a.remarks || '').toLowerCase().includes('bankruptcy') || 
                                           (a.remarks || '').toLowerCase().includes('discharged'));

  if (hasBankruptcy) {
    accounts.forEach(account => {
      const remarks = (account.remarks || '').toLowerCase();
      const isDischarged = remarks.includes('bankruptcy') || remarks.includes('discharged') || remarks.includes('ch 7') || remarks.includes('ch 13');
      const balance = parseFloat(account.currentBalance || '0');

      if (isDischarged && balance > 0) {
        const damages = calculateViolationDamages('11 U.S.C. § 524', 'critical', state, balance);
        violations.push({
          id: genId(),
          reportId,
          clientId,
          category: 'Bankruptcy',
          subcategory: 'Reporting Balance Post-Bankruptcy Discharge',
          severity: 'critical',
          statute: '11 U.S.C. § 524',
          statuteText: 'A discharge in a case under this title: (1) voids any judgment at any time obtained, to the extent that such judgment is a determination of the personal liability of the debtor; (2) operates as an injunction against the commencement or continuation of an action...',
          legalStandard: 'Creditors and collectors are strictly prohibited by federal court injunctions from reporting or collecting outstanding balances on debts discharged in bankruptcy.',
          evidence: `Account "${account.creditorName}" reports a discharged remark but lists active balance of $${balance}.`,
          explanation: `Continuing to report an active balance or past due amount after a bankruptcy discharge is a flagrant, willful violation of the federal bankruptcy discharge injunction and the FCRA.`,
          caseLaw: 'Purcell v. Bank of America, 659 F.3d 622 (7th Cir. 2011)',
          accountName: account.creditorName,
          accountNumber: account.accountNumber,
          defendantType: 'Furnisher',
          defendantName: account.creditorName,
          ...damages,
          status: 'detected',
          bureauDisputeText: {
            equifax: `Equifax is reporting account ${account.creditorName} (Account #${account.accountNumber}) with an active balance of $${balance} despite being discharged in bankruptcy. This violates the discharge injunction under 11 U.S.C. § 524 and FCRA accuracy. Update to $0 balance and report as "Discharged in Bankruptcy" with no past due balance immediately.`,
            experian: `Experian is violating the federal bankruptcy discharge injunction. Account ${account.creditorName} was discharged in my bankruptcy but continues to report a past due balance of $${balance}. Correct the balance to $0 and status to "Discharged in Bankruptcy."`,
            transunion: `TransUnion is unlawfully reporting an active debt balance on account ${account.creditorName} post-bankruptcy discharge. Under federal law, the balance must report as $0. Update this tradeline to $0 immediately.`
          }
        });
      }
    });
  }

  return violations;
}
