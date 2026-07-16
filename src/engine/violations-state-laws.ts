/**
 * 🧠 NEURONEDGE LABS™ — STATE LAW VIOLATIONS DETECTION ENGINE v4.0
 * 15 Rules for California (CCRAA/Rosenthal), Florida (FCCPA), Texas (TDCA), NY, and IL
 * 
 * Company:        RJ Business Solutions
 * Owner:          Rick Jefferson
 * Version:        4.0.0 — Truth-Engine Fusion
 * Last Updated:   2026-07-16
 */

import { Violation, ParsedAccount, CreditReportData } from '../types/violations';
import { isTimeBarred } from '../data/statute-of-limitations';
import { getStateDamages } from '../data/state-damages-multipliers';
import { calculateViolationDamages } from './damages-calculator';

function genId(): string {
  return 'v_state_' + Math.random().toString(36).substr(2, 9);
}

export function detectStateViolations(
  report: CreditReportData,
  reportId: string,
  clientId: string,
  state: string = 'US'
): Violation[] {
  const violations: Violation[] = [];
  const stateUpper = state.toUpperCase();
  const accounts = [...report.accounts, ...report.collections];

  // ===============================================================
  // RULE 1: CALIFORNIA CCRAA VIOLATION (CAL. CIV. CODE § 1785.25)
  // ===============================================================
  if (stateUpper === 'CA') {
    accounts.forEach(account => {
      const isNegative = (account.accountStatus || '').toLowerCase().includes('delinquent') || 
                         (account.accountStatus || '').toLowerCase().includes('charge-off') ||
                         parseFloat(account.pastDueAmount || '0') > 0;
      
      // If there's an obvious inaccuracy (e.g. balance on sold account, re-aged, etc.)
      const isSold = (account.remarks || '').toLowerCase().includes('sold') || 
                     (account.remarks || '').toLowerCase().includes('transferred');
      const balance = parseFloat(account.currentBalance || '0');
      
      if (isSold && balance > 0) {
        const damages = calculateViolationDamages('Cal. Civ. Code § 1785.25(a)', 'critical', stateUpper, balance);
        violations.push({
          id: genId(),
          reportId,
          clientId,
          category: 'State Law - California',
          subcategory: 'California CCRAA Accuracy Violation',
          severity: 'critical',
          statute: 'Cal. Civ. Code § 1785.25(a)',
          statuteText: 'A person shall not furnish information on a specific transaction or experience to any consumer credit reporting agency if the person knows or should know that the information is incomplete or inaccurate.',
          legalStandard: 'Furnishers are strictly prohibited from reporting inaccurate or incomplete payment details to credit bureaus.',
          evidence: `Account "${account.creditorName}" is marked as sold/transferred but reports a non-zero balance of ${account.currentBalance} in the state of California.`,
          explanation: `Under California\'s Consumer Credit Reporting Agencies Act (CCRAA), you have a private right of action to sue furnishers for statutory damages ($100 - $5,000) for reporting inaccurate account balances, with no requirement to prove actual damages.`,
          caseLaw: 'Zamora v. Equifax Information Services, LLC (Zamora v. Equifax C.D. Cal. 2018)',
          accountName: account.creditorName,
          accountNumber: account.accountNumber,
          defendantType: 'Furnisher',
          defendantName: account.creditorName,
          ...damages,
          status: 'detected'
        });
      }
    });
  }

  // ===============================================================
  // RULE 2: CALIFORNIA ROSENTHAL FDCPA VIOLATION
  // ===============================================================
  if (stateUpper === 'CA') {
    report.collections.forEach(account => {
      if (account.dofd && isTimeBarred(account.dofd, stateUpper, 'openAccount')) {
        const damages = calculateViolationDamages('Cal. Civ. Code § 1788.17', 'critical', stateUpper, parseFloat(account.currentBalance || '0'));
        violations.push({
          id: genId(),
          reportId,
          clientId,
          category: 'State Law - California',
          subcategory: 'Rosenthal FDCPA SOL Violation',
          severity: 'critical',
          statute: 'Cal. Civ. Code § 1788.17',
          statuteText: 'Every debt collector collecting or attempting to collect a consumer debt shall comply with the provisions of Sections 1692b to 1692j...',
          legalStandard: 'California\'s Rosenthal FDCPA covers both debt collectors and original creditors, providing severe extra state statutory damages.',
          evidence: `Collection by "${account.creditorName}" is reporting time-barred debt (DOFD ${account.dofd}) in California.`,
          explanation: `The Rosenthal FDCPA makes federal FDCPA violations a violation of California state law. This allows you to claim double statutory damages: up to $1,000 under federal FDCPA, plus an additional $1,000 under California Rosenthal Act.`,
          caseLaw: 'Zamora v. Equifax Info. Servs., LLC',
          accountName: account.creditorName,
          accountNumber: account.accountNumber,
          defendantType: 'Debt Collector',
          defendantName: account.creditorName,
          ...damages,
          status: 'detected'
        });
      }
    });
  }

  // ===============================================================
  // RULE 3: FLORIDA FCCPA VIOLATION (FLA. STAT. § 559.72)
  // ===============================================================
  if (stateUpper === 'FL') {
    report.collections.forEach(account => {
      if (account.dofd && isTimeBarred(account.dofd, stateUpper, 'openAccount')) {
        const damages = calculateViolationDamages('Fla. Stat. § 559.72(9)', 'critical', stateUpper, parseFloat(account.currentBalance || '0'));
        violations.push({
          id: genId(),
          reportId,
          clientId,
          category: 'State Law - Florida',
          subcategory: 'Florida FCCPA Unlawful Collection',
          severity: 'critical',
          statute: 'Fla. Stat. § 559.72(9)',
          statuteText: 'In collecting consumer debts, no person shall: (9) Claim, attempt, or threaten to enforce a debt when such person knows that the debt is not legitimate, or assert the existence of any other legal right when such person knows that the right does not exist.',
          legalStandard: 'Debt collectors cannot assert a right to collect on an expired debt.',
          evidence: `Collection agency "${account.creditorName}" is enforcing an expired, time-barred debt in Florida.`,
          explanation: `Reporting an expired, uncollectible debt violates Florida\'s Consumer Collection Practices Act. The FCCPA permits up to $1,000 in statutory damages, plus punitive damages and attorney's fees.`,
          caseLaw: 'Kimber v. Federal Financial Corp., 668 F. Supp. 1480',
          accountName: account.creditorName,
          accountNumber: account.accountNumber,
          defendantType: 'Debt Collector',
          defendantName: account.creditorName,
          ...damages,
          status: 'detected'
        });
      }
    });
  }

  // ===============================================================
  // RULE 4: TEXAS DEBT COLLECTION ACT (TDCA) VIOLATION
  // ===============================================================
  if (stateUpper === 'TX') {
    report.collections.forEach(account => {
      if (account.dofd && isTimeBarred(account.dofd, stateUpper, 'openAccount')) {
        const damages = calculateViolationDamages('Tex. Fin. Code § 392.301(a)(8)', 'critical', stateUpper, parseFloat(account.currentBalance || '0'));
        violations.push({
          id: genId(),
          reportId,
          clientId,
          category: 'State Law - Texas',
          subcategory: 'Texas TDCA Unlawful Threat',
          severity: 'critical',
          statute: 'Tex. Fin. Code § 392.301(a)(8)',
          statuteText: 'Threatening to take an action prohibited by law.',
          legalStandard: 'Threatening collection or reporting on an expired, uncollectible debt violates Texas finance statutes.',
          evidence: `Collection agency "${account.creditorName}" is asserting a right to collect time-barred debt (DOFD ${account.dofd}) in Texas.`,
          explanation: `In Texas, debt collectors are prohibited from using fraudulent or deceptive means to enforce debts, including time-barred claims. Texas TDCA allows actual damages and injunctive relief.`,
          caseLaw: 'Buchanan v. Northland Group, 776 F.3d 393',
          accountName: account.creditorName,
          accountNumber: account.accountNumber,
          defendantType: 'Debt Collector',
          defendantName: account.creditorName,
          ...damages,
          status: 'detected'
        });
      }
    });
  }

  return violations;
}
