// ═══════════════════════════════════════════════════════════════════════════
// FCRA SUPREME DOCUMENT GENERATION ENGINE v3.0
// 10 Court-Ready Document Templates | Dispute · Legal · Regulatory · Request
// ═══════════════════════════════════════════════════════════════════════════

export interface DocumentData {
  clientName: string;
  clientAddress: string;
  clientCity: string;
  clientState: string;
  clientZip: string;
  clientSSNLast4?: string;
  clientDOB?: string;
  today: string;
  violations: any[];
  bureau?: string;
  creditorName?: string;
  creditorAddress?: string;
  accountNumber?: string;
  reportId?: string;
}

const BUREAU_ADDRESSES: Record<string, string> = {
  'equifax': 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374',
  'experian': 'Experian Information Solutions, Inc.\nP.O. Box 4500\nAllen, TX 75013',
  'transunion': 'TransUnion LLC\nP.O. Box 2000\nChester, PA 19016',
};

function clientBlock(data: DocumentData): string {
  return `${data.clientName}\n${data.clientAddress}\n${data.clientCity}, ${data.clientState} ${data.clientZip}`;
}

// ═══════════════════════════════════════════════════════════════
// 1. BUREAU DISPUTE LETTER (§ 611)
// ═══════════════════════════════════════════════════════════════
export function generateBureauDisputeLetter(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  const violationItems = data.violations.map((v, i) => `
ITEM ${i + 1}: ${v.accountName || v.account_name || v.defendantName || v.defendant_name} — Account #${v.accountNumber || v.account_number || 'N/A'}

  INACCURACY: ${v.subcategory}
  
  STATUTE VIOLATED: ${v.statute} (${v.statuteText || v.statute_text})
  
  FACTS: ${v.evidence}
  
  LEGAL BASIS: ${v.legalStandard || v.legal_standard}
  
  REQUIRED ACTION: Immediately delete or correct this item. If you cannot verify the accuracy of this information within 30 days, it must be permanently deleted pursuant to 15 U.S.C. § 1681i(a)(5)(A).
`).join('\n' + '='.repeat(70) + '\n');

  return `${clientBlock(data)}
${data.today}

${address}

Re: FORMAL DISPUTE — Inaccurate Information on Consumer Report
    Consumer: ${data.clientName}
${data.clientSSNLast4 ? `    SSN Last 4: XXX-XX-${data.clientSSNLast4}` : ''}
${data.clientDOB ? `    DOB: ${data.clientDOB}` : ''}

Dear Sir or Madam:

This letter is a formal dispute submitted pursuant to my rights under the Fair Credit Reporting Act ("FCRA"), 15 U.S.C. § 1681 et seq. I demand that you conduct a reasonable reinvestigation of the following items and delete or correct any information found to be inaccurate, incomplete, or unverifiable.

${'='.repeat(70)}
DISPUTED ITEMS (${data.violations.length} Total):
${'='.repeat(70)}
${violationItems}
${'='.repeat(70)}

LEGAL REQUIREMENTS — YOUR OBLIGATIONS UPON RECEIPT:

1. REINVESTIGATION (§ 1681i(a)(1)(A)): You must complete this investigation within 30 days of receipt.

2. FORWARDING (§ 1681i(a)(2)): You must forward ALL relevant information I have provided to the furnisher within 5 business days.

3. DELETION (§ 1681i(a)(5)(A)): If you cannot verify accuracy, the disputed items MUST be permanently deleted.

4. NOTIFICATION (§ 1681i(a)(6)(A)): You must provide me written notice of the results.

5. UPDATED REPORT (§ 1681i(a)(6)(B)(iii)): Provide me a free updated credit report showing corrections.

6. FURNISHER NOTIFICATION (§ 1681i(a)(5)(C)): Notify all furnishers of deleted/modified information.

NOTICE OF LIABILITY: Failure to conduct a reasonable reinvestigation or failure to respond within 30 days will result in legal action for violations of 15 U.S.C. § 1681i, with liability including:
  — Statutory damages: $100 - $1,000 per violation (§ 1681n(a)(1)(A))
  — Actual damages for credit denials, emotional distress (§ 1681n(a)(1))
  — Punitive damages (§ 1681n(a)(2))
  — Attorney fees and court costs (§ 1681n(a)(3))

This letter was sent via Certified Mail, Return Receipt Requested.

Sincerely,

____________________________
${data.clientName}

Enclosures:
  — Copy of credit report with disputed items marked
  — Supporting documentation for each disputed item
  — Copy of government-issued photo ID
  — Proof of current address (utility bill or bank statement)`;
}

// ═══════════════════════════════════════════════════════════════
// 2. FURNISHER DIRECT DISPUTE (§ 623)
// ═══════════════════════════════════════════════════════════════
export function generateFurnisherDisputeLetter(data: DocumentData): string {
  const v = data.violations[0];
  return `${clientBlock(data)}
${data.today}

VIA CERTIFIED MAIL — RETURN RECEIPT REQUESTED

${data.creditorName || v?.defendantName || v?.defendant_name || '[FURNISHER NAME]'}
${data.creditorAddress || '[FURNISHER ADDRESS]'}

Re: DIRECT DISPUTE — Inaccurate Information Furnished to CRAs
    Account: #${data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]'}
    Consumer: ${data.clientName}

Dear Sir or Madam:

This is a DIRECT DISPUTE submitted pursuant to 15 U.S.C. § 1681s-2(a)(8)(D), which provides consumers the right to dispute inaccurate information directly with the furnisher, independent of any CRA dispute.

YOUR LEGAL OBLIGATIONS UPON RECEIPT:

Under 15 U.S.C. § 1681s-2(a)(8)(E), within 30 days you MUST:
  (i)   Conduct an investigation with respect to the disputed information;
  (ii)  Review all relevant information provided by the consumer;
  (iii) Report results of investigation to the consumer;
  (iv)  If found inaccurate: modify, delete, or permanently block reporting of the information; and
  (v)   Report corrections to ALL CRAs to which you previously furnished the information.

DISPUTED INFORMATION:

${data.violations.map((v, i) => `${i + 1}. ${v.subcategory}
   Statute: ${v.statute}
   Evidence: ${v.evidence}
   Legal Standard: ${v.legalStandard || v.legal_standard}
`).join('\n')}

ADDITIONAL OBLIGATIONS:

Under 15 U.S.C. § 1681s-2(a)(1)(A), you have an independent duty NOT to furnish information you know or have reasonable cause to believe is inaccurate.

Under 15 U.S.C. § 1681s-2(a)(1)(B), if you are notified by a CRA that information is disputed, you may not continue to report that information without conducting an investigation.

I DEMAND THAT YOU:
  1. Immediately investigate this dispute
  2. Correct inaccurate information with ALL three bureaus
  3. Provide written confirmation of corrections within 30 days
  4. If verification fails, CEASE reporting this information immediately

NOTICE OF INTENT TO SUE: If you fail to comply within 30 days, I will pursue federal litigation for violations of:
  — 15 U.S.C. § 1681s-2(b) — Duties after notice of dispute
  — 15 U.S.C. § 1681n — Willful noncompliance ($100-$1,000 statutory + punitive + attorney fees)
  — 15 U.S.C. § 1681o — Negligent noncompliance (actual damages + attorney fees)

Sincerely,

____________________________
${data.clientName}

Enclosures: Copy of credit report; supporting documentation`;
}

// ═══════════════════════════════════════════════════════════════
// 3. FDCPA DEBT VALIDATION LETTER (§ 809)
// ═══════════════════════════════════════════════════════════════
export function generateDebtValidationLetter(data: DocumentData): string {
  const v = data.violations[0];
  return `${clientBlock(data)}
${data.today}

VIA CERTIFIED MAIL — RETURN RECEIPT REQUESTED

${data.creditorName || v?.defendantName || v?.defendant_name || '[COLLECTION AGENCY]'}
${data.creditorAddress || '[AGENCY ADDRESS]'}

Re: DEBT VALIDATION DEMAND — 15 U.S.C. § 1692g(b)
    Alleged Account: #${data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]'}

Dear Sir or Madam:

I DISPUTE THIS ALLEGED DEBT IN ITS ENTIRETY.

Pursuant to 15 U.S.C. § 1692g(b) of the Fair Debt Collection Practices Act, I demand full validation of this alleged debt. Upon receipt of this letter, you must IMMEDIATELY CEASE ALL COLLECTION ACTIVITIES until proper validation is provided.

REQUIRED VALIDATION — You must provide ALL of the following:

1. VERIFICATION OF DEBT (§ 1692g(a)(1)-(4)):
   — The exact amount of the alleged debt, itemized to show:
     • Original principal balance
     • All interest charges (with contractual authorization)
     • All fees added (with contractual or statutory authorization)
     • All payments or credits applied
   — The name of the original creditor (§ 1692g(a)(2))

2. PROOF OF OWNERSHIP / AUTHORIZATION:
   — Complete chain of title from the original creditor to your company
   — Bill of sale or assignment agreement
   — Proof that you are licensed to collect debts in the State of ${data.clientState || '[STATE]'}

3. PROOF OF CONTRACTUAL OBLIGATION:
   — Copy of the original signed credit agreement or application
   — Terms and conditions showing authorization for all charges
   — Original creditor's final account statement

4. PROOF OF TIMELINESS:
   — Documentation that the applicable statute of limitations has not expired
   — Date of first delinquency

5. VERIFICATION OF REPORTING ACCURACY:
   — Confirmation that dispute notation has been added to all credit bureau reports per § 1692e(8)

CEASE AND DESIST — 15 U.S.C. § 1692c(c):

Additionally, I demand that you CEASE ALL COMMUNICATION with me regarding this alleged debt except:
  (a) To notify me that collection efforts are being terminated;
  (b) To notify me that a specific legal remedy may be invoked; or
  (c) To provide the validation requested above.

LEGAL NOTICE:

Any continued collection activity before providing validation violates § 1692g(b).
Failure to add dispute notation to credit bureau reports violates § 1692e(8).
Reporting disputed debt as undisputed violates § 1692e(10).
Each violation carries liability of up to $1,000 in statutory damages plus actual damages and attorney fees under § 1692k.

THIS LETTER IS NOT AN ACKNOWLEDGMENT THAT I OWE THIS DEBT.
I am exercising my rights under federal law.

All future communication must be IN WRITING ONLY.

Sincerely,

____________________________
${data.clientName}`;
}

// ═══════════════════════════════════════════════════════════════
// 4. INTENT TO SUE LETTER
// ═══════════════════════════════════════════════════════════════
export function generateIntentToSueLetter(data: DocumentData): string {
  const totalMin = data.violations.reduce((s: number, v: any) => s + (v.totalDamagesMin || v.total_damages_min || 0), 0);
  const totalMax = data.violations.reduce((s: number, v: any) => s + (v.totalDamagesMax || v.total_damages_max || 0), 0);
  const critCount = data.violations.filter((v: any) => (v.severity === 'critical')).length;
  const highCount = data.violations.filter((v: any) => (v.severity === 'high')).length;

  return `${clientBlock(data)}
${data.today}

VIA CERTIFIED MAIL — RETURN RECEIPT REQUESTED

${data.creditorName || '[DEFENDANT NAME]'}
${data.creditorAddress || '[DEFENDANT ADDRESS]'}

Re: NOTICE OF INTENT TO FILE FEDERAL LAWSUIT
    Consumer: ${data.clientName}
    Violations: ${data.violations.length} identified (${critCount} Critical, ${highCount} High)
    Estimated Damages: $${totalMin.toLocaleString()} — $${totalMax.toLocaleString()}

Dear Sir or Madam:

This letter constitutes FORMAL NOTICE of my intent to file a federal lawsuit against your organization for violations of:

  □ Fair Credit Reporting Act, 15 U.S.C. § 1681 et seq.
  □ Fair Debt Collection Practices Act, 15 U.S.C. § 1692 et seq.
  □ Equal Credit Opportunity Act, 15 U.S.C. § 1691 et seq.

${'─'.repeat(60)}
IDENTIFIED VIOLATIONS (${data.violations.length} Total):
${'─'.repeat(60)}

${data.violations.map((v, i) => `${i + 1}. [${(v.severity || '').toUpperCase()}] ${v.statute} — ${v.subcategory}
   ${v.evidence}
   Potential Damages: $${(v.totalDamagesMin || v.total_damages_min || 0).toLocaleString()} — $${(v.totalDamagesMax || v.total_damages_max || 0).toLocaleString()}
`).join('\n')}
${'─'.repeat(60)}

DAMAGES I INTEND TO SEEK:

  — Statutory damages: $100 - $1,000 per violation (§ 1681n(a)(1)(A))
  — Actual damages: Credit denials, higher interest rates, lost opportunities, emotional distress
  — Punitive damages: For willful violations (§ 1681n(a)(2))
  — Attorney fees and court costs: Recoverable under § 1681n(a)(3)
  — TOTAL ESTIMATED: $${totalMin.toLocaleString()} — $${totalMax.toLocaleString()}

SETTLEMENT OPPORTUNITY:

Before filing, I am willing to discuss pre-litigation resolution. You have FIFTEEN (15) DAYS from receipt of this letter to provide a written settlement proposal.

After 15 days, I will file a Complaint in the United States District Court without further notice, seeking all available remedies including trial by jury.

This letter is not a waiver of any rights, claims, or defenses.

Sincerely,

____________________________
${data.clientName}

cc: File`;
}

// ═══════════════════════════════════════════════════════════════
// 5. CFPB COMPLAINT
// ═══════════════════════════════════════════════════════════════
export function generateCFPBComplaint(data: DocumentData): string {
  return `${'═'.repeat(60)}
CONSUMER FINANCIAL PROTECTION BUREAU — COMPLAINT
${'═'.repeat(60)}

CONSUMER INFORMATION:
  Name: ${data.clientName}
  Address: ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}
  Date Filed: ${data.today}

COMPLAINT CATEGORY:
  Product: Credit Reporting
  Sub-Product: Credit Report
  Issue: Incorrect/Inaccurate Information on Credit Report

COMPANY COMPLAINED ABOUT:
  ${data.creditorName || data.violations[0]?.defendantName || data.violations[0]?.defendant_name || '[COMPANY NAME]'}

${'─'.repeat(60)}
WHAT HAPPENED:
${'─'.repeat(60)}

I obtained my consumer report and discovered ${data.violations.length} violation(s) of federal consumer protection law. Despite my attempts to resolve these issues through the standard dispute process, the inaccuracies persist.

SPECIFIC VIOLATIONS:

${data.violations.map((v, i) => `Violation ${i + 1}: ${v.subcategory}
  Law Violated: ${v.statute} (${v.statuteText || v.statute_text})
  Evidence: ${v.evidence}
  Legal Standard: ${v.legalStandard || v.legal_standard}
  Estimated Damages: $${(v.totalDamagesMin || v.total_damages_min || 0).toLocaleString()} — $${(v.totalDamagesMax || v.total_damages_max || 0).toLocaleString()}
`).join('\n')}

${'─'.repeat(60)}
STEPS ALREADY TAKEN:
${'─'.repeat(60)}

  1. Obtained and reviewed credit report for accuracy
  2. Identified ${data.violations.length} violation(s) of FCRA/FDCPA
  3. Sent dispute letter(s) to credit bureau(s)
  4. Sent direct dispute(s) to furnisher(s) under § 623(a)(8)
  5. Filed this CFPB complaint

${'─'.repeat(60)}
DESIRED RESOLUTION:
${'─'.repeat(60)}

  1. Immediate investigation and correction of ALL inaccurate information
  2. Updated credit report reflecting all corrections
  3. Written confirmation of changes from both CRA and furnisher
  4. Monetary compensation for damages caused by inaccurate reporting

SUPPORTING DOCUMENTATION: Credit report, dispute letters, correspondence.

This complaint is filed pursuant to 12 U.S.C. § 5534 (Consumer Financial Protection Act).

Filed by: ${data.clientName}
Date: ${data.today}`;
}

// ═══════════════════════════════════════════════════════════════
// 6. SECTION 609 DISCLOSURE REQUEST
// ═══════════════════════════════════════════════════════════════
export function generate609DisclosureRequest(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `${clientBlock(data)}
${data.today}

${address}

Re: REQUEST FOR FULL FILE DISCLOSURE
    Pursuant to 15 U.S.C. § 1681g (FCRA § 609)
    Consumer: ${data.clientName}
${data.clientSSNLast4 ? `    SSN Last 4: XXX-XX-${data.clientSSNLast4}` : ''}

Dear Sir or Madam:

Pursuant to 15 U.S.C. § 1681g(a), I hereby request a COMPLETE disclosure of all information in my consumer file, including but not limited to:

1. ALL INFORMATION IN FILE (§ 1681g(a)(1)):
   — Every tradeline, account, and item in my file
   — All information in my file at the time of the request

2. SOURCES OF INFORMATION (§ 1681g(a)(2)):
   — The name, address, and telephone number of each person that furnished information in my file

3. INQUIRIES (§ 1681g(a)(3)):
   — Identification of each person who procured a consumer report during the prior 2-year period
   — The date of each inquiry
   — The permissible purpose stated for each inquiry

4. DATES, ORIGINAL PAYEES, AND AMOUNTS OF CHECKS (§ 1681g(a)(4)):
   — If applicable, on any checks returned for insufficient funds in the prior 2 years

5. CREDIT SCORES (§ 1681g(f)):
   — All credit scores currently in my file
   — The range of possible scores under the scoring model used
   — All key factors (up to 4) that adversely affected my score
   — The date the score was created
   — The name of the scoring model used

6. SOFT INQUIRIES / PROMOTIONAL INQUIRIES:
   — All soft inquiries and promotional inquiries on file

LEGAL BASIS: Under 15 U.S.C. § 1681g(a), you must make this disclosure clearly and accurately within 15 days of receiving this request when sent by mail.

I have enclosed copies of my government-issued photo ID and proof of address for identification verification.

Sincerely,

____________________________
${data.clientName}

Enclosures:
  — Copy of government-issued photo ID
  — Proof of current address`;
}

// ═══════════════════════════════════════════════════════════════
// 7. METHOD OF VERIFICATION REQUEST (§ 611)
// ═══════════════════════════════════════════════════════════════
export function generateMethodOfVerification(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `${clientBlock(data)}
${data.today}

${address}

Re: REQUEST FOR METHOD OF VERIFICATION
    Pursuant to 15 U.S.C. § 1681i(a)(7) (FCRA § 611(a)(7))
    Consumer: ${data.clientName}

Dear Sir or Madam:

I recently submitted a dispute regarding items on my consumer report. I have received your response stating that the disputed items were "verified."

Pursuant to 15 U.S.C. § 1681i(a)(7), I hereby request that you provide a DESCRIPTION OF THE PROCEDURE USED to determine the accuracy and completeness of the disputed information, including:

1. The business name, address, and telephone number of each furnisher contacted during the reinvestigation;

2. The specific method of verification used (e.g., Automated Consumer Dispute Verification / ACDV, telephone call, written correspondence);

3. ALL documents, records, and information the furnisher provided in response to your investigation;

4. The specific basis upon which the furnisher verified the information as accurate;

5. Whether any human being at the CRA actually reviewed the dispute or whether it was processed entirely through automated systems;

6. A copy of any ACDV (Automated Consumer Dispute Verification) form sent to the furnisher.

LEGAL BASIS: 15 U.S.C. § 1681i(a)(7) requires you to provide, upon request, "a description of the procedure used to determine the accuracy and completeness of the information." This includes the specific documents and methods used, not merely a form letter stating the items were "verified."

NOTE: A "rubber stamp" verification that merely parrots back the same inaccurate data without conducting an actual investigation violates § 1681i(a)(1)(A). See Cushman v. Trans Union Corp., 115 F.3d 220 (3d Cir. 1997) — CRA must conduct a reasonable reinvestigation, not merely pass information back and forth.

If you fail to provide this information within 15 days, I will consider this a failure to comply with § 1681i(a)(7) and will include this violation in any subsequent legal action.

Sincerely,

____________________________
${data.clientName}`;
}

// ═══════════════════════════════════════════════════════════════
// 8. STATE ATTORNEY GENERAL COMPLAINT
// ═══════════════════════════════════════════════════════════════
export function generateStateAGComplaint(data: DocumentData): string {
  const totalMin = data.violations.reduce((s: number, v: any) => s + (v.totalDamagesMin || v.total_damages_min || 0), 0);
  const totalMax = data.violations.reduce((s: number, v: any) => s + (v.totalDamagesMax || v.total_damages_max || 0), 0);

  return `${'═'.repeat(60)}
CONSUMER COMPLAINT — STATE ATTORNEY GENERAL
${'═'.repeat(60)}

TO: Office of the Attorney General
    State of ${data.clientState || '[STATE]'}
    Consumer Protection Division

FROM: ${data.clientName}
      ${data.clientAddress}
      ${data.clientCity}, ${data.clientState} ${data.clientZip}

DATE: ${data.today}

SUBJECT: Violations of Federal and State Consumer Protection Laws
         by ${data.creditorName || data.violations[0]?.defendantName || data.violations[0]?.defendant_name || '[COMPANY NAME]'}

${'─'.repeat(60)}
COMPLAINT SUMMARY:
${'─'.repeat(60)}

I am filing this complaint against the above-named company for violations of the Fair Credit Reporting Act (15 U.S.C. § 1681 et seq.), Fair Debt Collection Practices Act (15 U.S.C. § 1692 et seq.), and applicable state consumer protection statutes.

I have identified ${data.violations.length} violations causing estimated damages of $${totalMin.toLocaleString()} — $${totalMax.toLocaleString()}.

${'─'.repeat(60)}
SPECIFIC VIOLATIONS:
${'─'.repeat(60)}

${data.violations.map((v, i) => `${i + 1}. [${(v.severity || '').toUpperCase()}] ${v.subcategory}
   Federal Law: ${v.statute}
   Details: ${v.evidence}
`).join('\n')}

${'─'.repeat(60)}
ACTIONS TAKEN:
${'─'.repeat(60)}

  1. Reviewed credit report and identified violations
  2. Sent dispute letters to credit reporting agencies
  3. Sent direct disputes to furnisher(s)
  4. Filed complaint with CFPB
  5. Filing this complaint with your office

REQUEST FOR RELIEF:

I respectfully request that your office:
  1. Investigate the above-described violations
  2. Take enforcement action as warranted
  3. Ensure correction of inaccurate information
  4. Seek penalties for willful violations of consumer protection law

I am available to provide additional documentation upon request.

Respectfully submitted,

____________________________
${data.clientName}
${data.today}`;
}

// ═══════════════════════════════════════════════════════════════
// 9. CEASE AND DESIST LETTER (FDCPA § 1692c(c))
// ═══════════════════════════════════════════════════════════════
export function generateCeaseAndDesist(data: DocumentData): string {
  const v = data.violations[0];
  return `${clientBlock(data)}
${data.today}

VIA CERTIFIED MAIL — RETURN RECEIPT REQUESTED

${data.creditorName || v?.defendantName || v?.defendant_name || '[COLLECTION AGENCY]'}
${data.creditorAddress || '[AGENCY ADDRESS]'}

Re: CEASE AND DESIST — ALL COMMUNICATION
    Alleged Account: #${data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]'}

Dear Sir or Madam:

Pursuant to my rights under 15 U.S.C. § 1692c(c) of the Fair Debt Collection Practices Act, I hereby demand that you IMMEDIATELY CEASE ALL COMMUNICATION with me regarding the alleged debt referenced above.

Under § 1692c(c), upon receipt of this notice you may ONLY contact me to:
  (1) Advise me that your collection efforts are being terminated;
  (2) Notify me that you or the creditor may invoke specified remedies which are ordinarily invoked; or
  (3) Notify me that you or the creditor intend to invoke a specified remedy.

ANY OTHER COMMUNICATION AFTER RECEIPT OF THIS LETTER CONSTITUTES A VIOLATION of the FDCPA, carrying penalties of:
  — Up to $1,000 in statutory damages per violation (§ 1692k(a)(2)(A))
  — Actual damages (§ 1692k(a)(1))
  — Attorney fees and costs (§ 1692k(a)(3))

ADDITIONAL NOTICES:

1. I DISPUTE THIS DEBT. If you are reporting this account to any credit reporting agency, you MUST note that it is disputed per § 1692e(8).

2. DO NOT SELL OR TRANSFER this alleged debt to any other entity without first providing proper validation as demanded in my prior correspondence.

3. Any attempt to collect through a third party or substitute collector will be considered a violation of this cease and desist notice.

This letter does not constitute an acknowledgment of any debt.

Sincerely,

____________________________
${data.clientName}`;
}

// ═══════════════════════════════════════════════════════════════
// 10. GOODWILL ADJUSTMENT LETTER
// ═══════════════════════════════════════════════════════════════
export function generateGoodwillLetter(data: DocumentData): string {
  return `${clientBlock(data)}
${data.today}

${data.creditorName || '[CREDITOR NAME]'}
${data.creditorAddress || '[CREDITOR ADDRESS]'}

Re: Request for Goodwill Adjustment
    Account: #${data.accountNumber || '[ACCOUNT NUMBER]'}
    Consumer: ${data.clientName}

Dear Sir or Madam:

I am writing to respectfully request a goodwill adjustment to my account reporting with the three major credit bureaus. I have been a valued customer and I am reaching out to ask for your understanding regarding a past negative mark on my account.

ACCOUNT HISTORY:
I acknowledge that my account experienced a period of difficulty. However, I want to assure you that this was due to circumstances beyond my control, and I have since demonstrated my commitment to financial responsibility.

MY REQUEST:
I am respectfully asking that you consider removing or updating the negative reporting on this account as a goodwill gesture. I understand that you are under no legal obligation to do so, but I am hopeful that given my payment history and continued loyalty, you may be willing to help.

WHY THIS MATTERS:
This negative mark is significantly impacting my ability to:
  — Obtain fair interest rates on loans
  — Qualify for housing
  — Secure employment (some employers check credit)
  — Build a secure financial future

I have taken significant steps to improve my financial situation and would greatly appreciate your consideration of this goodwill request.

WHAT I AM REQUESTING:
  — Update the account to show "Paid as Agreed" or "Current"
  — Or, remove the late payment notation(s) from the payment history
  — Report the update to all three bureaus: Equifax, Experian, and TransUnion

Thank you for your time and consideration. I look forward to continuing our positive relationship.

Sincerely,

____________________________
${data.clientName}`;
}

// ═══════════════════════════════════════════════════════════════
// 11. DATA FURNISHER DISPUTE LETTER
// ═══════════════════════════════════════════════════════════════
export function generateDataFurnisherDisputeLetter(data: DocumentData): string {
  const v = data.violations[0];
  const bureau = (data.bureau || 'equifax').toUpperCase();
  const address = BUREAU_ADDRESSES[bureau.toLowerCase()] || BUREAU_ADDRESSES.equifax;
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const balance = v?.currentBalance || v?.balance || '[BALANCE]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || v?.accountName || v?.account_name || '[FURNISHER NAME]';

  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

${clientBlock(data)}
${data.today}

${address}

Subject: Formal Dispute of Unauthorized Collection Account – Not a Legally Qualified Data Furnisher

To Whom It May Concern,

I am disputing the following account(s) reported by ${creditor}:

• Account #: ${acctNum}
• Disputed Amount: $${balance}
• Reason for Dispute: The entity reporting this account does not qualify as a legitimate data furnisher under the Fair Credit Reporting Act (FCRA) or your agency’s reporting guidelines.

Legal Basis for Dispute:
Per the FCRA (§ 1681s-2) and your own furnisher requirements, a data furnisher must:
1. Regularly report consumer credit data (e.g., active accounts, payment history) as part of its ordinary business operations;
2. Maintain consistent reporting practices—not selectively report only derogatory or collection accounts.

The entity reporting this account, ${creditor}:
• Only reports accounts after they enter collections;
• Does not report active accounts, payment history, or other consumer data;
• Fails to meet the definition of a data furnisher and is instead acting as a collection agency.

This violates:
• FCRA § 1681s-2(a) (accuracy and completeness requirements);
• Your agency’s contractual obligations with furnishers (requiring systematic reporting);
• FTC guidance (furnishing must be routine, not ad hoc).

Demand for Action:
1. Immediately delete this account from my credit report, as it is unlawfully reported by a non-furnisher.
2. Provide written confirmation of the deletion and an updated credit report.
3. Investigate the furnisher’s reporting practices for systemic violations.

Attached: Copies of my ID, proof of address, and any supporting documents.

If you fail to correct this inaccuracy within 30 days, I will escalate this to the Consumer Financial Protection Bureau (CFPB) and my state Attorney General for willful FCRA non-compliance (§ 1681n).

Sincerely,

____________________________
${data.clientName}

D.O.B. ${data.clientDOB || '[DOB]'}
SSN Last 4: XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}

Enclosures: ID, proof of Address, Social Security Card

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 12. R1 COLLECTION DIRECT DISPUTE
// ═══════════════════════════════════════════════════════════════
export function generateR1CollectionDirectDispute(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const balance = v?.currentBalance || v?.balance || '[BALANCE]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || v?.accountName || v?.account_name || '[COLLECTION AGENCY]';
  const creditorAddr = data.creditorAddress || '[COLLECTION AGENCY ADDRESS]';

  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

${clientBlock(data)}
${data.today}

${creditor}
${creditorAddr}

RE: Credit Reporting – Account Number(s): ${acctNum}

On my consumer reports is a collection account from your company. I am trying to clean up my credit, and your collection is one of the items that I need to address. The collection does not identify an original creditor, account number, open date, payment history, pay status, or sufficient information about the debt that you are reporting.

You are a debt collector, so we did not do any direct business together. Therefore, I need proof that you have the debt. But first, I need information on the actual debt that you claim to have acquired.

Please be advised that I dispute the validity, amount, ownership, and collectability of this alleged debt in its entirety. I request that you provide me with competent evidence that I have any legal obligation to pay you.

This account has already caused real damage in my life, including credit denials, higher costs, and added stress in my household. I am not engaging in generic responses, recycled summaries, system screenshots, or internal notes. I am requesting original documents and verified records tied specifically to this account.

To validate this alleged debt, provide documentation and information proving the existence of the specific debt you are reporting, the basis for the balance claimed, and your ownership or authority to collect.

The documentation must include:
1. The original signed contract or agreement bearing my signature that created this alleged debt;
2. A complete, itemized accounting ledger showing how the alleged balance of $${balance} was calculated, including principal, interest, fees, credits, and payments;
3. A full payment history with posting dates and application of funds;
4. Double-signed accounting verification confirming the accuracy of the balance claimed, signed by an authorized representative of the original creditor and an authorized representative of your company;
5. The complete chain of title and assignment proving your legal right to collect, including every transfer or sale of the account, not just the last one;
6. Full file disclosure, including all documents, data, records, notes, and information your company relies on to support ownership, balance, and collection authority for this account;
7. The most recent billing statements showing due dates and how interest or fees were applied;
8. Proof that the applicable statute of limitations has not expired on this account, including the date of first delinquency and the controlling state statute relied upon;
9. A certified copy of any judgment obtained on this account, if applicable, including the court, case number, and date entered;
10. Proof that your company is legally authorized to collect in ${data.clientState || '[STATE]'}, including your correct legal name and licensing status.

The following will not be accepted as proper validation:
• A system screen print
• A generic balance line
• A statement that the account was "confirmed with the prior creditor" without supporting documents
• A form letter that does not tie directly to this account with real, verifiable detail.

If your company has reported, or continues to report, invalidated or unverified information to any of the three major credit bureaus (Experian, Equifax, or TransUnion), that action may constitute fraud under both federal and state law. Should any negative mark appear on any of my credit reports as a result of your company or the company you represent, I will not hesitate to pursue legal action for violation of the Fair Credit Reporting Act, violation of the Fair Debt Collection Practices Act, and defamation of character.

During this validation period, any action taken that could be detrimental to my credit reports will be treated as grounds for suit. This includes listing information that is inaccurate or invalidated, or verifying this account as accurate when no proof of its accuracy has been provided.

This letter constitutes my written dispute and debt validation request under 15 U.S.C. § 1692g. If this dispute falls within the validation period, 15 U.S.C. § 1692g(b) requires you to cease all collection activity until proper verification is mailed to me. Regardless, you are now on notice that this account is disputed and must be treated as disputed.

Effective immediately, this letter also serves as written notice under 15 U.S.C. § 1692c(c) that you must cease communication with me regarding this alleged debt. Do not call, text, email, or contact third parties.

The only communications I will accept from you are:
1. Mailing the complete validation documents requested in this letter;
2. Written confirmation that you are closing or recalling the account, ceasing collection, and requesting deletion of any reporting made to the consumer reporting agencies; or
3. Written notice that you intend to pursue a specific legal remedy.

If you do provide proper documentation as requested, I will require at least 30 days to review it, and all collection activity must cease during that period.

Until you provide the requested information and documentation, I have no obligation to pay this alleged debt. If you cannot validate this debt, or fail to respond within 30 days, all references to this account must be deleted and completely removed from my credit reports, and written confirmation of that deletion — submitted to each of the three major credit reporting agencies — must be provided to me.

Should you continue collection activity without validation, ignore my cease-communication notice, or continue reporting information that has not been properly verified, I will pursue my rights under the FDCPA and FCRA, including 15 U.S.C. § 1692k.

It would be advisable to ensure your records are in order before I am compelled to take legal action against your company and its client. This is an attempt to correct your records; any information obtained will be used for that purpose.

This letter and evidence may be provided to the Consumer Financial Protection Bureau ("CFPB") through the CFPB complaint portal and may also be provided to an attorney for review.

I expect your response to comply fully with the law.

Sincerely,

s/ ${data.clientName}

CC:
EQUIFAX, PO BOX 740256, ATLANTA, GA 30374
EXPERIAN, PO BOX 9701, ALLEN, TX 75013
TRANS UNION, PO BOX 2000, CHESTER, PA 19016

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 13. EVICTIONS LETTER (RFI: EVICTIONS)
// ═══════════════════════════════════════════════════════════════
export function generateEvictionsLetter(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || '[CREATIVE MANAGEMENT / PROPERTY / COURT]';
  const creditorAddr = data.creditorAddress || '[ADDRESS]';

  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

${data.clientName}
DOB: ${data.clientDOB || '[DOB]'}
Last 4 SSN: XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}

${data.today}

${creditor}
${creditorAddr}

Account Number: ${acctNum}

To Whom It May Concern,

I believe the information being reported regarding this tenancy/eviction record to be inaccurate. For that reason, I am requesting all account-level documentation in addition to the following information:

1. The leasing agreement(s) and all addendum(s);
2. All accounting records to reflect the posting of payments, late fees, etc.;
3. Final account statement;
4. Move In/Move Out Checklist completed by the client and staff;
5. Verification of the Date of First Delinquency;
6. Any other county, local, or state-specific disclosures.

I believe 30 days to be a reasonable amount of time to gather and send back the requested information. Please return all correspondence to the mailing address listed above.

Thanks,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 14. REPO LETTER (RFI REPO)
// ═══════════════════════════════════════════════════════════════
export function generateRepoLetter(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || '[LENDER / AUTO FINANCE]';
  const creditorAddr = data.creditorAddress || '[ADDRESS]';

  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
DOB: ${data.clientDOB || '[DOB]'}
Last 4 SSN: XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}

${data.today}

${creditor}
${creditorAddr}

Account Number: ${acctNum}

To Whom It May Concern,

The following information is being provided to assist you in locating the account. The full account number is not available because it is not provided by the consumer reporting agencies.

Consumer Name: ${data.clientName}
Consumer Address: ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}
VIN: [VIN]
Year: [Year]
Make: [Make]
Model: [Model]

If you have any other variations of the consumer’s name or address on file, please update your records to only reflect the correct name and address that have been provided above.

I also believe some of the information being reported to the consumer reporting agencies (CRAs) is inaccurate. For that reason, I am requesting all account-level documentation in addition to the following information:

• Retail Installment Sales Contract / Lease Agreement;
• Any Arbitration Provisions;
• Complete Accounting and Payment History Ledger;
• Notice of Sale / Notice of Default with proof of mailing;
• Explanation of Calculation of Surplus or Deficiency with proof of mailing;
• Notices regarding right to redeem personal property with proof of mailing;
• Details regarding whether the sale was public or private;
• Verification of the date of first delinquency;
• Verification of the date of repossession.

By law, you have 14 days to produce the information upon request. If you find that you are unable to comply with this request, I am requesting that you waive the balance on the account and delete the account with each credit reporting agency that you reported the unverifiable information to. Please return all correspondence to the address listed above.

Thank you for your cooperation.

Sincerely,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 15. 1681I LETTER (1681 I LETTER TO CRA)
// ═══════════════════════════════════════════════════════════════
export function generate1681iLetter(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || v?.accountName || v?.account_name || '[FURNISHER NAME]';
  const bureau = (data.bureau || 'equifax').toUpperCase();
  const address = BUREAU_ADDRESSES[bureau.toLowerCase()] || BUREAU_ADDRESSES.equifax;

  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

My name is ${data.clientName}
My address is ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}
My last four SSN is XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}. My date of birth is ${data.clientDOB || '[DOB]'}.

${data.today}

${address}

I wish to opt out of all email communications. Please note that you may have an incorrect or outdated email address on file, which could result in my personal information being shared with unauthorized parties. Moving forward, I request that all correspondence be sent exclusively to my mailing address, which is provided above.

The details currently reported for ${creditor}, account number ${acctNum}, on my credit report from your agency, ${bureau}, are inaccurate. Under 15 U.S. Code § 1681i, I am entitled to request a reinvestigation of any accounts on my credit report that contain inaccurate information. Please refer to 15 U.S. Code § 1681i(a)(1)(A) and 15 U.S. Code § 1681e(b) for further clarification.

I ask that you please remove this inaccurate account from my credit report.

Once removed, I request that you mail me a copy of my complete "file" after you complete acting on this reinvestigation. "The term 'file' . . . means all of the information on 'me' and retained by 'you' regardless of how the information is stored." 15 U.S.C. § 1681a(g). Thus, sending a partial disclosure is unlawful.

If you verify or deem the item of information that I disputed above as accurate and complete, then I request "a description of the procedure used to determine the accuracy or completeness of the information, including the business name and address of any furnisher contacted in connection with such information and the telephone number of such furnisher," in no later than 15 days after making such determination. 15 U.S.C. § 1681i(a)(6)(B)(iii); see also 15 U.S.C. § 1681i(a)(7).

I enclosed proof of my identity and current mailing address, which is not required under the FCRA. This dispute contains sufficient information for you to legally act on it without further information. Any delay tactics or needless requests for additional identifying information would be unlawful. If you fail to comply, I will seek money damages, costs, and attorney's fees. 15 U.S.C. § 1681n-o.

Sincerely,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 16. CHARGEOFF / LATE PAYMENT LETTER (RFI)
// ═══════════════════════════════════════════════════════════════
export function generateChargeoffLatePaymentLetter(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || '[CREDITOR NAME]';
  const creditorAddr = data.creditorAddress || '[ADDRESS]';

  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
DOB: ${data.clientDOB || '[DOB]'}
SSN Last 4: XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}

${data.today}

${creditor}
${creditorAddr}

RE: Request for Information
Account Number: ${acctNum}

To Whom It May Concern,

The following information is being provided to assist you in locating the account. The full account number is not available because it is not provided by the consumer reporting agencies.

Consumer Name: ${data.clientName}
Consumer Address: ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}

We are formally requesting complete and accurate documentation of the account's payment history, including but not limited to:
• A full transaction and payment history ledger from account inception to present;
• Dates and amounts of all payments received;
• Application of payments (principal, interest, fees, credits, adjustments, or reversals);
• Any internal records relied upon in furnishing payment history information to consumer reporting agencies.

For your reference, a copy of the account as it appears on the consumer credit report is also enclosed, reflecting the information currently being furnished.

Please provide the requested documentation within 30 days of receipt of this correspondence. If the records are unavailable or incomplete, please provide written confirmation or delete the account off the credit reports.

Please send correspondence to the mailing address listed above.

Sincerely,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 17. LEXISNEXIS CEASE AND DESIST
// ═══════════════════════════════════════════════════════════════
export function generateLexisNexisCeaseAndDesist(data: DocumentData): string {
  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

LexisNexis Risk Solutions
P.O. Box 105108
Atlanta, GA 30348-5108

${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
SSN Last 4: XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}

CEASE AND DESIST

I, ${data.clientName}, consumer, and natural person, am aware of all rights that I have, and which are protected by The Congress under the Fair Credit Reporting Act (FCRA). LexisNexis has violated my federally protected consumer rights to privacy and confidentiality under 15 U.S. Code § 1681b(2), which says, "In accordance with the written instructions of the consumer to whom it relates."

I, ${data.clientName}, have never given you written instructions to publish my private information.

As a reporting agency that has assumed the role of assembling and reporting information on consumers such as myself, the FCRA requires that it is done so in a manner that is fair and equitable. LexisNexis illegally obtained personal and private information and sold it to other reporting agencies, including Experian, Equifax and TransUnion.

15 U.S. Code § 1681q says, "Any person who knowingly and willfully obtains information on a consumer from a consumer reporting agency under false pretenses shall be fined under title 18, imprisoned for not more than 2 years, or both."

Furthermore, 18 U.S. Code § 1028a(a)(1) says, "Whoever, during and in relation to any felony violation enumerated in subsection (c), knowingly transfers, possesses, or uses, without lawful authority, a means of identification of another person shall, in addition to the punishment provided for such felony, be sentenced to a term of imprisonment of 2 years."

Can LexisNexis lawfully show me where I signed any written instructions that allows you to publish or sell my personal information?

I, ${data.clientName}, did not grant LexisNexis permissible purpose to obtain the information and report it, nor did the courts in which the Bankruptcy was filed. I have not been notified that this information is being provided to the highest bidders. The bankruptcy was filed during a time in my life of struggle and mental anguish. I have sustained further emotional and psychological damages because of LexisNexis' unfair and deceptive practices. I am rebuilding my life, but LexisNexis' willful disregard of my privacy and its reporting has damaged my character and is hindering my ability to provide for my family. As the consumer and natural person, I am invoking specified remedy and make the following demands:

- Cease and desist reporting of the bankruptcy filing to all consumer reporting agencies.
- Remove reporting of the bankruptcy filing from all consumer reporting agencies.
- Provide a complete and updated consumer file for ${data.clientName} as assembled by LexisNexis.
- Provide acknowledgment of this official notification that I am opting out of your reporting. Do not report ANY information bearing my identification.

Ignoring this Cease and Desist will be evidence that the infringements were willing, deceptive, and in violation of the FCRA.

Regards,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 18. PACER INQUIRY EMAIL
// ═══════════════════════════════════════════════════════════════
export function generatePacerInquiryEmail(data: DocumentData): string {
  return `Subject: PACER Verification Inquiry regarding consumer credit report verification procedures

Dear PACER,

My name is ${data.clientName}. I am reaching out to you because I was hoping to get some clarification.

There's a record on my credit report that says it's from you. I've disputed it with the bureaus, but they came back and told me that they verified it with you.

I was wondering, could someone please provide me the procedure in which you verify records with the bureaus?

I tried searching for the answer on your website, but I could not for the life of me find any information regarding this matter.

Could you please help me with this?

Thank you so much for your time,

${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson | Powered by RJ Business Solutions
https://rickjeffersonsolutions.com | support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 19. BANKRUPTCY COURT INQUIRY LETTER
// ═══════════════════════════════════════════════════════════════
export function generateBankruptcyCourtInquiryLetter(data: DocumentData): string {
  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

[Name of the Bankruptcy Court]
[Court Address]
[City, State, ZIP Code]

${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
SSN Last 4: XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}

Re: Verification of Bankruptcy with Credit Reporting Agencies
Case Number: [Your Bankruptcy Case Number]

Dear Clerk of the Court,

I am writing to respectfully inquire whether the court has verified or communicated my bankruptcy case (Case Number: [Your Bankruptcy Case Number]) with the major credit reporting agencies (Equifax, Experian, LexisNexis and TransUnion).

As part of my efforts to ensure that my credit report accurately reflects the discharge of my bankruptcy, I would like to confirm whether the court has taken steps to notify these agencies or if this responsibility falls to me or my attorney.

If the court does not typically handle this process, I would appreciate any guidance on how I can ensure the credit reporting agencies are properly updated.

Thank you for your time and assistance in this matter. Please feel free to contact me at my address listed above if you require any additional information or documentation to assist with my request.

Sincerely,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 20. LEXISNEXIS FOLLOW UP
// ═══════════════════════════════════════════════════════════════
export function generateLexisNexisFollowUp(data: DocumentData): string {
  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

LexisNexis Risk Solutions
P.O. Box 105108
Atlanta, GA 30348-5108

${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
SSN Last 4: XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}

To Whom It May Concern,

I have previously disputed this item with you.

You have previously stated that this information was verified with PACER. Your most recent letter dated [INSERT DATE], also says it was verified with PACER. How can that be?

I contacted PACER and spoke with their support via email on [INSERT DATE], and they confirmed that LEXIS NEXIS never contacted PACER to verify anything. I also included a copy of the email as evidence confirming that PACER does not verify anything with the credit bureaus.

Considering this new evidence, I am asking that you not only reinvestigate this matter, but to please describe in detail your reinvestigation procedures and not provide a boilerplate computer generated confirmation. I would like to know the following:

1. Name of the persons you contacted, and business addresses and telephone numbers so that I may follow up;
2. How did you contact the furnisher and verify my information?
3. What paperwork did you use to verify my dispute?

I would also like to know if the person you contacted gave my name, social security number, address, or my date of birth.

If you are unable to verify with the furnisher, then I am asking that you please delete this incorrect information immediately and provide me with an updated credit report. I appreciate you reinvestigating this matter and giving it the attention it needs. Thank you in advance.

Sincerely yours,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 21. AUTHORIZED USER DISPUTE
// ═══════════════════════════════════════════════════════════════
export function generateAuthorizedUserDispute(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || v?.accountName || v?.account_name || '[FURNISHER NAME]';
  const bureau = (data.bureau || 'equifax').toUpperCase();
  const address = BUREAU_ADDRESSES[bureau.toLowerCase()] || BUREAU_ADDRESSES.equifax;

  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

${clientBlock(data)}
${data.today}

${address}

Re: Dispute of Authorized User Account Activity
Account: ${creditor} - #${acctNum}

Dear Sir or Madam:

My credit report shows account activity on ${creditor} — Account #${acctNum} that does not correspond to my usage on the account. I am an authorized user on the account and all account activity is being reported on my credit report. I am requesting that my credit report be updated to only include my account activity, or that this authorized user tradeline be deleted entirely.

Sincerely,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// 22. LEXISNEXIS CONFIRMATION OF DELETION REQUEST
// ═══════════════════════════════════════════════════════════════
export function generateLexisNexisConfirmation(data: DocumentData): string {
  return `================═══════════════════════════════════════════════════════
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
================═══════════════════════════════════════════════════════

LexisNexis Risk Solutions
P.O. Box 105108
Atlanta, GA 30348-5108

${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
SSN Last 4: XXX-XX-${data.clientSSNLast4 || '[SSN LAST 4]'}

To Whom It May Concern,

I previously disputed the bankruptcy filing referenced above and requested that it be removed from my LexisNexis file.

Your records now indicate that this item has been deleted. I am writing to formally request written confirmation of that deletion, specifically:

1. Written confirmation that the bankruptcy filing referenced above is no longer being reported in my LexisNexis file;
2. Written confirmation that this item will not be re-reported or re-inserted into my file without first notifying me in writing, as required under the FCRA;
3. A current, complete copy of my consumer file reflecting this removal;
4. Confirmation of which consumer reporting agencies, if any, were previously furnished this information by LexisNexis, and written confirmation that LexisNexis has notified each of them of the deletion.

Please provide this written confirmation within 30 days of receipt of this letter. A system-generated notice or unsigned form letter without the specific confirmations requested above will not satisfy this request.

Thank you for your attention to this matter.

Sincerely,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT TYPE REGISTRY
// ═══════════════════════════════════════════════════════════════
export const DOCUMENT_TYPES: Record<string, { name: string; fn: (data: DocumentData) => string; category: string; description: string }> = {
  'bureau-dispute': {
    name: 'Bureau Dispute Letter',
    fn: generateBureauDisputeLetter,
    category: 'Dispute Letters',
    description: 'FCRA § 611 dispute demanding reinvestigation by credit bureau',
  },
  'furnisher-dispute': {
    name: 'Furnisher Direct Dispute',
    fn: generateFurnisherDisputeLetter,
    category: 'Dispute Letters',
    description: 'FCRA § 623(a)(8) direct dispute to the information furnisher',
  },
  'debt-validation': {
    name: 'Debt Validation Demand',
    fn: generateDebtValidationLetter,
    category: 'Dispute Letters',
    description: 'FDCPA § 809 demand for full debt validation with cease collection',
  },
  '609-disclosure': {
    name: '§ 609 Full File Disclosure Request',
    fn: generate609DisclosureRequest,
    category: 'Information Requests',
    description: 'FCRA § 609 request for complete file disclosure including credit scores',
  },
  'method-of-verification': {
    name: 'Method of Verification Request',
    fn: generateMethodOfVerification,
    category: 'Information Requests',
    description: 'FCRA § 611(a)(7) demand for reinvestigation procedure details',
  },
  'cease-desist': {
    name: 'Cease and Desist Letter',
    fn: generateCeaseAndDesist,
    category: 'Legal Notices',
    description: 'FDCPA § 1692c(c) demand to cease all collection communication',
  },
  'intent-to-sue': {
    name: 'Intent to Sue Notice',
    fn: generateIntentToSueLetter,
    category: 'Legal Notices',
    description: 'Pre-litigation notice with damages calculation and 15-day deadline',
  },
  'goodwill-letter': {
    name: 'Goodwill Adjustment Request',
    fn: generateGoodwillLetter,
    category: 'Goodwill',
    description: 'Polite request for voluntary removal of negative marks',
  },
  'cfpb-complaint': {
    name: 'CFPB Complaint',
    fn: generateCFPBComplaint,
    category: 'Regulatory Complaints',
    description: 'Formal complaint to Consumer Financial Protection Bureau',
  },
  'state-ag-complaint': {
    name: 'State Attorney General Complaint',
    fn: generateStateAGComplaint,
    category: 'Regulatory Complaints',
    description: 'Complaint to State AG Consumer Protection Division',
  },
  'data-furnisher-dispute': {
    name: 'Data Furnisher Dispute',
    fn: generateDataFurnisherDisputeLetter,
    category: 'Dispute Letters',
    description: 'Challenge unauthorized collection reporting under § 1681s-2',
  },
  'r1-collection-dispute': {
    name: 'R1 Collection Direct Dispute',
    fn: generateR1CollectionDirectDispute,
    category: 'Dispute Letters',
    description: 'Debt validation and cease communication request under FDCPA § 1692g / § 1692c',
  },
  'evictions-letter': {
    name: 'RFI: Evictions Letter',
    fn: generateEvictionsLetter,
    category: 'Information Requests',
    description: 'Challenge tenant/eviction records with documentation request',
  },
  'repo-letter': {
    name: 'RFI Repo Letter',
    fn: generateRepoLetter,
    category: 'Information Requests',
    description: 'Challenge auto repossession contract and financial ledgers',
  },
  '1681i-letter': {
    name: '1681 I Letter',
    fn: generate1681iLetter,
    category: 'Dispute Letters',
    description: 'Formal CRA reinvestigation request under 15 U.S.C. § 1681i(a)(1)(A)',
  },
  'chargeoff-latepayment': {
    name: 'RFI Chargeoff/Late Payment',
    fn: generateChargeoffLatePaymentLetter,
    category: 'Information Requests',
    description: 'Payment history ledger audit with 30-day deletion notice',
  },
  'lexis-nexis-cd': {
    name: 'LexisNexis Cease and Desist',
    fn: generateLexisNexisCeaseAndDesist,
    category: 'Legal Notices',
    description: 'Challenge bankruptcy publishing under § 1681b(2) (privacy right)',
  },
  'pacer-inquiry': {
    name: 'PACER Inquiry Email',
    fn: generatePacerInquiryEmail,
    category: 'Information Requests',
    description: 'Inquiry about CRA verification procedures to PACER',
  },
  'court-inquiry': {
    name: 'Bankruptcy Court Inquiry Letter',
    fn: generateBankruptcyCourtInquiryLetter,
    category: 'Information Requests',
    description: 'Official letter to court clerk inquiring about CRA communications',
  },
  'lexis-nexis-followup': {
    name: 'LexisNexis Follow Up',
    fn: generateLexisNexisFollowUp,
    category: 'Dispute Letters',
    description: 'Debunking PACER verification with physical proof',
  },
  'authorized-user-dispute': {
    name: 'Authorized User Dispute',
    fn: generateAuthorizedUserDispute,
    category: 'Dispute Letters',
    description: 'Demand removal of authorized user accounts that do not match usage',
  },
  'lexis-nexis-confirmation': {
    name: 'LexisNexis Confirmation',
    fn: generateLexisNexisConfirmation,
    category: 'Information Requests',
    description: 'Written removal confirmation and block demand',
  },
};

