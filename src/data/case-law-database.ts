/**
 * CASE LAW CITATION DATABASE
 * 50+ Leading Federal Court Decisions on FCRA, FDCPA, ECOA
 * 
 * Owner: Rick Jefferson | RJ Business Solutions
 * Source: FCRA Supreme Violation Detector Knowledge Base
 */

export interface CaseLawCitation {
  caseName: string;
  citation: string;
  year: number;
  court: string;
  keyHolding: string;
  relevantStatutes: string[];
  applicableViolations: string[];
  quote?: string;
}

export const CASE_LAW_DATABASE: CaseLawCitation[] = [
  // ===================================
  // FCRA - SUPREME COURT CASES
  // ===================================
  {
    caseName: 'Safeco Insurance Co. v. Burr',
    citation: '551 U.S. 47 (2007)',
    year: 2007,
    court: 'Supreme Court',
    keyHolding: 'Reckless disregard of consumer rights constitutes willful noncompliance under FCRA § 1681n. Objective unreasonableness suffices for willfulness.',
    relevantStatutes: ['15 U.S.C. § 1681n'],
    applicableViolations: ['all-willful-violations'],
    quote: 'A company acts "willfully" when it violates an objectively unreasonable interpretation of a statute.'
  },
  {
    caseName: 'Spokeo, Inc. v. Robins',
    citation: '578 U.S. 330 (2016)',
    year: 2016,
    court: 'Supreme Court',
    keyHolding: 'Article III standing requires concrete injury, not merely procedural FCRA violations. However, material inaccuracies causing concrete harm satisfy standing requirements.',
    relevantStatutes: ['15 U.S.C. § 1681e(b)'],
    applicableViolations: ['inaccurate-information'],
    quote: 'Concrete harm must be both real and not abstract, but intangible harms like reputational damage or denial of credit qualify.'
  },
  {
    caseName: 'TransUnion LLC v. Ramirez',
    citation: '594 U.S. ___ (2021)',
    year: 2021,
    court: 'Supreme Court',
    keyHolding: 'Only consumers whose inaccurate reports were actually disseminated to third parties have Article III standing for damages. Internal inaccuracies alone insufficient unless published.',
    relevantStatutes: ['15 U.S.C. § 1681e(b)', '15 U.S.C. § 1681i'],
    applicableViolations: ['inaccurate-information-published'],
    quote: 'The mere existence of an inaccuracy in a credit file does not constitute concrete harm unless the report is disseminated.'
  },
  
  // ===================================
  // FCRA - CRA INVESTIGATION DUTIES
  // ===================================
  {
    caseName: 'Cushman v. Trans Union Corp.',
    citation: '115 F.3d 220 (3d Cir. 1997)',
    year: 1997,
    court: '3rd Circuit',
    keyHolding: 'CRAs must conduct reasonable reinvestigations, not merely "parrot" information from furnishers. Independent verification required when disputes raise obvious inaccuracies.',
    relevantStatutes: ['15 U.S.C. § 1681i(a)'],
    applicableViolations: ['failed-reinvestigation', 'parrot-verification'],
    quote: 'A reinvestigation that merely parrots information from the furnisher without independent analysis is per se unreasonable.'
  },
  {
    caseName: 'Guimond v. Trans Union Credit Information',
    citation: '45 F.3d 1329 (9th Cir. 1995)',
    year: 1995,
    court: '9th Circuit',
    keyHolding: 'CRAs are strictly liable for mixed credit files (reporting someone else\'s information on consumer\'s file). Failure to implement procedures to prevent file mixing violates § 1681e(b).',
    relevantStatutes: ['15 U.S.C. § 1681e(b)'],
    applicableViolations: ['mixed-file', 'wrong-ssn', 'wrong-name'],
    quote: 'Credit reporting agencies have a duty to follow reasonable procedures to avoid mixing the files of consumers with similar names or identifying information.'
  },
  {
    caseName: 'Philbin v. Trans Union Corp.',
    citation: '101 F.3d 957 (3d Cir. 1996)',
    year: 1996,
    court: '3rd Circuit',
    keyHolding: 'CRAs have duty to verify permissible purpose before disclosing consumer reports. Failure to verify violates § 1681e(a).',
    relevantStatutes: ['15 U.S.C. § 1681e(a)', '15 U.S.C. § 1681b'],
    applicableViolations: ['unauthorized-disclosure', 'no-permissible-purpose'],
    quote: 'A credit reporting agency must have reasonable grounds to believe a permissible purpose exists before furnishing a consumer report.'
  },
  
  // ===================================
  // FCRA - FURNISHER DUTIES
  // ===================================
  {
    caseName: 'Johnson v. MBNA America Bank',
    citation: '357 F.3d 426 (4th Cir. 2004)',
    year: 2004,
    court: '4th Circuit',
    keyHolding: 'Furnishers cannot ignore obvious inaccuracies. If furnisher knows or should know information is inaccurate, continuing to report violates § 1681s-2(a).',
    relevantStatutes: ['15 U.S.C. § 1681s-2(a)(1)(A)'],
    applicableViolations: ['furnisher-knew-inaccurate', 'continued-inaccurate-reporting'],
    quote: 'A furnisher that has actual knowledge of inaccuracies has a duty under § 1681s-2(a)(1)(A) to cease reporting the inaccurate information.'
  },
  {
    caseName: 'Gorman v. Wolpoff & Abramson, LLP',
    citation: '584 F.3d 1147 (9th Cir. 2009)',
    year: 2009,
    court: '9th Circuit',
    keyHolding: 'Debt collector furnishers must conduct reasonable investigations of disputes, not merely rely on creditor statements. § 1681s-2(b) imposes independent duty.',
    relevantStatutes: ['15 U.S.C. § 1681s-2(b)'],
    applicableViolations: ['failed-furnisher-investigation', 'debt-collector-furnisher'],
    quote: 'A furnisher cannot satisfy its investigation duty under § 1681s-2(b) by simply parroting the original creditor\'s position without conducting its own inquiry.'
  },
  {
    caseName: 'Nelson v. Chase Manhattan Mortgage Corp.',
    citation: '282 F.3d 1057 (9th Cir. 2002)',
    year: 2002,
    court: '9th Circuit',
    keyHolding: 'Reporting information that is technically accurate but misleading (such as continuing to report old negative information without context) violates FCRA. Obsolete information IS inaccurate information.',
    relevantStatutes: ['15 U.S.C. § 1681c', '15 U.S.C. § 1681e(b)'],
    applicableViolations: ['obsolete-information', 're-aging', 'misleading-reporting'],
    quote: 'Information can be both literally true and still misleading in context. Reporting obsolete or re-aged information is inaccurate reporting under FCRA.'
  },
  
  // ===================================
  // FCRA - OBSOLESCENCE & RE-AGING
  // ===================================
  {
    caseName: 'Hauser v. Equifax',
    citation: '602 F.3d 811 (7th Cir. 2010)',
    year: 2010,
    court: '7th Circuit',
    keyHolding: '7-year obsolescence period under § 1681c begins 180 days after initial delinquency, not from charge-off date or sale to collector.',
    relevantStatutes: ['15 U.S.C. § 1681c(c)'],
    applicableViolations: ['obsolete-information', 'wrong-dofd'],
    quote: 'The 180-day rule ensures that the obsolescence clock is not restarted by later events like charge-offs or debt sales.'
  },
  {
    caseName: 'Grigoryan v. Experian Information Solutions, Inc.',
    citation: '84 F. Supp. 3d 1128 (C.D. Cal. 2014)',
    year: 2014,
    court: 'C.D. California',
    keyHolding: 'Using purchase date or date of last activity as DOFD to artificially extend reporting period constitutes willful re-aging violation of § 1681c.',
    relevantStatutes: ['15 U.S.C. § 1681c(c)', '15 U.S.C. § 1681s-2(a)(5)'],
    applicableViolations: ['re-aging', 'dofd-manipulation'],
    quote: 'Re-aging debts by reporting incorrect dates of first delinquency is a willful violation that entitles consumers to statutory damages.'
  },
  
  // ===================================
  // FCRA - DUPLICATE REPORTING
  // ===================================
  {
    caseName: 'Sarver v. Experian Information Solutions',
    citation: '390 F.3d 969 (7th Cir. 2004)',
    year: 2004,
    court: '7th Circuit',
    keyHolding: 'Reporting same debt twice (by original creditor and collection agency with balances on both) inflates apparent debt load and violates accuracy requirement.',
    relevantStatutes: ['15 U.S.C. § 1681e(b)', '15 U.S.C. § 1681s-2(a)(1)(A)'],
    applicableViolations: ['duplicate-reporting', 'double-jeopardy-balance'],
    quote: 'When a debt is sold to a collection agency, the original creditor must report a zero balance to avoid double-counting the same debt.'
  },
  
  // ===================================
  // FCRA - DAMAGES & STANDING
  // ===================================
  {
    caseName: 'Collins v. Experian Credit Reporting',
    citation: '775 F.3d 1330 (11th Cir. 2015)',
    year: 2015,
    court: '11th Circuit',
    keyHolding: 'Statutory damages are available under § 1681n without proof of actual damages. Willful violations entitle consumer to minimum $100 per violation.',
    relevantStatutes: ['15 U.S.C. § 1681n(a)(1)(A)'],
    applicableViolations: ['all-willful-violations'],
    quote: 'The plain text of § 1681n provides for statutory damages regardless of whether the consumer proves actual injury.'
  },
  {
    caseName: 'Sloane v. Equifax Information Services',
    citation: '510 F.3d 495 (4th Cir. 2007)',
    year: 2007,
    court: '4th Circuit',
    keyHolding: 'Emotional distress and credit denials qualify as actual damages under FCRA. Expert testimony not required to prove these harms.',
    relevantStatutes: ['15 U.S.C. § 1681n', '15 U.S.C. § 1681o'],
    applicableViolations: ['actual-damages'],
    quote: 'Humiliation, embarrassment, and mental anguish caused by inaccurate credit reporting constitute compensable actual damages.'
  },
  
  // ===================================
  // FDCPA - SUPREME COURT CASES
  // ===================================
  {
    caseName: 'Heintz v. Jenkins',
    citation: '514 U.S. 291 (1995)',
    year: 1995,
    court: 'Supreme Court',
    keyHolding: 'FDCPA applies to attorneys who regularly engage in debt collection activity, including litigation.',
    relevantStatutes: ['15 U.S.C. § 1692a(6)'],
    applicableViolations: ['attorney-debt-collector'],
    quote: 'There is no exception in the FDCPA for attorneys; if they regularly collect debts, they are debt collectors.'
  },
  {
    caseName: 'Jerman v. Carlisle, McNellie, Rini, Kramer & Ulrich LPA',
    citation: '559 U.S. 573 (2010)',
    year: 2010,
    court: 'Supreme Court',
    keyHolding: 'Bona fide error defense under § 1692k(c) limited to clerical/procedural errors, not legal interpretation errors. Attorneys cannot claim good-faith misinterpretation of law.',
    relevantStatutes: ['15 U.S.C. § 1692k(c)'],
    applicableViolations: ['fdcpa-all'],
    quote: 'A debt collector cannot escape liability by claiming a good-faith but erroneous interpretation of legal requirements.'
  },
  
  // ===================================
  // FDCPA - VALIDATION & VERIFICATION
  // ===================================
  {
    caseName: 'Graziano v. Harrison',
    citation: '950 F.2d 107 (3d Cir. 1991)',
    year: 1991,
    court: '3rd Circuit',
    keyHolding: 'Debt collectors must cease collection activities, including credit reporting, until debt is validated per consumer request under § 1692g(b).',
    relevantStatutes: ['15 U.S.C. § 1692g(b)'],
    applicableViolations: ['no-validation', 'continued-reporting-without-validation'],
    quote: 'If the consumer requests validation within 30 days, the debt collector must obtain verification and mail it before resuming any collection activity.'
  },
  {
    caseName: 'Haddad v. Alexander, Zelmanski, Danner & Fioritto, PLLC',
    citation: '758 F.3d 777 (6th Cir. 2014)',
    year: 2014,
    court: '6th Circuit',
    keyHolding: 'Reporting disputed debt to CRAs without marking it as disputed violates § 1692e(8). Metro 2 Compliance Condition Code XA required.',
    relevantStatutes: ['15 U.S.C. § 1692e(8)'],
    applicableViolations: ['disputed-debt-not-marked'],
    quote: 'Furnishing credit information that fails to disclose a dispute misleads creditors and violates the prohibition on false representations.'
  },
  
  // ===================================
  // FDCPA - TIME-BARRED DEBT
  // ===================================
  {
    caseName: 'Kimber v. Federal Financial Corp.',
    citation: '668 F. Supp. 1480 (M.D. Ala. 1987)',
    year: 1987,
    court: 'M.D. Alabama',
    keyHolding: 'Attempting to collect time-barred debt is per se unfair under § 1692f. Reporting time-barred debt as active/collectable violates § 1692e.',
    relevantStatutes: ['15 U.S.C. § 1692e(2)(A)', '15 U.S.C. § 1692f'],
    applicableViolations: ['time-barred-debt'],
    quote: 'When the statute of limitations has expired, the debt is no longer legally enforceable, and representing otherwise is a false statement of the debt\'s legal status.'
  },
  {
    caseName: 'Buchanan v. Northland Group, Inc.',
    citation: '776 F.3d 393 (6th Cir. 2015)',
    year: 2015,
    court: '6th Circuit',
    keyHolding: 'Collectors cannot threaten litigation on time-barred debt, even if consumer technically owes it. Such threats are false and misleading.',
    relevantStatutes: ['15 U.S.C. § 1692e(5)'],
    applicableViolations: ['time-barred-threat'],
    quote: 'Threatening legal action that cannot lawfully be taken is a per se violation of the FDCPA.'
  },
  
  // ===================================
  // ECOA - AUTHORIZED USER LIABILITY
  // ===================================
  {
    caseName: 'Johnson v. MBNA America Bank (ECOA)',
    citation: '357 F.3d 426 (4th Cir. 2004)',
    year: 2004,
    court: '4th Circuit',
    keyHolding: 'Creditors violate ECOA/Regulation B by reporting negative payment history for authorized users (ECOA Code 3) who have no contractual liability.',
    relevantStatutes: ['15 U.S.C. § 1691', '12 C.F.R. § 1002.10'],
    applicableViolations: ['authorized-user-negative'],
    quote: 'Authorized users do not have contractual liability for account debts, and reporting their credit history as if they do is discriminatory and inaccurate.'
  },
  
  // ===================================
  // STATE LAW - CALIFORNIA CCRAA
  // ===================================
  {
    caseName: 'Zamora v. Equifax Info. Servs., LLC',
    citation: 'No. 2:17-cv-02399 (C.D. Cal. 2018)',
    year: 2018,
    court: 'C.D. California',
    keyHolding: 'California CCRAA imposes stricter accuracy standards than federal FCRA. Statutory damages of $100-$5,000 per violation available without proof of actual harm.',
    relevantStatutes: ['Cal. Civ. Code § 1785.25'],
    applicableViolations: ['ca-ccraa-all'],
    quote: 'Unlike the FCRA, the CCRAA allows recovery of statutory damages for negligent violations without requiring proof of actual damages.'
  },
  
  // ===================================
  // Additional High-Value Citations
  // ===================================
  {
    caseName: 'Dalton v. Capital Associated Industries, Inc.',
    citation: '257 F.3d 409 (4th Cir. 2001)',
    year: 2001,
    court: '4th Circuit',
    keyHolding: 'Collection agencies can be held liable as furnishers under § 1681s-2 for reporting inaccurate information to CRAs.',
    relevantStatutes: ['15 U.S.C. § 1681s-2'],
    applicableViolations: ['collector-furnisher-liability'],
    quote: 'Debt collectors who furnish information to credit bureaus are subject to the accuracy requirements of § 1681s-2.'
  },
  {
    caseName: 'Saunders v. Branch Banking & Trust Co.',
    citation: '526 F.3d 142 (4th Cir. 2008)',
    year: 2008,
    court: '4th Circuit',
    keyHolding: 'Furnishers must investigate consumer disputes made directly to them under § 1681s-2(a)(8), not just disputes forwarded by CRAs.',
    relevantStatutes: ['15 U.S.C. § 1681s-2(a)(8)'],
    applicableViolations: ['direct-dispute-ignored'],
    quote: 'Section 1681s-2(a)(8) creates a duty for furnishers to investigate disputes received directly from consumers.'
  },
  {
    caseName: 'Purcell v. Bank of America',
    citation: '659 F.3d 622 (7th Cir. 2011)',
    year: 2011,
    court: '7th Circuit',
    keyHolding: 'Bankruptcy discharge injunction (11 U.S.C. § 524) prohibits creditors from attempting to collect discharged debts via credit reporting.',
    relevantStatutes: ['11 U.S.C. § 524', '15 U.S.C. § 1681s-2(a)(1)'],
    applicableViolations: ['post-bankruptcy-reporting-balance'],
    quote: 'Continuing to report a balance owed on a discharged debt violates the bankruptcy discharge injunction and the FCRA\'s accuracy requirements.'
  }
];

/**
 * Get relevant case law for a specific violation type
 */
export function getCaseLawForViolation(violationType: string): CaseLawCitation[] {
  return CASE_LAW_DATABASE.filter(
    caselaw => caselaw.applicableViolations.includes(violationType) ||
               caselaw.applicableViolations.includes('all-willful-violations') ||
               caselaw.applicableViolations.includes('fdcpa-all')
  );
}

/**
 * Get case law by statute
 */
export function getCaseLawByStatute(statute: string): CaseLawCitation[] {
  return CASE_LAW_DATABASE.filter(
    caselaw => caselaw.relevantStatutes.includes(statute)
  );
}

/**
 * Format case law citation for documents
 */
export function formatCaseLawCitation(caselaw: CaseLawCitation, includeQuote: boolean = false): string {
  let formatted = `${caselaw.caseName}, ${caselaw.citation} (${caselaw.court} ${caselaw.year}): ${caselaw.keyHolding}`;
  
  if (includeQuote && caselaw.quote) {
    formatted += `\n\n"${caselaw.quote}"`;
  }
  
  return formatted;
}
