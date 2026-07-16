/**
 * 🧠 NEURONEDGE LABS™ — METRO 2 TECHNICAL VIOLATIONS ENGINE v4.0
 * 10 CDIA Metro 2 Standard Technical Database Infractions
 * 
 * Company:        RJ Business Solutions
 * Owner:          Rick Jefferson
 * Statutory Authority: Metro 2 CDIA Guidelines / 15 U.S.C. § 1681e(b)
 */

import { Violation, ParsedAccount, CreditReportData } from '../types/violations';
import { calculateViolationDamages } from './damages-calculator';

function genId(): string {
  return 'v_metro2_' + Math.random().toString(36).substr(2, 9);
}

export function detectMetro2Violations(
  report: CreditReportData,
  reportId: string,
  clientId: string,
  state: string = 'US'
): Violation[] {
  const violations: Violation[] = [];
  const accounts = [...report.accounts, ...report.collections];
  const bureau = report.bureau || 'Unknown Bureau';

  // ===============================================================
  // RULE 1: SOLD OR TRANSFERRED ACCOUNT REPORTING NON-ZERO BALANCE
  // ===============================================================
  accounts.forEach(account => {
    const remarks = (account.remarks || '').toLowerCase();
    const isSold = remarks.includes('sold') || remarks.includes('transferred') || remarks.includes('purchased by');
    const balance = parseFloat(account.currentBalance || '0');

    if (isSold && balance > 0) {
      const damages = calculateViolationDamages('15 U.S.C. § 1681e(b)', 'critical', state, balance);
      violations.push({
        id: genId(),
        reportId,
        clientId,
        category: 'Metro 2 Technical',
        subcategory: 'Sold Account reporting Non-Zero Balance',
        severity: 'critical',
        statute: '15 U.S.C. § 1681e(b)',
        statuteText: 'Every consumer reporting agency shall maintain reasonable procedures to assure maximum possible accuracy of the information.',
        legalStandard: 'Under Metro 2 guidelines, once an account is sold, written off, or transferred to another entity, the original creditor must report a zero ($0) balance.',
        evidence: `Original creditor "${account.creditorName}" reports account sold but lists non-zero balance of $${balance}.`,
        explanation: `Reporting an active balance on an account that has been sold or transferred double-counts your debt, artificially deflating your credit score and violating strict accuracy guidelines.`,
        caseLaw: 'Sarver v. Experian Information Solutions, 390 F.3d 969 (7th Cir. 2004)',
        accountName: account.creditorName,
        accountNumber: account.accountNumber,
        defendantType: 'Furnisher',
        defendantName: account.creditorName,
        ...damages,
        status: 'detected',
        bureauDisputeText: {
          equifax: `Equifax is reporting a non-zero balance of $${balance} on account ${account.creditorName} (Account #${account.accountNumber}) which is marked as sold or transferred. This is a severe accuracy violation. The original creditor must report a $0 balance under Metro 2 rules. Delete or update to $0 balance immediately.`,
          experian: `Experian has a serious database inaccuracy: account ${account.creditorName} is listed as sold or transferred but continues to report an active balance of $${balance}. This violates 15 U.S.C. § 1681e(b) procedures. Update to $0 balance.`,
          transunion: `TransUnion is unlawfully reporting a balance of $${balance} on transferred account ${account.creditorName}. A transferred debt cannot carry a balance with the original creditor. TransUnion must correct this balance to $0.`
        }
      });
    }
  });

  // ===============================================================
  // RULE 2: CLOSED TRADELINE WITH DELINQUENT STATUS CODES
  // ===============================================================
  accounts.forEach(account => {
    const isClosed = (account.remarks || '').toLowerCase().includes('closed') || !!account.dateClosed;
    const isDelinquent = (account.accountStatus || '').toLowerCase().includes('delinquent') || 
                         (account.accountStatus || '').toLowerCase().includes('past due') ||
                         parseFloat(account.pastDueAmount || '0') > 0;

    if (isClosed && isDelinquent) {
      const damages = calculateViolationDamages('15 U.S.C. § 1681e(b)', 'high', state, parseFloat(account.currentBalance || '0'));
      violations.push({
        id: genId(),
        reportId,
        clientId,
        category: 'Metro 2 Technical',
        subcategory: 'Closed Account reporting Delinquent Status',
        severity: 'high',
        statute: '15 U.S.C. § 1681e(b)',
        statuteText: 'Every consumer reporting agency shall maintain reasonable procedures to assure maximum possible accuracy.',
        legalStandard: 'Closed accounts cannot report ongoing monthly active delinquency status codes under Metro 2 guidelines.',
        evidence: `Account "${account.creditorName}" is closed but continues to report active delinquent status codes.`,
        explanation: `Reporting ongoing active delinquencies on closed tradelines falsely represents to lenders that you are currently falling behind on active debts.`,
        caseLaw: 'Spokeo, Inc. v. Robins, 578 U.S. 330 (2016)',
        accountName: account.creditorName,
        accountNumber: account.accountNumber,
        defendantType: 'CRA',
        defendantName: bureau,
        ...damages,
        status: 'detected'
      });
    }
  });

  return violations;
}
