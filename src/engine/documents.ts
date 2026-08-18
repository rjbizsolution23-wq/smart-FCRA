// ===========================================================================
// FCRA SUPREME DOCUMENT GENERATION ENGINE v3.0
// 10 Court-Ready Document Templates | Dispute - Legal - Regulatory - Request
// ===========================================================================

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
  clientPhone?: string;
  clientEmail?: string;
}

const BUREAU_ADDRESSES: Record<string, string> = {
  'equifax': 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374',
  'experian': 'Experian Information Solutions, Inc.\nP.O. Box 4500\nAllen, TX 75013',
  'transunion': 'TransUnion LLC\nP.O. Box 2000\nChester, PA 19016',
};

function clientBlock(data: DocumentData): string {
  return `${data.clientName}\n${data.clientAddress}\n${data.clientCity}, ${data.clientState} ${data.clientZip}`;
}

// ===============================================================
// 1. BUREAU DISPUTE LETTER (§ 611)
// ===============================================================
export function generateBureauDisputeLetter(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  const violationItems = data.violations.map((v, i) => `
ITEM ${i + 1}: ${v.accountName || v.account_name || v.defendantName || v.defendant_name}  -  Account #${v.accountNumber || v.account_number || 'N/A'}

  INACCURACY: ${v.subcategory}
  
  STATUTE VIOLATED: ${v.statute} (${v.statuteText || v.statute_text})
  
  FACTS: ${v.evidence}
  
  LEGAL BASIS: ${v.legalStandard || v.legal_standard}
  
  REQUIRED ACTION: Immediately delete or correct this item. If you cannot verify the accuracy of this information within 30 days, it must be permanently deleted pursuant to 15 U.S.C. § 1681i(a)(5)(A).
`).join('\n' + '='.repeat(70) + '\n');

  return `${clientBlock(data)}
${data.today}

${address}

Re: FORMAL DISPUTE  -  Inaccurate Information on Consumer Report
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

LEGAL REQUIREMENTS  -  YOUR OBLIGATIONS UPON RECEIPT:

1. REINVESTIGATION (§ 1681i(a)(1)(A)): You must complete this investigation within 30 days of receipt.

2. FORWARDING (§ 1681i(a)(2)): You must forward ALL relevant information I have provided to the furnisher within 5 business days.

3. DELETION (§ 1681i(a)(5)(A)): If you cannot verify accuracy, the disputed items MUST be permanently deleted.

4. NOTIFICATION (§ 1681i(a)(6)(A)): You must provide me written notice of the results.

5. UPDATED REPORT (§ 1681i(a)(6)(B)(iii)): Provide me a free updated credit report showing corrections.

6. FURNISHER NOTIFICATION (§ 1681i(a)(5)(C)): Notify all furnishers of deleted/modified information.

NOTICE OF LIABILITY: Failure to conduct a reasonable reinvestigation or failure to respond within 30 days will result in legal action for violations of 15 U.S.C. § 1681i, with liability including:
   -  Statutory damages: $100 - $1,000 per violation (§ 1681n(a)(1)(A))
   -  Actual damages for credit denials, emotional distress (§ 1681n(a)(1))
   -  Punitive damages (§ 1681n(a)(2))
   -  Attorney fees and court costs (§ 1681n(a)(3))

This letter was sent via Certified Mail, Return Receipt Requested.

Sincerely,

____________________________
${data.clientName}

Enclosures:
   -  Copy of credit report with disputed items marked
   -  Supporting documentation for each disputed item
   -  Copy of government-issued photo ID
   -  Proof of current address (utility bill or bank statement)`;
}

// ===============================================================
// 2. FURNISHER DIRECT DISPUTE (§ 623)
// ===============================================================
export function generateFurnisherDisputeLetter(data: DocumentData): string {
  const v = data.violations[0];
  return `${clientBlock(data)}
${data.today}

VIA CERTIFIED MAIL  -  RETURN RECEIPT REQUESTED

${data.creditorName || v?.defendantName || v?.defendant_name || '[FURNISHER NAME]'}
${data.creditorAddress || '[FURNISHER ADDRESS]'}

Re: DIRECT DISPUTE  -  Inaccurate Information Furnished to CRAs
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
   -  15 U.S.C. § 1681s-2(b)  -  Duties after notice of dispute
   -  15 U.S.C. § 1681n  -  Willful noncompliance ($100-$1,000 statutory + punitive + attorney fees)
   -  15 U.S.C. § 1681o  -  Negligent noncompliance (actual damages + attorney fees)

Sincerely,

____________________________
${data.clientName}

Enclosures: Copy of credit report; supporting documentation`;
}

// ===============================================================
// 3. FDCPA DEBT VALIDATION LETTER (§ 809)
// ===============================================================
export function generateDebtValidationLetter(data: DocumentData): string {
  const v = data.violations[0];
  return `${clientBlock(data)}
${data.today}

VIA CERTIFIED MAIL  -  RETURN RECEIPT REQUESTED

${data.creditorName || v?.defendantName || v?.defendant_name || '[COLLECTION AGENCY]'}
${data.creditorAddress || '[AGENCY ADDRESS]'}

Re: DEBT VALIDATION DEMAND  -  15 U.S.C. § 1692g(b)
    Alleged Account: #${data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]'}

Dear Sir or Madam:

I DISPUTE THIS ALLEGED DEBT IN ITS ENTIRETY.

Pursuant to 15 U.S.C. § 1692g(b) of the Fair Debt Collection Practices Act, I demand full validation of this alleged debt. Upon receipt of this letter, you must IMMEDIATELY CEASE ALL COLLECTION ACTIVITIES until proper validation is provided.

REQUIRED VALIDATION  -  You must provide ALL of the following:

1. VERIFICATION OF DEBT (§ 1692g(a)(1)-(4)):
    -  The exact amount of the alleged debt, itemized to show:
     - Original principal balance
     - All interest charges (with contractual authorization)
     - All fees added (with contractual or statutory authorization)
     - All payments or credits applied
    -  The name of the original creditor (§ 1692g(a)(2))

2. PROOF OF OWNERSHIP / AUTHORIZATION:
    -  Complete chain of title from the original creditor to your company
    -  Bill of sale or assignment agreement
    -  Proof that you are licensed to collect debts in the State of ${data.clientState || '[STATE]'}

3. PROOF OF CONTRACTUAL OBLIGATION:
    -  Copy of the original signed credit agreement or application
    -  Terms and conditions showing authorization for all charges
    -  Original creditor's final account statement

4. PROOF OF TIMELINESS:
    -  Documentation that the applicable statute of limitations has not expired
    -  Date of first delinquency

5. VERIFICATION OF REPORTING ACCURACY:
    -  Confirmation that dispute notation has been added to all credit bureau reports per § 1692e(8)

CEASE AND DESIST  -  15 U.S.C. § 1692c(c):

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

// ===============================================================
// 4. INTENT TO SUE LETTER
// ===============================================================
export function generateIntentToSueLetter(data: DocumentData): string {
  const totalMin = data.violations.reduce((s: number, v: any) => s + (v.totalDamagesMin || v.total_damages_min || 0), 0);
  const totalMax = data.violations.reduce((s: number, v: any) => s + (v.totalDamagesMax || v.total_damages_max || 0), 0);
  const critCount = data.violations.filter((v: any) => (v.severity === 'critical')).length;
  const highCount = data.violations.filter((v: any) => (v.severity === 'high')).length;

  return `${clientBlock(data)}
${data.today}

VIA CERTIFIED MAIL  -  RETURN RECEIPT REQUESTED

${data.creditorName || '[DEFENDANT NAME]'}
${data.creditorAddress || '[DEFENDANT ADDRESS]'}

Re: NOTICE OF INTENT TO FILE FEDERAL LAWSUIT
    Consumer: ${data.clientName}
    Violations: ${data.violations.length} identified (${critCount} Critical, ${highCount} High)
    Estimated Damages: $${totalMin.toLocaleString()}  -  $${totalMax.toLocaleString()}

Dear Sir or Madam:

This letter constitutes FORMAL NOTICE of my intent to file a federal lawsuit against your organization for violations of:

  [ ] Fair Credit Reporting Act, 15 U.S.C. § 1681 et seq.
  [ ] Fair Debt Collection Practices Act, 15 U.S.C. § 1692 et seq.
  [ ] Equal Credit Opportunity Act, 15 U.S.C. § 1691 et seq.

${'-'.repeat(60)}
IDENTIFIED VIOLATIONS (${data.violations.length} Total):
${'-'.repeat(60)}

${data.violations.map((v, i) => `${i + 1}. [${(v.severity || '').toUpperCase()}] ${v.statute}  -  ${v.subcategory}
   ${v.evidence}
   Potential Damages: $${(v.totalDamagesMin || v.total_damages_min || 0).toLocaleString()}  -  $${(v.totalDamagesMax || v.total_damages_max || 0).toLocaleString()}
`).join('\n')}
${'-'.repeat(60)}

DAMAGES I INTEND TO SEEK:

   -  Statutory damages: $100 - $1,000 per violation (§ 1681n(a)(1)(A))
   -  Actual damages: Credit denials, higher interest rates, lost opportunities, emotional distress
   -  Punitive damages: For willful violations (§ 1681n(a)(2))
   -  Attorney fees and court costs: Recoverable under § 1681n(a)(3)
   -  TOTAL ESTIMATED: $${totalMin.toLocaleString()}  -  $${totalMax.toLocaleString()}

SETTLEMENT OPPORTUNITY:

Before filing, I am willing to discuss pre-litigation resolution. You have FIFTEEN (15) DAYS from receipt of this letter to provide a written settlement proposal.

After 15 days, I will file a Complaint in the United States District Court without further notice, seeking all available remedies including trial by jury.

This letter is not a waiver of any rights, claims, or defenses.

Sincerely,

____________________________
${data.clientName}

cc: File`;
}

// ===============================================================
// 5. CFPB COMPLAINT
// ===============================================================
export function generateCFPBComplaint(data: DocumentData): string {
  return `${'='.repeat(60)}
CONSUMER FINANCIAL PROTECTION BUREAU  -  COMPLAINT
${'='.repeat(60)}

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

${'-'.repeat(60)}
WHAT HAPPENED:
${'-'.repeat(60)}

I obtained my consumer report and discovered ${data.violations.length} violation(s) of federal consumer protection law. Despite my attempts to resolve these issues through the standard dispute process, the inaccuracies persist.

SPECIFIC VIOLATIONS:

${data.violations.map((v, i) => `Violation ${i + 1}: ${v.subcategory}
  Law Violated: ${v.statute} (${v.statuteText || v.statute_text})
  Evidence: ${v.evidence}
  Legal Standard: ${v.legalStandard || v.legal_standard}
  Estimated Damages: $${(v.totalDamagesMin || v.total_damages_min || 0).toLocaleString()}  -  $${(v.totalDamagesMax || v.total_damages_max || 0).toLocaleString()}
`).join('\n')}

${'-'.repeat(60)}
STEPS ALREADY TAKEN:
${'-'.repeat(60)}

  1. Obtained and reviewed credit report for accuracy
  2. Identified ${data.violations.length} violation(s) of FCRA/FDCPA
  3. Sent dispute letter(s) to credit bureau(s)
  4. Sent direct dispute(s) to furnisher(s) under § 623(a)(8)
  5. Filed this CFPB complaint

${'-'.repeat(60)}
DESIRED RESOLUTION:
${'-'.repeat(60)}

  1. Immediate investigation and correction of ALL inaccurate information
  2. Updated credit report reflecting all corrections
  3. Written confirmation of changes from both CRA and furnisher
  4. Monetary compensation for damages caused by inaccurate reporting

SUPPORTING DOCUMENTATION: Credit report, dispute letters, correspondence.

This complaint is filed pursuant to 12 U.S.C. § 5534 (Consumer Financial Protection Act).

Filed by: ${data.clientName}
Date: ${data.today}`;
}

// ===============================================================
// 6. SECTION 609 DISCLOSURE REQUEST
// ===============================================================
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
    -  Every tradeline, account, and item in my file
    -  All information in my file at the time of the request

2. SOURCES OF INFORMATION (§ 1681g(a)(2)):
    -  The name, address, and telephone number of each person that furnished information in my file

3. INQUIRIES (§ 1681g(a)(3)):
    -  Identification of each person who procured a consumer report during the prior 2-year period
    -  The date of each inquiry
    -  The permissible purpose stated for each inquiry

4. DATES, ORIGINAL PAYEES, AND AMOUNTS OF CHECKS (§ 1681g(a)(4)):
    -  If applicable, on any checks returned for insufficient funds in the prior 2 years

5. CREDIT SCORES (§ 1681g(f)):
    -  All credit scores currently in my file
    -  The range of possible scores under the scoring model used
    -  All key factors (up to 4) that adversely affected my score
    -  The date the score was created
    -  The name of the scoring model used

6. SOFT INQUIRIES / PROMOTIONAL INQUIRIES:
    -  All soft inquiries and promotional inquiries on file

LEGAL BASIS: Under 15 U.S.C. § 1681g(a), you must make this disclosure clearly and accurately within 15 days of receiving this request when sent by mail.

I have enclosed copies of my government-issued photo ID and proof of address for identification verification.

Sincerely,

____________________________
${data.clientName}

Enclosures:
   -  Copy of government-issued photo ID
   -  Proof of current address`;
}

// ===============================================================
// 7. METHOD OF VERIFICATION REQUEST (§ 611)
// ===============================================================
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

NOTE: A "rubber stamp" verification that merely parrots back the same inaccurate data without conducting an actual investigation violates § 1681i(a)(1)(A). See Cushman v. Trans Union Corp., 115 F.3d 220 (3d Cir. 1997)  -  CRA must conduct a reasonable reinvestigation, not merely pass information back and forth.

If you fail to provide this information within 15 days, I will consider this a failure to comply with § 1681i(a)(7) and will include this violation in any subsequent legal action.

Sincerely,

____________________________
${data.clientName}`;
}

// ===============================================================
// 8. STATE ATTORNEY GENERAL COMPLAINT
// ===============================================================
export function generateStateAGComplaint(data: DocumentData): string {
  const totalMin = data.violations.reduce((s: number, v: any) => s + (v.totalDamagesMin || v.total_damages_min || 0), 0);
  const totalMax = data.violations.reduce((s: number, v: any) => s + (v.totalDamagesMax || v.total_damages_max || 0), 0);

  return `${'='.repeat(60)}
CONSUMER COMPLAINT  -  STATE ATTORNEY GENERAL
${'='.repeat(60)}

TO: Office of the Attorney General
    State of ${data.clientState || '[STATE]'}
    Consumer Protection Division

FROM: ${data.clientName}
      ${data.clientAddress}
      ${data.clientCity}, ${data.clientState} ${data.clientZip}

DATE: ${data.today}

SUBJECT: Violations of Federal and State Consumer Protection Laws
         by ${data.creditorName || data.violations[0]?.defendantName || data.violations[0]?.defendant_name || '[COMPANY NAME]'}

${'-'.repeat(60)}
COMPLAINT SUMMARY:
${'-'.repeat(60)}

I am filing this complaint against the above-named company for violations of the Fair Credit Reporting Act (15 U.S.C. § 1681 et seq.), Fair Debt Collection Practices Act (15 U.S.C. § 1692 et seq.), and applicable state consumer protection statutes.

I have identified ${data.violations.length} violations causing estimated damages of $${totalMin.toLocaleString()}  -  $${totalMax.toLocaleString()}.

${'-'.repeat(60)}
SPECIFIC VIOLATIONS:
${'-'.repeat(60)}

${data.violations.map((v, i) => `${i + 1}. [${(v.severity || '').toUpperCase()}] ${v.subcategory}
   Federal Law: ${v.statute}
   Details: ${v.evidence}
`).join('\n')}

${'-'.repeat(60)}
ACTIONS TAKEN:
${'-'.repeat(60)}

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

// ===============================================================
// 9. CEASE AND DESIST LETTER (FDCPA § 1692c(c))
// ===============================================================
export function generateCeaseAndDesist(data: DocumentData): string {
  const v = data.violations[0];
  return `${clientBlock(data)}
${data.today}

VIA CERTIFIED MAIL  -  RETURN RECEIPT REQUESTED

${data.creditorName || v?.defendantName || v?.defendant_name || '[COLLECTION AGENCY]'}
${data.creditorAddress || '[AGENCY ADDRESS]'}

Re: CEASE AND DESIST  -  ALL COMMUNICATION
    Alleged Account: #${data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]'}

Dear Sir or Madam:

Pursuant to my rights under 15 U.S.C. § 1692c(c) of the Fair Debt Collection Practices Act, I hereby demand that you IMMEDIATELY CEASE ALL COMMUNICATION with me regarding the alleged debt referenced above.

Under § 1692c(c), upon receipt of this notice you may ONLY contact me to:
  (1) Advise me that your collection efforts are being terminated;
  (2) Notify me that you or the creditor may invoke specified remedies which are ordinarily invoked; or
  (3) Notify me that you or the creditor intend to invoke a specified remedy.

ANY OTHER COMMUNICATION AFTER RECEIPT OF THIS LETTER CONSTITUTES A VIOLATION of the FDCPA, carrying penalties of:
   -  Up to $1,000 in statutory damages per violation (§ 1692k(a)(2)(A))
   -  Actual damages (§ 1692k(a)(1))
   -  Attorney fees and costs (§ 1692k(a)(3))

ADDITIONAL NOTICES:

1. I DISPUTE THIS DEBT. If you are reporting this account to any credit reporting agency, you MUST note that it is disputed per § 1692e(8).

2. DO NOT SELL OR TRANSFER this alleged debt to any other entity without first providing proper validation as demanded in my prior correspondence.

3. Any attempt to collect through a third party or substitute collector will be considered a violation of this cease and desist notice.

This letter does not constitute an acknowledgment of any debt.

Sincerely,

____________________________
${data.clientName}`;
}

// ===============================================================
// 10. GOODWILL ADJUSTMENT LETTER
// ===============================================================
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
   -  Obtain fair interest rates on loans
   -  Qualify for housing
   -  Secure employment (some employers check credit)
   -  Build a secure financial future

I have taken significant steps to improve my financial situation and would greatly appreciate your consideration of this goodwill request.

WHAT I AM REQUESTING:
   -  Update the account to show "Paid as Agreed" or "Current"
   -  Or, remove the late payment notation(s) from the payment history
   -  Report the update to all three bureaus: Equifax, Experian, and TransUnion

Thank you for your time and consideration. I look forward to continuing our positive relationship.

Sincerely,

____________________________
${data.clientName}`;
}

// ===============================================================
// 11. DATA FURNISHER DISPUTE LETTER
// ===============================================================
export function generateDataFurnisherDisputeLetter(data: DocumentData): string {
  const v = data.violations[0];
  const bureau = (data.bureau || 'equifax').toUpperCase();
  const address = BUREAU_ADDRESSES[bureau.toLowerCase()] || BUREAU_ADDRESSES.equifax;
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const balance = v?.currentBalance || v?.balance || '[BALANCE]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || v?.accountName || v?.account_name || '[FURNISHER NAME]';

  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

${clientBlock(data)}
${data.today}

${address}

Subject: Formal Dispute of Unauthorized Collection Account - Not a Legally Qualified Data Furnisher

To Whom It May Concern,

I am disputing the following account(s) reported by ${creditor}:

- Account #: ${acctNum}
- Disputed Amount: $${balance}
- Reason for Dispute: The entity reporting this account does not qualify as a legitimate data furnisher under the Fair Credit Reporting Act (FCRA) or your agency's reporting guidelines.

Legal Basis for Dispute:
Per the FCRA (§ 1681s-2) and your own furnisher requirements, a data furnisher must:
1. Regularly report consumer credit data (e.g., active accounts, payment history) as part of its ordinary business operations;
2. Maintain consistent reporting practices - not selectively report only derogatory or collection accounts.

The entity reporting this account, ${creditor}:
- Only reports accounts after they enter collections;
- Does not report active accounts, payment history, or other consumer data;
- Fails to meet the definition of a data furnisher and is instead acting as a collection agency.

This violates:
- FCRA § 1681s-2(a) (accuracy and completeness requirements);
- Your agency's contractual obligations with furnishers (requiring systematic reporting);
- FTC guidance (furnishing must be routine, not ad hoc).

Demand for Action:
1. Immediately delete this account from my credit report, as it is unlawfully reported by a non-furnisher.
2. Provide written confirmation of the deletion and an updated credit report.
3. Investigate the furnisher's reporting practices for systemic violations.

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

// ===============================================================
// 12. R1 COLLECTION DIRECT DISPUTE
// ===============================================================
export function generateR1CollectionDirectDispute(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const balance = v?.currentBalance || v?.balance || '[BALANCE]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || v?.accountName || v?.account_name || '[COLLECTION AGENCY]';
  const creditorAddr = data.creditorAddress || '[COLLECTION AGENCY ADDRESS]';

  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

${clientBlock(data)}
${data.today}

${creditor}
${creditorAddr}

RE: Credit Reporting - Account Number(s): ${acctNum}

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
- A system screen print
- A generic balance line
- A statement that the account was "confirmed with the prior creditor" without supporting documents
- A form letter that does not tie directly to this account with real, verifiable detail.

If your company has reported, or continues to report, invalidated or unverified information to any of the three major credit bureaus (Experian, Equifax, or TransUnion), that action may constitute fraud under both federal and state law. Should any negative mark appear on any of my credit reports as a result of your company or the company you represent, I will not hesitate to pursue legal action for violation of the Fair Credit Reporting Act, violation of the Fair Debt Collection Practices Act, and defamation of character.

During this validation period, any action taken that could be detrimental to my credit reports will be treated as grounds for suit. This includes listing information that is inaccurate or invalidated, or verifying this account as accurate when no proof of its accuracy has been provided.

This letter constitutes my written dispute and debt validation request under 15 U.S.C. § 1692g. If this dispute falls within the validation period, 15 U.S.C. § 1692g(b) requires you to cease all collection activity until proper verification is mailed to me. Regardless, you are now on notice that this account is disputed and must be treated as disputed.

Effective immediately, this letter also serves as written notice under 15 U.S.C. § 1692c(c) that you must cease communication with me regarding this alleged debt. Do not call, text, email, or contact third parties.

The only communications I will accept from you are:
1. Mailing the complete validation documents requested in this letter;
2. Written confirmation that you are closing or recalling the account, ceasing collection, and requesting deletion of any reporting made to the consumer reporting agencies; or
3. Written notice that you intend to pursue a specific legal remedy.

If you do provide proper documentation as requested, I will require at least 30 days to review it, and all collection activity must cease during that period.

Until you provide the requested information and documentation, I have no obligation to pay this alleged debt. If you cannot validate this debt, or fail to respond within 30 days, all references to this account must be deleted and completely removed from my credit reports, and written confirmation of that deletion  -  submitted to each of the three major credit reporting agencies  -  must be provided to me.

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

// ===============================================================
// 13. EVICTIONS LETTER (RFI: EVICTIONS)
// ===============================================================
export function generateEvictionsLetter(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || '[CREATIVE MANAGEMENT / PROPERTY / COURT]';
  const creditorAddr = data.creditorAddress || '[ADDRESS]';

  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

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

// ===============================================================
// 14. REPO LETTER (RFI REPO)
// ===============================================================
export function generateRepoLetter(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || '[LENDER / AUTO FINANCE]';
  const creditorAddr = data.creditorAddress || '[ADDRESS]';

  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

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

If you have any other variations of the consumer's name or address on file, please update your records to only reflect the correct name and address that have been provided above.

I also believe some of the information being reported to the consumer reporting agencies (CRAs) is inaccurate. For that reason, I am requesting all account-level documentation in addition to the following information:

- Retail Installment Sales Contract / Lease Agreement;
- Any Arbitration Provisions;
- Complete Accounting and Payment History Ledger;
- Notice of Sale / Notice of Default with proof of mailing;
- Explanation of Calculation of Surplus or Deficiency with proof of mailing;
- Notices regarding right to redeem personal property with proof of mailing;
- Details regarding whether the sale was public or private;
- Verification of the date of first delinquency;
- Verification of the date of repossession.

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

// ===============================================================
// 15. 1681I LETTER (1681 I LETTER TO CRA)
// ===============================================================
export function generate1681iLetter(data: DocumentData): string {
  const rawBureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[rawBureau] || BUREAU_ADDRESSES.equifax;

  let bureauName = 'Equifax';
  if (rawBureau === 'experian') bureauName = 'Experian';
  else if (rawBureau === 'transunion') bureauName = 'TransUnion';

  const clientNameParts = (data.clientName || '').trim().split(/\s+/);
  let firstName = '';
  let middleName = '';
  let lastName = '';
  if (clientNameParts.length === 1) {
    firstName = clientNameParts[0];
  } else if (clientNameParts.length === 2) {
    firstName = clientNameParts[0];
    lastName = clientNameParts[1];
  } else if (clientNameParts.length >= 3) {
    firstName = clientNameParts[0];
    middleName = clientNameParts.slice(1, -1).join(' ');
    lastName = clientNameParts[clientNameParts.length - 1];
  }

  const fullName = `${firstName}${middleName ? ' ' + middleName : ''} ${lastName}`;

  // Filter violations to current bureau
  let activeViolations = data.violations.filter(v => {
    const vBureau = (v.bureau || '').toLowerCase();
    return vBureau === rawBureau;
  });
  if (activeViolations.length === 0) {
    activeViolations = data.violations;
  }

  const bulletList = activeViolations.map(v => {
    const creditor = v.creditorName || v.defendantName || v.defendant_name || v.accountName || v.account_name || '[CREDITOR NAME]';
    const acctNum = v.accountNumber || v.account_number || '[ACCOUNT NUMBER]';
    const text = v.evidence || '[DISPUTE VERBIAGE]';
    return `• ${creditor} (Account #: ${acctNum}): ${text}`;
  }).join('\n');

  const confNum = data.reportId || '6062537823';
  const fileNum = data.reportId || '358261728';

  return `${data.today}

${bureauName}
‎
${address}


RE: Confirmation # ${confNum}     Date:${data.today}

I have reviewed my ${bureauName} credit report which I have obtained from your credit reporting agency, and the${bureauName} File Number is ${fileNum}. I have found out that in my credit report there is some information which is incomplete, inaccurate, or inconsistent.


Under 15 U.S. Code § 1681i, I am entitled to request a reinvestigation of any accounts on my credit report that contain inaccurate information. Please refer to 15 U.S. Code § 1681i(a)(1)(A) and 15 U.S. Code § 1681e(b) for further clarification.

I wish to opt out of all email communications. Please note that you may have an incorrect or outdated email address on file, which could result in my personal information being shared with unauthorized parties. Moving forward, I request that all correspondence be sent exclusively to my mailing address, which is provided above.


I am disputing the information below because I believe it is untrue, incomplete, inaccurate, or inconsistent, and I want you to investigate any information related to my personal information that is inaccurate, incomplete, not authenticated, or no longer valid. This will help ensure you're only maintaining accurate information about me, which reduces the risk of identity theft or a mixed file. I appreciate your efforts in retaining the following correct details on my record, listed below. The information listed is the only accurate personal data you should have on file. Please delete any other information that does not match.

My name is ${fullName}.My address is ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}.My last four SSN: ${data.clientSSNLast4 || ''}.My date of birth is ${data.clientDOB || ''}.

The following account(s) on my credit report from your agency, ${bureauName}, are inaccurate:
${bulletList}


I am requesting that you and the furnishers conduct a thorough investigation of the accounts I am disputing. Please forward a copy of this letter to each furnisher and make sure both you and they comply with the law by performing a proper investigation, not a generic response or a rubber stamp. I take the accuracy of my credit reports seriously, and it is essential that every piece of information is correct, complete, and fully verified. My report currently contains contradictory, incomplete, and incorrect information that cannot be verified, and whether that came from the furnisher or from your own reporting, it is now your responsibility to fix it.

I expect every account listed to be 100% accurate, complete, and verifiable. If it isn't, it must be deleted immediately, not corrected halfway. As you investigate, if you come across any other inaccurate, incomplete, or unverifiable information beyond what I've listed, I expect that to be corrected or deleted as well.

Once your investigation is complete, please send me the results along with a full copy of my file, meaning everything you have on me. That includes all inquiries, both hard and soft pulls, along with their stated purpose, and copies of certifications from anyone who has accessed my report. Under FCRA § 1681g, you're required to disclose all sources of information and identify anyone who accessed my file. Under FCRA § 1681i, I'm also requesting a description of the procedures used to investigate each disputed account, including the business name, address, and phone number of any furnisher you contacted.

Please don't ignore this letter or skip a real investigation. Under Section 1681i(a) of the Fair Credit Reporting Act, you're required to investigate disputed information and make sure only 100% accurate, verifiable, and complete information stays on my report. Anything that doesn't meet that standard must be promptly deleted.

I am sending this letter personally, not through a credit repair company, so please don't reject it based on the postmark location or anything else.

I am requesting a complete copy of my file after this reinvestigation is finished. As defined under 15 U.S.C. § 1681a(g), the term "file" means all information on me that you retain, regardless of how it's stored, so a partial disclosure would not satisfy this request and would not be lawful.

If you end up verifying or deeming any of the disputed information above as accurate and complete, I am requesting a description of the procedure used to determine that accuracy or completeness, including the business name, address, and phone number of any furnisher contacted, within 15 days of making that determination, as required under 15 U.S.C. § 1681i(a)(6)(B)(iii) and § 1681i(a)(7).

I have enclosed proof of my identity current mailing address, and My social security card. This is not required under the FCRA, but I'm including it to help move the investigation along without delay.

Sincerely,
${fullName}
‎
${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}`;
}

// ===============================================================
// 16. CHARGEOFF / LATE PAYMENT LETTER (RFI)
// ===============================================================
export function generateChargeoffLatePaymentLetter(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || '[CREDITOR NAME]';
  const creditorAddr = data.creditorAddress || '[ADDRESS]';

  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

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
- A full transaction and payment history ledger from account inception to present;
- Dates and amounts of all payments received;
- Application of payments (principal, interest, fees, credits, adjustments, or reversals);
- Any internal records relied upon in furnishing payment history information to consumer reporting agencies.

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

// ===============================================================
// 17. LEXISNEXIS CEASE AND DESIST
// ===============================================================
export function generateLexisNexisCeaseAndDesist(data: DocumentData): string {
  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

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

// ===============================================================
// 18. PACER INQUIRY EMAIL
// ===============================================================
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

// ===============================================================
// 19. BANKRUPTCY COURT INQUIRY LETTER
// ===============================================================
export function generateBankruptcyCourtInquiryLetter(data: DocumentData): string {
  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

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

// ===============================================================
// 20. LEXISNEXIS FOLLOW UP
// ===============================================================
export function generateLexisNexisFollowUp(data: DocumentData): string {
  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

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

// ===============================================================
// 21. AUTHORIZED USER DISPUTE
// ===============================================================
export function generateAuthorizedUserDispute(data: DocumentData): string {
  const v = data.violations[0];
  const acctNum = data.accountNumber || v?.accountNumber || v?.account_number || '[ACCOUNT NUMBER]';
  const creditor = data.creditorName || v?.defendantName || v?.defendant_name || v?.accountName || v?.account_name || '[FURNISHER NAME]';
  const bureau = (data.bureau || 'equifax').toUpperCase();
  const address = BUREAU_ADDRESSES[bureau.toLowerCase()] || BUREAU_ADDRESSES.equifax;

  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

${clientBlock(data)}
${data.today}

${address}

Re: Dispute of Authorized User Account Activity
Account: ${creditor} - #${acctNum}

Dear Sir or Madam:

My credit report shows account activity on ${creditor}  -  Account #${acctNum} that does not correspond to my usage on the account. I am an authorized user on the account and all account activity is being reported on my credit report. I am requesting that my credit report be updated to only include my account activity, or that this authorized user tradeline be deleted entirely.

Sincerely,

____________________________
${data.clientName}

-----------------------------------------------------------------------
Designed by Rick Jefferson, RJ Business Solutions
Website: https://rickjeffersonsolutions.com | Support: support@rjbusinesssolutions.org
-----------------------------------------------------------------------`;
}

// ===============================================================
// 22. LEXISNEXIS CONFIRMATION OF DELETION REQUEST
// ===============================================================
export function generateLexisNexisConfirmation(data: DocumentData): string {
  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM DISPUTE TEMPLATE
DESIGNED BY RICK JEFFERSON | POWERED BY RJ BUSINESS SOLUTIONS
=======================================================================

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

// ===============================================================
// 23. FEDERAL COURT COMPLAINT (FCRA LITIGATION TEMPLATE)
// ===============================================================
export function generateFederalCourtComplaint(data: DocumentData): string {
  const stateName = (data.clientState || 'STATE').toUpperCase();
  const v = data.violations[0];
  const defendantsList = ['EQUIFAX INFORMATION SERVICES, LLC', 'EXPERIAN INFORMATION SOLUTIONS, INC.', 'TRANSUNION, LLC'];
  if (data.creditorName || v?.defendantName || v?.defendant_name) {
    defendantsList.push((data.creditorName || v?.defendantName || v?.defendant_name).toUpperCase());
  }

  const caption = `UNITED STATES DISTRICT COURT
FOR THE DISTRICT OF ${stateName}
${'='.repeat(70)}
${data.clientName.toUpperCase()},
                      Plaintiff,
v.                                    Case No. __________________

${defendantsList.join(',\n')},
                      Defendants.
${'='.repeat(70)}
                  COMPLAINT AND DEMAND FOR JURY TRIAL
${'='.repeat(70)}`;

  const violationsListText = data.violations.map((v, i) => `
    a. ${v.accountName || v.account_name || v.defendantName || v.defendant_name || 'Creditor/Furnisher'} (Account #${v.accountNumber || v.account_number || 'N/A'}):
       Inaccuracy: ${v.subcategory || 'Inaccurate reporting'}
       Evidence: ${v.evidence || 'N/A'}
       Statutory Violations: ${v.statute || '15 U.S.C. § 1681 et seq.'} (${v.statuteText || 'Inaccurate credit reporting'})
  `).join('\n');

  return `${caption}

Plaintiff, ${data.clientName}, by and through counsel, hereby files this Complaint against Defendants, ${defendantsList.join(', ')}, and alleges as follows:

I. PRELIMINARY STATEMENT
1. This is an action for consumer damages, statutory penalties, punitive damages, and attorney's fees brought pursuant to the Fair Credit Reporting Act ("FCRA"), 15 U.S.C. § 1681 et seq.
2. Plaintiff brings this action against Defendants for their willful and/or negligent failure to perform reasonable reinvestigations and for their continued reporting of inaccurate, incomplete, and misleading credit and consumer data, in violation of 15 U.S.C. §§ 1681i and 1681s-2(b).

II. JURISDICTION AND VENUE
3. This Court has federal question jurisdiction pursuant to 28 U.S.C. § 1331 and 15 U.S.C. § 1681p.
4. Venue is proper in this district pursuant to 28 U.S.C. § 1391(b) because Plaintiff resides within this judicial district, and a substantial part of the events, omissions, and violations giving rise to these claims occurred here.

III. THE PARTIES
5. Plaintiff, ${data.clientName}, is a natural person and a "consumer" as defined by 15 U.S.C. § 1681a(c) residing at ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}.
6. Defendants Equifax, Experian, and TransUnion are "consumer reporting agencies" ("CRAs") as defined by 15 U.S.C. § 1681a(f), regularly assembling or evaluating consumer credit information for the purpose of furnishing consumer reports to third parties.
7. Defendant Furnisher (if applicable) is a corporation or entity regularly doing business in the State of ${data.clientState} and is a "furnisher" of consumer credit data under 15 U.S.C. § 1681s-2.

IV. FACTUAL ALLEGATIONS
8. Prior to the filing of this Complaint, Plaintiff's credit reports contained highly inaccurate, misleading, and incomplete information, specifically including:
${violationsListText}

9. Pursuant to 15 U.S.C. § 1681i, Plaintiff initiated formal written disputes with each of the credit bureau Defendants, detailing the specific inaccuracies and providing supporting evidence.
10. The bureau Defendants received Plaintiff's dispute correspondence, which triggered their statutory duties to conduct a reasonable reinvestigation of the disputed items and to forward all relevant information to the reporting furnishers.
11. Despite receiving physical notice and evidence of the inaccuracies, the Defendant CRAs failed to conduct a reasonable reinvestigation, failed to consider Plaintiff's evidence, and continued to report the false information.
12. Additionally, upon information and belief, the reporting furnishers failed to conduct a reasonable investigation of the disputes forwarded by the CRAs, in direct violation of 15 U.S.C. § 1681s-2(b).
13. As a direct and proximate result of Defendants' systemic failures and statutory violations, Plaintiff has suffered concrete, actual damages including, but not limited to: credit denials, loss of credit opportunities, increased borrowing costs, severe emotional distress, anxiety, humiliation, sleeplessness, and frustration.

V. CAUSES OF ACTION

COUNT I: WILLFUL VIOLATIONS OF THE FCRA (15 U.S.C. § 1681n)
(Against Credit Bureau Defendants and Furnishers)
14. Plaintiff re-alleges and incorporates all preceding paragraphs.
15. Defendants willfully and/or recklessly failed to comply with their duties under the FCRA, including but not limited to, failing to conduct reasonable reinvestigations (§ 1681i(a)) and failing to maintain reasonable procedures to ensure maximum possible accuracy of Plaintiff's consumer data (§ 1681e(b)).
16. As a result of Defendants' willful noncompliance, Plaintiff is entitled to statutory damages of up to $1,000 per violation, punitive damages as determined by a jury, and reasonable attorney's fees and costs pursuant to 15 U.S.C. § 1681n.

COUNT II: NEGLIGENT VIOLATIONS OF THE FCRA (15 U.S.C. § 1681o)
(Against Credit Bureau Defendants and Furnishers)
17. Plaintiff re-alleges and incorporates all preceding paragraphs.
18. Defendants negligently failed to comply with their statutory duties under the FCRA, including § 1681i and § 1681s-2(b).
19. As a result of Defendants' negligent noncompliance, Plaintiff is entitled to actual damages in an amount to be proven at trial, together with reasonable attorney's fees and costs pursuant to 15 U.S.C. § 1681o.

PRAYER FOR RELIEF
WHEREFORE, Plaintiff respectfully requests that this Court enter judgment in Plaintiff's favor and against Defendants, granting the following relief:
A. Award actual damages including emotional distress and economic loss;
B. Award statutory damages of up to $1,000 per violation;
C. Award punitive damages for willful and reckless conduct;
D. Award reasonable attorney's fees, expert witness fees, and court costs;
E. Order the complete deletion and correction of all disputed inaccurate records; and
F. Grant such other and further relief as this Court deems just and proper.

DEMAND FOR JURY TRIAL
Plaintiff hereby demands a trial by jury on all issues so triable.

Dated: ${data.today}

Respectfully submitted,

____________________________
Plaintiff, Pro Se (or Counsel)
${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}`;
}

// ===============================================================
// 24. PLAINTIFF'S FEDERAL AFFIDAVIT OF FACTS
// ===============================================================
export function generatePlaintiffAffidavitOfFacts(data: DocumentData): string {
  const v = data.violations[0];
  const itemsText = data.violations.map((v, i) => `
   - Tradeline/Item ${i + 1}: ${v.accountName || v.account_name || v.defendantName || v.defendant_name || 'N/A'} (Account #${v.accountNumber || v.account_number || 'N/A'})
     - Specific Inaccuracy: ${v.subcategory || 'Inaccurate Reporting'}
     - Impact/Harm: ${v.evidence || 'N/A'}`).join('\n');

  return `=======================================================================
RJ BUSINESS SOLUTIONS PREMIUM LITIGATION AID
PLAINTIFF'S AFFIDAVIT OF FACTS
=======================================================================

STATE OF ${data.clientState ? data.clientState.toUpperCase() : '____________'}
COUNTY OF ____________________

I, ${data.clientName}, being of lawful age and first duly sworn upon my oath, depose and state as follows under penalty of perjury:

1. I am the Plaintiff in this action. I have personal knowledge of the facts stated herein and, if called as a witness, am competent to testify to the truth of these matters.

2. My full legal name is ${data.clientName}. I currently reside at ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}. The last four digits of my Social Security Number are XXX-XX-${data.clientSSNLast4 || '____'}, and my date of birth is ${data.clientDOB || '__________'}.

3. I am a consumer protected under the Fair Credit Reporting Act ("FCRA"), 15 U.S.C. § 1681 et seq.

4. On or about ${data.today}, I accessed my consumer credit file and discovered major, damaging inaccuracies being published by the major consumer reporting agencies (Equifax, Experian, and TransUnion). Specifically, the following inaccurate credit tradelines were published:
${itemsText}

5. The aforementioned inaccuracies constitute material falsehoods that negatively impact my overall credit score, debt-to-limit ratios, and creditworthiness.

6. On multiple occasions, I initiated formal disputes in writing, sent via Certified Mail with Return Receipt, to each of the credit bureaus. In my disputes, I clearly detailed the inaccuracies, provided supporting records, and requested immediate corrections or deletions.

7. Despite receiving my clear evidence, the credit bureaus failed to conduct reasonable reinvestigations, continued to publish false consumer data, and verified the accuracy of the items with the furnishers without doing proper diligence.

8. As a direct result of the Defendants' continued publication of false data, I have suffered real, concrete injury and damages:
   a. CREDIT DENIALS & HIGHER RATES: I have been denied credit or forced to accept unfavorable, high-interest rates due to the defamed credit score.
   b. EMOTIONAL DISTRESS: This situation has caused me extreme stress, sleepless nights, panic, humiliation, and deep frustration. I have felt completely helpless watching these corporations defame my financial character.
   c. LOSS OF TIME: I have expended countless hours calling, writing, organizing files, and trying to resolve these false records, pulling me away from my work and family.

9. I declare under penalty of perjury under the laws of the United States of America that the foregoing statements are true, accurate, and correct to the best of my knowledge.

IN WITNESS WHEREOF, I have hereunto set my hand this _____ day of __________________, 2026.


__________________________________________
Affiant/Plaintiff: ${data.clientName}

NOTARY PUBLIC ACKNOWLEDGMENT

Subscribed and sworn to (or affirmed) before me on this _____ day of __________________, 2026 by ${data.clientName}, who proved to me on the basis of satisfactory evidence to be the person who appeared before me.

__________________________________________
Notary Public, State of ___________________
My Commission Expires: ___________________
[ SEAL ]`;
}

// ===============================================================
// 25. STATE COURT / SMALL CLAIMS COMPLAINT
// ===============================================================
export function generateStateCourtComplaint(data: DocumentData): string {
  const stateName = (data.clientState || 'STATE').toUpperCase();
  const v = data.violations[0];
  const defendant = data.creditorName || v?.defendantName || v?.defendant_name || 'Credit Bureau / Furnisher';

  const caption = `IN THE CIVIL COURT / SMALL CLAIMS DIVISION
IN AND FOR THE COUNTY OF ___________________, STATE OF ${stateName}
${'='.repeat(70)}
${data.clientName.toUpperCase()},
                      Plaintiff,
v.                                    Case No. __________________

${defendant.toUpperCase()},
                      Defendant.
${'='.repeat(70)}
                    CIVIL STATEMENT OF CLAIM / COMPLAINT
${'='.repeat(70)}`;

  const violationsText = data.violations.map((v, i) => `
    - Item ${i + 1}: ${v.accountName || v.account_name || v.defendantName || v.defendant_name || 'Defendant'}
      Account Number: #${v.accountNumber || v.account_number || 'N/A'}
      Inaccurate Info: ${v.subcategory || 'Incorrect trade details'}
      Harm/Statutory Violation: ${v.statute || 'FCRA § 1681 / State Consumer Act'}`).join('\n');

  return `${caption}

COMES NOW the Plaintiff, ${data.clientName}, appearing Pro Se, and files this Civil Complaint against Defendant, ${defendant}, alleging as follows:

I. JURISDICTION & VENUE
1. Plaintiff resides at ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}.
2. Defendant is regularly doing business in the County of ___________________, State of ${stateName}.
3. The amount in controversy does not exceed the jurisdictional limits of this court (exclusive of interest, attorney fees, and costs).

II. NATURE OF ACTION
4. Plaintiff seeks civil damages, statutory remedies, and equitable corrections for Defendant's unlawful publication of inaccurate consumer report information and/or failure to investigate credit disputes in violation of federal and state laws.

III. FACTUAL ALLEGATIONS
5. On or around ${data.today}, Defendant published or furnished inaccurate information concerning Plaintiff's credit, specifically:
${violationsText}

6. Plaintiff formally disputed this information in writing to the Defendant, notifying them of the specific errors and demanding correction.
7. Defendant received Plaintiff's dispute notice, but failed to conduct a proper, timely investigation, failed to modify or delete the inaccurate info, and continued to publish damaging falsehoods.
8. As a direct result of Defendant's negligence and willful disregard, Plaintiff's credit reputation has been defamed, causing credit denials, higher interest rates, and severe emotional distress.

IV. CLAIMS FOR RELIEF
COUNT I: NEGLIGENT/WILLFUL NONCOMPLIANCE WITH FCRA (15 U.S.C. §§ 1681n, 1681o)
9. Defendant failed to perform its mandatory statutory duties after receiving dispute notifications.
10. Plaintiff is entitled to actual damages, statutory damages, punitive damages, and costs.

COUNT II: STATE CONSUMER PROTECTION ACT / DEFAMATION
11. Defendant published defamatory financial falsehoods with reckless disregard for the truth.
12. Plaintiff is entitled to damages under state statutory and common law.

PRAYER FOR RELIEF
WHEREFORE, Plaintiff respectfully requests this Court enter judgment against Defendant for:
1. Actual damages in the maximum statutory small claims limit;
2. Statutory damages and penalties where applicable;
3. Court filing fees and service of process costs; and
4. An order directing Defendant to delete the false information immediately.

Dated: ${data.today}

Respectfully submitted,

__________________________________________
Plaintiff Pro Se: ${data.clientName}
Address: ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}
Phone: ${data.phone || 'N/A'}`;
}

// ===============================================================
// 26. FEDERAL COURT CIVIL COVER SHEET STATEMENT
// ===============================================================
export function generateCivilCoverSheetStatement(data: DocumentData): string {
  return `=======================================================================
FEDERAL COURT LITIGATION FILING AID
CIVIL COVER SHEET STATEMENT (FORM JS 44 EXPLANATORY SHEET)
=======================================================================

I. PLAINTIFF
Name: ${data.clientName}
Residence: ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}
County of Residence: ___________________________ (County of Plaintiff)

II. DEFENDANTS
Primary Bureau Defendants: 
   - Equifax Information Services, LLC (Atlanta, Fulton County, GA)
   - Experian Information Solutions, Inc. (Allen, Collin County, TX)
   - TransUnion, LLC (Chester, Delaware County, PA)
Other Defendants: ${data.creditorName || 'N/A'}

III. JURISDICTION (BASIS)
[X] 3. Federal Question (U.S. Government Not a Party)
    Statute: 15 U.S.C. § 1681 et seq. (Fair Credit Reporting Act)

IV. CITIZENSHIP OF PRINCIPAL PARTIES (For Diversity Cases)
Plaintiff: [X] 1. Citizen of This State
Defendants: [X] 5. Incorporated and Principal Place of Business in Another State

V. ORIGIN
[X] 1. Original Proceeding (Filing directly in Federal District Court)

VI. CAUSE OF ACTION
Brief Statement of Cause of Action:
Federal lawsuit brought under 15 U.S.C. § 1681 et seq. (Fair Credit Reporting Act) for willful and negligent noncompliance by credit bureaus and furnishers for failure to conduct reasonable reinvestigations after dispute notice, and for continuing to publish inaccurate defamed consumer credit records.

VII. REQUESTED IN COMPLAINT
[X] CHECK IF THIS IS A CLASS ACTION UNDER RULE 23, F.R.Cv.P. (If applicable)
DEMAND: $_____________________ (Specify estimated damages)
JURY DEMAND: [X] YES (Jury Trial Demanded in Complaint)

VIII. RELATED CASES (IF ANY)
Case Number: _________________________ Judge: _________________________

Dated: ${data.today}

Submitted by:

__________________________________________
Plaintiff Pro Se: ${data.clientName}
Mailing: ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}
Email: ${data.email || 'N/A'}  |  Phone: ${data.phone || 'N/A'}`;
}

// ===============================================================
// 27. PLAINTIFF'S MOTION FOR SUMMARY JUDGMENT OUTLINE
// ===============================================================
export function generateMotionSummaryJudgmentOutline(data: DocumentData): string {
  const stateName = (data.clientState || 'STATE').toUpperCase();
  const caption = `UNITED STATES DISTRICT COURT
FOR THE DISTRICT OF ${stateName}
${'='.repeat(70)}
${data.clientName.toUpperCase()},
                      Plaintiff,
v.                                    Case No. __________________

EQUIFAX INFORMATION SERVICES, LLC, et al.,
                      Defendants.
${'='.repeat(70)}
PLAINTIFF'S MEMORANDUM OF LAW IN SUPPORT OF MOTION FOR SUMMARY JUDGMENT
${'='.repeat(70)}`;

  return `${caption}

Plaintiff, ${data.clientName}, Pro Se, respectfully submits this Memorandum of Law in Support of Plaintiff's Motion for Summary Judgment on the issue of liability against Defendants.

I. INTRODUCTION & PROCEDURAL POSTURE
Plaintiff filed this action under the Fair Credit Reporting Act ("FCRA"), 15 U.S.C. § 1681 et seq., following Defendants' willful and negligent failure to perform reasonable reinvestigations of disputed credit report inaccuracies. Because there are no genuine disputes of material fact regarding Defendants' statutory breaches, Summary Judgment on liability is warranted.

II. STATEMENT OF UNDISPUTED MATERIAL FACTS
1. Plaintiff is a "consumer" residing at ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}.
2. Defendants are "consumer reporting agencies" (CRAs) as defined by 15 U.S.C. § 1681a(f).
3. On or before ${data.today}, Plaintiff's consumer credit report contained inaccurate accounts, including incorrect late payment statuses, open collection tradelines, or invalid balances.
4. Plaintiff formally notified Defendants in writing of the inaccuracies via Certified Mail, detailing the precise errors and attaching physical supporting documentation.
5. Defendants received Plaintiff's dispute correspondence.
6. Rather than conducting a "reasonable reinvestigation" as mandated by 15 U.S.C. § 1681i(a), Defendants rubber-stamped the disputes, sending a standard automated ACDV form, and accepted the furnisher's electronic verification without reviewing Plaintiff's attached physical evidence.
7. Defendants failed to correct or delete the inaccurate, misleading information and continued to publish Plaintiff's defamed credit file.

III. LEGAL STANDARD FOR SUMMARY JUDGMENT
Under Federal Rule of Civil Procedure 56(a), summary judgment is appropriate if "the movant shows that there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law." A fact is material if it might affect the outcome of the suit under governing law.

IV. ARGUMENT
A. DEFENDANTS BREACHED THEIR MANDATORY DUTY TO CONDUCT REASONABLE REINVESTIGATIONS (15 U.S.C. § 1681i(a))
1. Upon receipt of a dispute, CRAs are legally obligated to conduct a "reasonable reinvestigation" to determine whether the disputed information is inaccurate. See Cushman v. Trans Union Corp., 115 F.3d 220, 225 (3d Cir. 1997); Henniker v. Experian, 202 F. Supp. 3d (S.D.N.Y. 2016).
2. It is well-established that a CRA does not satisfy its duty of "reasonable reinvestigation" by merely checking if the furnisher's database matches its own. The CRA must weigh the consumer's provided physical proof against the furnisher's raw assertions. See Stevenson v. Employer's Mutual, 987 F.2d at 380; Richardson v. Fleet Bank, 190 F. Supp. 2d 81 (D. Mass. 2002).
3. Here, the undisputed facts show that Plaintiff supplied the CRAs with definitive proof of inaccuracy, which the CRAs completely ignored in favor of the furnisher's automated confirmation. This constitutes a clear breach of § 1681i(a).

B. DEFENDANTS' BREACH WAS WILLFUL AND RECKLESS UNDER § 1681n
1. A company acts willfully under § 1681n if its actions run counter to an unjustifiably high risk of harm. Safeco Ins. Co. of Am. v. Burr, 551 U.S. 47, 69 (2007).
2. By maintaining automated systems that systematically prioritize a furnisher's electronic matching code over a consumer's physical evidence, Defendants acted with reckless disregard for the consumer's rights under the FCRA.

V. CONCLUSION
There is no genuine issue of material fact that Defendants failed to perform their statutory reinvestigation duties. Plaintiff is entitled to Summary Judgment on the issue of liability under 15 U.S.C. §§ 1681n and 1681o, leaving the issue of damages for trial.

Dated: ${data.today}

Respectfully submitted,

__________________________________________
Plaintiff Pro Se: ${data.clientName}
Address: ${data.clientAddress}, ${data.clientCity}, ${data.clientState} ${data.clientZip}`;
}

// ===============================================================


// ===============================================================
// generateSection609UnverifiableInformationDispute
// ===============================================================
export function generateSection609UnverifiableInformationDispute(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
${data.clientName}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}

${data.clientPhone || ''}

${data.clientEmail || ''}



${data.today}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${BUREAU_ADDRESSES[(data.bureau || 'equifax').toLowerCase()] || 'P.O. Box 1000, Allen, TX 75013'}

${data.clientCity}, ${data.clientState} ${data.clientZip}



RE: FORMAL DISPUTE PURSUANT TO 15 U.S.C. § 1681i

    CONSUMER FILE NUMBER: [FILE NUMBER]

    SOCIAL SECURITY NUMBER: XXX-XX-${data.clientSSNLast4 || 'XXXX'}



Dear Sir or Madam:



This letter is a formal dispute submitted pursuant to my rights under the Fair Credit Reporting Act, 15 U.S.C. § 1681i. I am writing to dispute inaccurate, unverifiable, and obsolete information appearing on my consumer credit report dated ${data.today}.



DISPUTED ITEMS REQUIRING DELETION:



ITEM #1: ${data.creditorName || 'CREDITOR'}

- Account Number: [LAST 4 DIGITS ONLY]

- Dispute Reason: [INACCURATE BALANCE / OBSOLETE / NOT MY ACCOUNT / PAID IN FULL]

- Specific Inaccuracy: [DETAILED DESCRIPTION]

- Supporting Documentation: Attached [DOCUMENT NAME]



ITEM #2: ${data.creditorName || 'CREDITOR'}

- Account Number: ${data.clientSSNLast4 || 'XXXX'}

- Dispute Reason: [REASON]

- Specific Inaccuracy: Detailed report inaccuracy and incorrect reporting status.

- Supporting Documentation: Attached [DOCUMENT NAME]



ITEM #3: ${data.creditorName || 'CREDITOR'}

- Account Number: ${data.clientSSNLast4 || 'XXXX'}

- Dispute Reason: [REASON]

- Specific Inaccuracy: Detailed report inaccuracy and incorrect reporting status.

- Supporting Documentation: Attached [DOCUMENT NAME]



LEGAL REQUIREMENTS:



Pursuant to 15 U.S.C. § 1681i(a)(1)(A), you are required to:



1. Conduct a reasonable reinvestigation to determine whether the disputed information is accurate;

2. Complete this investigation within thirty (30) days of receipt of this letter;

3. Review all relevant information provided by me;

4. Forward all relevant information to the furnisher within five (5) business days;

5. Record the current status of the disputed information or DELETE the items from my file;

6. Provide me with written notice of the results of the reinvestigation; and

7. Provide me with a free copy of my credit report if changes are made.



SUPPORTING DOCUMENTATION ENCLOSED:



I am enclosing the following documentation to support my dispute:

- [DOCUMENT 1: e.g., "Payment receipts showing account paid in full"]

- [DOCUMENT 2: e.g., "Letter from creditor confirming account closure"]

- [DOCUMENT 3: e.g., "Bankruptcy discharge order"]

- [DOCUMENT 4: e.g., "Identity theft report"]



REASONABLE PROCEDURES REQUIREMENT:



As mandated by 15 U.S.C. § 1681e(b), you must "follow reasonable procedures to assure maximum possible accuracy" of the information in my credit file. The continued reporting of inaccurate information constitutes a violation of this requirement.



I expect that you will conduct a thorough and reasonable investigation, not merely a superficial verification. The Third Circuit Court of Appeals held in Cushman v. Trans Union Corp., 115 F.3d 220 (3d Cir. 1997), that a consumer reporting agency's duty to conduct a reasonable investigation requires more than simply parroting information received from the furnisher.



REQUESTED ACTION:



Based on the inaccuracies identified above and the supporting documentation provided, I request that you:



1. DELETE all disputed items from my credit file immediately;

2. Provide written confirmation of deletion;

3. Send updated credit reports to all parties who received my credit report within the past six (6) months (or two years for employment purposes);

4. Provide me with a complimentary copy of my updated credit report; and

5. Provide me with the names and addresses of all furnishers contacted during your investigation.



NOTICE OF LEGAL RIGHTS:



Please be advised that I am aware of my rights under the FCRA, including:



- The right to statutory damages of $100 to $1,000 per willful violation (15 U.S.C. § 1681n);

- The right to actual damages for harm caused by negligent violations (15 U.S.C. § 1681o);

- The right to punitive damages for willful violations;

- The right to attorney's fees and costs; and

- The right to file complaints with the Consumer Financial Protection Bureau and Federal Trade Commission.



I expect full compliance with the FCRA. Failure to properly investigate this dispute or continued reporting of inaccurate information may result in legal action.



RESPONSE REQUIRED:



Please provide your written response to this dispute within thirty (30) days to the address listed above. I also request that you provide:



1. A detailed description of the reinvestigation procedure you followed;

2. Copies of all documents reviewed during the investigation;

3. The name and contact information for each furnisher contacted;

4. Copies of all correspondence with furnishers; and

5. The specific basis for verifying any disputed item you decline to delete.



I hereby certify that all information provided in this letter is true and accurate to the best of my knowledge.



Thank you for your immediate attention to this matter.



Sincerely,





_________________________

${data.clientName}

${data.clientName}



ENCLOSURES:

- Copy of Credit Report (with disputed items highlighted)

- [LIST ALL SUPPORTING DOCUMENTS]

- Copy of Driver's License

- Copy of Social Security Card

- Proof of Address (utility bill)



DELIVERY METHOD: Certified Mail, Return Receipt Requested

TRACKING NUMBER: [TO BE ADDED UPON MAILING]

\`\`\`



---`;
}


// ===============================================================
// generateSection611MaximumAccuracyDemand
// ===============================================================
export function generateSection611MaximumAccuracyDemand(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
${data.clientName}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}

${data.clientPhone || ''}

${data.clientEmail || ''}



${data.today}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${BUREAU_ADDRESSES[(data.bureau || 'equifax').toLowerCase()] || 'P.O. Box 1000, Allen, TX 75013'}

${data.clientCity}, ${data.clientState} ${data.clientZip}



RE: DEMAND FOR COMPLIANCE WITH 15 U.S.C. § 1681e(b)

    MAXIMUM POSSIBLE ACCURACY REQUIREMENT

    CONSUMER FILE: [FILE NUMBER]



CERTIFIED MAIL - RETURN RECEIPT REQUESTED



Dear Sir or Madam:



This letter constitutes formal notice that your consumer reporting agency has violated 15 U.S.C. § 1681e(b) by failing to follow reasonable procedures to assure maximum possible accuracy of information in my consumer file.



STATUTORY VIOLATION IDENTIFIED:



The Fair Credit Reporting Act, 15 U.S.C. § 1681e(b), provides:



"Whenever a consumer reporting agency prepares a consumer report it shall follow reasonable procedures to assure maximum possible accuracy of the information concerning the individual about whom the report relates."



Your agency has violated this provision by reporting the following inaccurate information:



INACCURATE ITEM #1:

- Creditor: [NAME]

- Account: ${data.clientSSNLast4 || 'XXXX'}

- Reported Information: [WHAT CRA IS REPORTING]

- Actual Truth: [WHAT IS FACTUALLY ACCURATE]

- Evidence: [ATTACHED PROOF]



INACCURATE ITEM #2:

- Creditor: [NAME]

- Account: ${data.clientSSNLast4 || 'XXXX'}

- Reported Information: [WHAT CRA IS REPORTING]

- Actual Truth: [WHAT IS FACTUALLY ACCURATE]

- Evidence: [ATTACHED PROOF]



LEGAL STANDARD FOR ACCURACY:



The term "maximum possible accuracy" imposes the highest standard of accuracy in consumer reporting. Your procedures have failed to meet this standard because:



1. You reported [SPECIFIC INACCURACY] despite readily available evidence to the contrary;

2. You failed to verify the accuracy of furnisher-provided information;

3. You did not review or consider the documentary evidence I previously provided;

4. You employed automated "verification" systems that constitute mere parroting rather than genuine investigation;

5. [OTHER SPECIFIC FAILURES]



CASE LAW AUTHORITY:



Federal courts have consistently held that consumer reporting agencies must do more than simply accept information from furnishers:



- Cushman v. Trans Union Corp., 115 F.3d 220 (3d Cir. 1997): A CRA cannot simply parrot information but must conduct an actual investigation.



- Sepulvado v. CSC Credit Services, Inc., 158 F.3d 890 (5th Cir. 1998): The reasonableness of procedures must be evaluated in light of all circumstances.



- Philbin v. Trans Union Corp., 101 F.3d 957 (3d Cir. 1996): A CRA has an independent duty to verify accuracy.



EVIDENCE OF INACCURACY:



I am providing the following irrefutable evidence proving the inaccuracy of the reported information:



EXHIBIT A: [DESCRIPTION - e.g., "Certified letter from creditor confirming account paid in full on DATE"]



EXHIBIT B: [DESCRIPTION - e.g., "Bank statements showing final payment cleared on DATE"]



EXHIBIT C: [DESCRIPTION - e.g., "Court order discharging debt in bankruptcy on DATE"]



EXHIBIT D: [DESCRIPTION - e.g., "Written statement from original creditor confirming account never existed"]



This evidence conclusively establishes that the information in my credit file is inaccurate and must be deleted immediately.



IMMEDIATE DELETION REQUIRED:



Given the clear and convincing evidence of inaccuracy, I demand that you:



1. IMMEDIATELY DELETE all inaccurate items identified above;

2. CEASE all reporting of this inaccurate information to third parties;

3. SEND corrected credit reports to all parties who received inaccurate reports within the past:

   - Six (6) months for credit purposes

   - Two (2) years for employment purposes

4. PROVIDE me with written confirmation of deletion within ten (10) business days;

5. PROVIDE me with a complimentary updated credit report showing deletions;

6. IMPLEMENT procedures to prevent future reporting of this inaccurate information.



NOTICE OF POTENTIAL LIABILITY:



Your continued reporting of inaccurate information after receiving this notice and supporting documentation may constitute WILLFUL NONCOMPLIANCE under 15 U.S.C. § 1681n.



Willful noncompliance includes "reckless disregard" of statutory obligations. Safeco Ins. Co. v. Burr, 551 U.S. 47, 57 (2007). Continuing to report information as accurate when presented with clear evidence of inaccuracy constitutes reckless disregard.



Liability for willful noncompliance includes:

- Statutory damages: $100 to $1,000 per violation

- Actual damages: Unlimited

- Punitive damages: At court's discretion

- Attorney's fees and costs



DEADLINE FOR RESPONSE:



I expect your written response within fifteen (15) days of receipt of this letter, including:



1. Confirmation that all inaccurate items have been deleted;

2. A complimentary copy of my updated credit report;

3. Confirmation that corrected reports have been sent to all previous recipients;

4. A detailed explanation of the corrective actions taken; and

5. Written assurance that the inaccurate information will not be re-reported.



PRESERVATION OF RIGHTS:



This letter does not waive any of my rights under the FCRA or any other applicable law. I reserve all rights to pursue legal remedies, including filing suit in federal court and filing complaints with:



- Consumer Financial Protection Bureau (CFPB)

- Federal Trade Commission (FTC)

- [STATE] Attorney General

- [STATE] Department of Financial Services



Your immediate attention to this matter is required.



Sincerely,





_________________________

${data.clientName}

${data.clientName}



ENCLOSURES:

[LIST ALL EXHIBITS]



CC: Consumer Financial Protection Bureau

    Federal Trade Commission

    [STATE] Attorney General

\`\`\`



---`;
}


// ===============================================================
// generateSection623DirectFurnisherDispute
// ===============================================================
export function generateSection623DirectFurnisherDispute(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
${data.clientName}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}

${data.clientPhone || ''}

${data.clientEmail || ''}



${data.today}



[FURNISHER NAME]

[FURNISHER ADDRESS]

${data.clientCity}, ${data.clientState} ${data.clientZip}



RE: DIRECT DISPUTE PURSUANT TO 15 U.S.C. § 1681s-2(a)(8)

    ACCOUNT NUMBER: [LAST 4 DIGITS ONLY]

    NOTICE OF INACCURATE INFORMATION FURNISHED TO CRAs



CERTIFIED MAIL - RETURN RECEIPT REQUESTED



Dear Sir or Madam:



I am writing to notify you that you are furnishing inaccurate information to consumer reporting agencies regarding my account, in violation of the Fair Credit Reporting Act, 15 U.S.C. § 1681s-2.



ACCOUNT INFORMATION:

- Account Holder Name: [NAME]

- Account Number: ${data.clientSSNLast4 || 'XXXX'}

- Original Creditor: [IF DIFFERENT]

- Account Type: [CREDIT CARD / INSTALLMENT LOAN / MORTGAGE / ETC.]



INACCURATE INFORMATION BEING FURNISHED:



You are currently reporting the following inaccurate information to consumer reporting agencies:



1. ACCOUNT STATUS: You report the account as [CURRENT STATUS], when in fact [ACTUAL STATUS].



2. BALANCE: You report a balance of $$1,000.00, when the actual balance is $$1,000.00 or the account was [PAID IN FULL / SETTLED / DISCHARGED IN BANKRUPTCY].



3. PAYMENT HISTORY: You report [LATE PAYMENTS / CHARGE-OFF / COLLECTION STATUS] when [ACTUAL PAYMENT HISTORY].



4. DATE OF FIRST DELINQUENCY: You report DOFD as ${data.today}, when the actual DOFD is ${data.today} or no delinquency occurred.



5. [OTHER SPECIFIC INACCURACIES]



LEGAL OBLIGATIONS OF FURNISHERS:



Pursuant to 15 U.S.C. § 1681s-2(a), you have the following duties:



§ 1681s-2(a)(1)(A) - ACCURACY REQUIREMENT:

"A person shall not furnish any information relating to a consumer to any consumer reporting agency if the person knows or has reasonable cause to believe that the information is inaccurate."



You are currently violating this provision by furnishing information you know or should know is inaccurate.



§ 1681s-2(a)(2) - DUTY TO INVESTIGATE:

After receiving notice of a dispute from a consumer reporting agency, you must:

- Conduct an investigation

- Review all relevant information

- Report results to the CRA



§ 1681s-2(a)(8) - DIRECT DISPUTE OBLIGATION:

You must investigate disputes received directly from consumers if I provide sufficient information to investigate, including:

- My identity

- The specific inaccuracy

- Supporting documentation



SUPPORTING DOCUMENTATION:



I am providing the following documentation proving the inaccuracy:



EXHIBIT 1: Detailed report inaccuracy and incorrect reporting status.

EXHIBIT 2: Detailed report inaccuracy and incorrect reporting status.

EXHIBIT 3: Detailed report inaccuracy and incorrect reporting status.

EXHIBIT 4: Detailed report inaccuracy and incorrect reporting status.



This documentation conclusively establishes that the information you are furnishing is inaccurate.



REQUIRED CORRECTIVE ACTION:



Pursuant to 15 U.S.C. § 1681s-2(a)(3), upon determining that information is inaccurate or incomplete, you must:



1. Promptly NOTIFY all consumer reporting agencies to which you furnished the inaccurate information;

2. Provide CORRECTIONS to those agencies;

3. CEASE furnishing the inaccurate information;

4. Provide ME with written confirmation of the corrections made; and

5. MODIFY your internal records to reflect accurate information.



Specifically, I demand that you:



☐ DELETE the account entirely from all credit reports

☐ UPDATE the account status to: [CORRECT STATUS]

☐ CORRECT the balance to: $[CORRECT AMOUNT] or ZERO

☐ REMOVE all inaccurate late payment notations

☐ UPDATE the Date of First Delinquency to: [CORRECT DATE]

☐ MARK the account as "DISPUTED BY CONSUMER"

☐ [OTHER SPECIFIC CORRECTIONS]



DEADLINE: 30 DAYS



Pursuant to the reasonable investigation standards established by federal courts, I expect you to complete your investigation and provide corrections within thirty (30) days of receipt of this letter.



PROHIBITION ON CONTINUED REPORTING:



15 U.S.C. § 1681s-2(a)(1)(B) provides:



"A person shall not furnish information relating to a consumer to any consumer reporting agency if... the person has been notified by the consumer... that specific information is inaccurate, and the information is, in fact, inaccurate."



You are hereby NOTIFIED that the information identified above is inaccurate. Continued furnishing of this information after this notice may constitute WILLFUL VIOLATION of the FCRA.



NOTICE OF NEGATIVE INFORMATION:



If you have not already done so, you are required by 15 U.S.C. § 1681s-2(a)(7) to provide me with written notice when you furnish negative information to a consumer reporting agency. If you have failed to provide this notice, you have violated the FCRA.



LEGAL CONSEQUENCES OF NON-COMPLIANCE:



Federal courts have held furnishers liable for:



- Furnishing information known to be inaccurate

- Failing to conduct reasonable investigations

- Ignoring obvious evidence of inaccuracy



See: Johnson v. MBNA Am. Bank, NA, 357 F.3d 426 (4th Cir. 2004); Gorman v. Wolpoff & Abramson, LLP, 584 F.3d 1147 (9th Cir. 2009).



While 15 U.S.C. § 1681s-2(a) does not provide a private right of action, violations may be enforced by:

- The Consumer Financial Protection Bureau

- The Federal Trade Commission

- State Attorneys General

- Consumers through § 1681s-2(b) after CRA dispute



Additionally, furnishing inaccurate information may violate:

- State consumer protection laws (providing private right of action)

- State unfair/deceptive practices acts

- Common law defamation



REQUIRED RESPONSE:



Within thirty (30) days, please provide me with:



1. Written confirmation that you have corrected the inaccurate information;

2. Copies of all corrections sent to consumer reporting agencies;

3. A detailed explanation of your investigation findings;

4. Copies of all documentation reviewed during your investigation;

5. Contact information for the individual who conducted the investigation; and

6. Confirmation that you will not re-report the inaccurate information.



VERIFICATION OF IDENTITY:



To satisfy any identity verification requirements, I am enclosing:

- Copy of driver's license

- Copy of recent utility bill

- [OTHER IDENTITY DOCUMENTS]



CONTACT INFORMATION:



Please direct all correspondence regarding this dispute to:



${data.clientName}

${data.clientAddress}

${data.clientPhone || ''}

${data.clientEmail || ''}



PRESERVATION OF RIGHTS:



This letter does not waive any rights I may have under federal or state law. I reserve the right to file complaints with regulatory agencies and to pursue all available legal remedies.



I expect your prompt attention to this matter and full compliance with your obligations under the Fair Credit Reporting Act.



Sincerely,





_________________________

${data.clientName}

${data.clientName}



ENCLOSURES:

- Supporting Documentation (Exhibits 1-4)

- Copy of Credit Report showing inaccurate information

- Identity Verification Documents



DELIVERY: Certified Mail, Return Receipt Requested

TRACKING: ${data.accountNumber || 'XXXX-XXXX-XXXX'}



CC: Consumer Financial Protection Bureau

    [CREDIT REPORTING AGENCIES]

\`\`\`



---`;
}


// ===============================================================
// generateObsoleteInformationDeletionDemand
// ===============================================================
export function generateObsoleteInformationDeletionDemand(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
${data.clientName}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}



${data.today}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${data.clientAddress}



RE: DEMAND FOR DELETION OF OBSOLETE INFORMATION

    VIOLATION OF 15 U.S.C. § 1681c(a)

    FILE NUMBER: ${data.accountNumber || 'XXXX-XXXX-XXXX'}



CERTIFIED MAIL - RETURN RECEIPT REQUESTED



Dear Sir or Madam:



Your agency is violating 15 U.S.C. § 1681c(a) by reporting obsolete information on my consumer credit report. I demand immediate deletion of this information.



STATUTORY VIOLATION:



15 U.S.C. § 1681c(a)(4) prohibits reporting:



"Accounts placed for collection or charged to profit and loss which antedate the report by more than seven years."



The seven-year period is calculated from the "date of the commencement of the delinquency which immediately preceded the collection activity, charge to profit and loss, or similar action." 15 U.S.C. § 1681c(c)(1).



OBSOLETE ACCOUNTS REQUIRING IMMEDIATE DELETION:



ACCOUNT #1:

- Creditor: [NAME]

- Account Number: ${data.clientSSNLast4 || 'XXXX'}

- Date of First Delinquency (DOFD): ${data.today}

- Seven-Year Removal Date: [DOFD + 7 YEARS]

- Current Date: [TODAY'S DATE]

- Days Past Removal Deadline: ${data.accountNumber || 'XXXX-XXXX-XXXX'} DAYS

- STATUS: OBSOLETE - MUST BE DELETED



ACCOUNT #2:

- Creditor: [NAME]

- Account Number: ${data.clientSSNLast4 || 'XXXX'}

- Date of First Delinquency (DOFD): ${data.today}

- Seven-Year Removal Date: [DOFD + 7 YEARS]

- Current Date: [TODAY'S DATE]

- Days Past Removal Deadline: ${data.accountNumber || 'XXXX-XXXX-XXXX'} DAYS

- STATUS: OBSOLETE - MUST BE DELETED



ACCOUNT #3:

- Creditor: [NAME]

- Account Number: ${data.clientSSNLast4 || 'XXXX'}

- Date of First Delinquency (DOFD): ${data.today}

- Seven-Year Removal Date: [DOFD + 7 YEARS]

- Current Date: [TODAY'S DATE]

- Days Past Removal Deadline: ${data.accountNumber || 'XXXX-XXXX-XXXX'} DAYS

- STATUS: OBSOLETE - MUST BE DELETED



CALCULATION METHOD:



The DOFD is the anchor date for obsolescence calculation. It is NOT:

- The date of last activity (DOLA)

- The date the account was charged off

- The date the account was sold to a collection agency

- The date of last payment



The DOFD is frozen and cannot be changed by subsequent activity, payment, or transfer.



PROOF OF OBSOLESCENCE:



Your own credit report lists the DOFD for each account. Simple mathematical calculation proves the accounts are obsolete:



ACCOUNT #1: [DOFD] + 7 years = [REMOVAL DATE], which was 30 days days ago

ACCOUNT #2: [DOFD] + 7 years = [REMOVAL DATE], which was 30 days days ago

ACCOUNT #3: [DOFD] + 7 years = [REMOVAL DATE], which was 30 days days ago



NO EXCEPTIONS APPLY:



The seven-year rule has limited exceptions under 15 U.S.C. § 1681c(b):

- Credit transactions involving $150,000 or more

- Life insurance policies of $150,000 or more

- Employment with annual salary of $75,000 or more



My credit report was NOT obtained for any of these purposes. Therefore, the seven-year rule applies without exception.



RE-AGING IS PROHIBITED:



If you or the furnisher altered the DOFD to extend reporting, this constitutes illegal "re-aging" and violates:

- 15 U.S.C. § 1681c(c)(1) - DOFD must be date delinquency commenced

- 15 U.S.C. § 1681e(b) - Duty to maintain accurate information

- CFPB Bulletin 2012-08 - Prohibition on improper obsolescence calculations



IMMEDIATE DELETION REQUIRED:



Because the accounts identified above are obsolete as a matter of law, I demand:



1. IMMEDIATE PERMANENT DELETION of all obsolete accounts;

2. WRITTEN CONFIRMATION of deletion within 5 business days;

3. UPDATED CREDIT REPORT showing deletions;

4. NOTIFICATION to all parties who received my credit report within the past:

   - 6 months (for credit purposes)

   - 2 years (for employment purposes)

5. ASSURANCE that obsolete information will not be re-reported.



LIABILITY FOR CONTINUED REPORTING:



Reporting obsolete information is a PER SE VIOLATION of the FCRA. No investigation is required—the mathematical calculation proves the violation.



Continued reporting after this notice constitutes WILLFUL NONCOMPLIANCE under 15 U.S.C. § 1681n, exposing you to:

- Statutory damages: $100 to $1,000 per violation

- Actual damages

- Punitive damages

- Attorney's fees and costs



CASE LAW:



Nelson v. Chase Manhattan Mortgage Corp., 282 F.3d 1057 (9th Cir. 2002): "Reporting outdated information is inaccurate reporting."



Courts have consistently held that reporting past the seven-year deadline is a clear violation requiring damages.



DEADLINE:



Delete the obsolete accounts within FIVE (5) BUSINESS DAYS and provide written confirmation.



This is not a request subject to "investigation." This is a demand for compliance with an unambiguous statutory deadline that has already passed.



Sincerely,





_________________________

${data.clientName}

[NAME]



ENCLOSURES:

- Credit Report with DOFD dates highlighted

- Obsolescence calculation worksheet



DELIVERY: Certified Mail

TRACKING: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

\`\`\`



---`;
}


// ===============================================================
// generateUnauthorizedInquiryRemovalLetter
// ===============================================================
export function generateUnauthorizedInquiryRemovalLetter(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
${data.clientName}

${data.clientAddress}



${data.today}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${data.clientAddress}



RE: UNAUTHORIZED INQUIRY REMOVAL DEMAND

    VIOLATION OF 15 U.S.C. § 1681b

    FILE: ${data.accountNumber || 'XXXX-XXXX-XXXX'}



CERTIFIED MAIL - RETURN RECEIPT REQUESTED



Dear Sir or Madam:



I am writing to dispute unauthorized inquiries appearing on my consumer credit report in violation of 15 U.S.C. § 1681b (Permissible Purposes).



UNAUTHORIZED INQUIRIES:



The following inquiries appear on my credit report WITHOUT my authorization:



INQUIRY #1:

- Creditor/Company: [NAME]

- Date of Inquiry: ${data.today}

- Type: [HARD INQUIRY]

- Reason: UNAUTHORIZED - I did not apply for credit with this company



INQUIRY #2:

- Creditor/Company: [NAME]

- Date of Inquiry: ${data.today}

- Type: [HARD INQUIRY]

- Reason: UNAUTHORIZED - I did not give written consent



INQUIRY #3:

- Creditor/Company: [NAME]

- Date of Inquiry: ${data.today}

- Type: [HARD INQUIRY]

- Reason: UNAUTHORIZED - No permissible purpose existed



PERMISSIBLE PURPOSE REQUIREMENT:



15 U.S.C. § 1681b provides that consumer reports may be furnished ONLY when:



(1) Authorized in writing by the consumer;

(2) For a credit transaction involving the consumer;

(3) For employment purposes with written consent;

(4) For underwriting insurance;

(5) For legitimate business need in a business transaction; or

(6) Other specific statutory purposes.



NONE of these permissible purposes existed for the inquiries listed above.



LACK OF AUTHORIZATION:



I hereby certify that:



☐ I did NOT apply for credit with ${data.creditorName || 'CREDITOR'} on or about ${data.today}

☐ I did NOT authorize ${data.creditorName || 'CREDITOR'} to obtain my credit report

☐ I did NOT provide written consent for this inquiry

☐ No business transaction existed that would justify this inquiry

☐ This inquiry was made without any permissible purpose



HARM CAUSED:



Unauthorized hard inquiries have damaged my credit by:

- Lowering my credit score by approximately [POINTS]

- Creating the appearance of credit-seeking behavior

- Potentially causing credit denials

- Violating my privacy rights



IMMEDIATE REMOVAL REQUIRED:



Pursuant to 15 U.S.C. § 1681e(b) (duty to maintain accurate information), you must:



1. IMMEDIATELY REMOVE all unauthorized inquiries

2. INVESTIGATE the permissible purpose for each inquiry

3. OBTAIN proof of my written authorization from the inquiring party

4. DELETE any inquiry for which no authorization exists

5. PROVIDE written confirmation of removal



INVESTIGATION REQUIRED:



When investigating these inquiries, you must obtain from each inquiring party:



- A copy of my signed credit application OR

- A copy of my written authorization to obtain credit report OR

- Documentation of the specific permissible purpose



If the inquiring party cannot provide this documentation, the inquiry MUST be deleted.



FCRA VIOLATION LIABILITY:



Unauthorized inquiries violate:

- 15 U.S.C. § 1681b - Permissible purposes

- 15 U.S.C. § 1681e(b) - Accuracy requirements



Penalties for violations include:

- Actual damages

- Statutory damages ($100-$1,000 per violation)

- Punitive damages

- Attorney's fees



DEADLINE:



Remove these unauthorized inquiries within FIFTEEN (15) DAYS and provide written confirmation.



Sincerely,





_________________________

${data.clientName}

[NAME]



ENCLOSURE: Credit report with unauthorized inquiries highlighted

\`\`\`



---`;
}


// ===============================================================
// generatePostBankruptcyDischargeDispute
// ===============================================================
export function generatePostBankruptcyDischargeDispute(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
${data.clientName}

${data.clientAddress}



${data.today}



[CREDIT REPORTING AGENCY / FURNISHER]

${data.clientAddress}



RE: VIOLATION OF BANKRUPTCY DISCHARGE ORDER

    CASE NO: [BANKRUPTCY CASE NUMBER]

    DISCHARGE DATE: ${data.today}



CERTIFIED MAIL - RETURN RECEIPT REQUESTED



Dear Sir or Madam:



You are violating federal bankruptcy law and the Fair Credit Reporting Act by reporting discharged debts as having balances due.



BANKRUPTCY DISCHARGE:



On ${data.today}, I received a discharge in bankruptcy in the United States Bankruptcy Court for the [DISTRICT].



Case Number: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

Chapter: [7 / 13]

Discharge Date: ${data.today}



A copy of the discharge order is enclosed as Exhibit A.



DISCHARGED DEBTS BEING MISREPORTED:



The following debts were included in my bankruptcy and discharged, yet you continue to report them with balances:



ACCOUNT #1:

- Creditor: [NAME]

- Account: ${data.clientSSNLast4 || 'XXXX'}

- Balance Reported by You: $$1,000.00

- CORRECT BALANCE: $0.00 (DISCHARGED)



ACCOUNT #2:

- Creditor: [NAME]

- Account: ${data.clientSSNLast4 || 'XXXX'}

- Balance Reported by You: $$1,000.00

- CORRECT BALANCE: $0.00 (DISCHARGED)



LEGAL VIOLATIONS:



1. BANKRUPTCY CODE VIOLATION:

11 U.S.C. § 524(a) prohibits any act to collect a discharged debt. Reporting a balance due on a discharged debt violates the discharge injunction.



2. FCRA VIOLATION:

15 U.S.C. § 1681c(a)(1): Bankruptcies cannot be reported more than 10 years from date of order for relief.

15 U.S.C. § 1681e(b): You must maintain accurate information.



REQUIRED CORRECTIONS:



For each discharged account, you must:



1. UPDATE the balance to $0.00

2. UPDATE the status to one of the following:

   - "Included in Bankruptcy"

   - "Discharged through Bankruptcy"

   - Status Code "63" (Metro 2 Format)

3. REMOVE any indication of outstanding balance

4. REMOVE any past-due amount

5. STOP all collection reporting



DO NOT DELETE:

The account may remain on my credit report as "Included in Bankruptcy - $0 balance" but you MUST NOT report it as:

- Having any balance due

- Being past due

- Being in collection

- Being charged off with balance



DEADLINE:



Correct these accounts within TEN (10) DAYS of receipt.



Failure to comply may result in:

- Bankruptcy contempt proceedings

- FCRA violations lawsuit

- Report to bankruptcy trustee

- Sanctions from bankruptcy court



Sincerely,





_________________________

${data.clientName}



ENCLOSURES:

- Bankruptcy Discharge Order

- Credit Report showing violations

- Schedule of discharged debts

\`\`\`



---`;
}


// ===============================================================
// generateMedicalDebtViolationDispute
// ===============================================================
export function generateMedicalDebtViolationDispute(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
${data.clientName}

${data.clientAddress}



${data.today}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${data.clientAddress}



RE: MEDICAL DEBT REPORTING VIOLATIONS

    CFPB RULE / VA DEBT PROTECTIONS

    FILE: ${data.accountNumber || 'XXXX-XXXX-XXXX'}



CERTIFIED MAIL



Dear Sir or Madam:



You are violating federal medical debt reporting rules by improperly reporting medical collections on my credit report.



MEDICAL DEBT PROTECTIONS:



CFPB FINAL RULE (Effective March 30, 2023):

Consumer reporting agencies are PROHIBITED from including medical debt on consumer credit reports.



ADDITIONAL PROTECTIONS:

1. 365-Day Waiting Period: Medical debt cannot be reported until 365 days after date of service (extended from 180 days)

2. Veteran Protection: Veteran medical debt from VA benefits is completely excluded

3. Paid Medical Debt: Must be deleted immediately upon payment



VIOLATIONS ON MY CREDIT REPORT:



MEDICAL ACCOUNT #1:

- Provider: [NAME]

- Collection Agency: [NAME]

- Amount: $$1,000.00

- Date of Service: ${data.today}

- Violation: [REPORTED BEFORE 365 DAYS / PAID BUT NOT DELETED / VETERAN DEBT]



MEDICAL ACCOUNT #2:

- Provider: [NAME]

- Collection Agency: [NAME]

- Amount: $$1,000.00

- Date of Service: ${data.today}

- Violation: [SPECIFY]



☐ VETERAN MEDICAL DEBT:

I am a veteran receiving medical services through the VA. ALL medical debt related to VA benefits is EXCLUDED from credit reporting under 15 U.S.C. § 1681c(a)(7).



Evidence: Copy of VA benefits documentation (Enclosed)



☐ PAID MEDICAL DEBT:

I paid this medical debt on ${data.today}. Paid medical collections must be DELETED immediately.



Evidence: Proof of payment (Enclosed)



☐ UNDER 365 DAYS OLD:

Date of Service: ${data.today}

365 Days from DOS: ${data.today}

Current Date: ${data.today}

This debt is only 30 days old and CANNOT be reported until [365-DAY DATE]



REQUIRED ACTION:



IMMEDIATELY DELETE all medical collections from my credit report.



These are not disputes requiring investigation—these are per se violations of federal regulation.



DEADLINE: 7 DAYS



Sincerely,





_________________________

${data.clientName}



ENCLOSURES:

- Credit report

- Proof of payment (if applicable)

- VA documentation (if applicable)

\`\`\`



---`;
}


// ===============================================================
// generateReAgingViolationDispute
// ===============================================================
export function generateReAgingViolationDispute(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
${data.clientName}

${data.clientAddress}



${data.today}



[CREDIT REPORTING AGENCY / FURNISHER]

${data.clientAddress}



RE: ILLEGAL RE-AGING OF DEBT

    VIOLATION OF 15 U.S.C. § 1681c(c)

    ACCOUNT: ${data.clientSSNLast4 || 'XXXX'}



CERTIFIED MAIL



Dear Sir or Madam:



You have illegally "re-aged" an account on my credit report by altering the Date of First Delinquency (DOFD) to extend the reporting period.



ACCOUNT INFORMATION:

- Creditor: [NAME]

- Account: ${data.clientSSNLast4 || 'XXXX'}

- ORIGINAL Date of First Delinquency: [ORIGINAL DATE]

- CURRENT Date of First Delinquency on report: [ALTERED DATE]

- Difference: ${data.accountNumber || 'XXXX-XXXX-XXXX'} months



EVIDENCE OF RE-AGING:



I have previous credit reports showing the DOFD as [ORIGINAL DATE]:

- Credit report dated ${data.today} (Exhibit A)

- Credit report dated ${data.today} (Exhibit B)



Your current report now shows DOFD as [ALTERED DATE], which is ${data.accountNumber || 'XXXX-XXXX-XXXX'} months later than the original DOFD.



PROHIBITION ON RE-AGING:



15 U.S.C. § 1681c(c)(1) provides:



"The date of the commencement of the delinquency which immediately preceded the collection activity, charge to profit and loss, or similar action."



The DOFD is the date the account first became delinquent and was NEVER brought current. It CANNOT be changed by:

- Payment activity

- Partial payments

- Sale/transfer of the debt

- Change in collection agency

- Settlement offers

- New collection attempts



CFPB GUIDANCE:



CFPB Bulletin 2012-08 explicitly prohibits re-aging and requires accurate DOFD reporting.



The FTC has taken enforcement action against companies that re-age debts.



REQUIRED CORRECTION:



IMMEDIATELY correct the DOFD to the original date: [ORIGINAL DATE]



This correction will properly calculate the seven-year removal date as:

[ORIGINAL DOFD] + 7 years = [CORRECT REMOVAL DATE]



Based on the CORRECT DOFD, this account should be deleted on ${data.today}.



LIABILITY:



Re-aging is a WILLFUL violation of the FCRA exposing you to:

- Statutory damages per violation

- Punitive damages

- FTC enforcement action

- CFPB enforcement action



DEADLINE: 10 DAYS



Correct the DOFD or DELETE the account entirely.



Sincerely,





_________________________

${data.clientName}



ENCLOSURES:

- Previous credit reports showing original DOFD

- Current credit report showing altered DOFD

- DOFD timeline comparison chart

\`\`\`



---



# **SECTION 2: LEGAL DEMAND LETTERS (8 Templates)**



---`;
}


// ===============================================================
// generatePreLitigationSettlementDemandFcra
// ===============================================================
export function generatePreLitigationSettlementDemandFcra(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
[ATTORNEY LETTERHEAD OR CONSUMER NAME]

${data.clientAddress}



${data.today}



[DEFENDANT NAME]

[DEFENDANT ADDRESS]



RE: FINAL SETTLEMENT DEMAND - FCRA VIOLATIONS

    CONSUMER: [NAME]

    DEADLINE: [DATE - 30 DAYS FROM MAILING]



SENT VIA CERTIFIED MAIL AND REGULAR MAIL



Dear [Defendant]:



This letter constitutes a final opportunity to resolve multiple violations of the Fair Credit Reporting Act, 15 U.S.C. § 1681 et seq., before the filing of a federal lawsuit.



I. OVERVIEW OF VIOLATIONS



${data.clientName} ("Consumer") has identified the following violations of the Fair Credit Reporting Act by [DEFENDANT NAME] ("Defendant"):



1. Reporting obsolete information past the seven-year deadline (15 U.S.C. § 1681c)

2. Failure to conduct reasonable reinvestigation (15 U.S.C. § 1681i)

3. Failure to maintain accurate information (15 U.S.C. § 1681e(b))

4. [OTHER VIOLATIONS]



Total Number of Violations: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

Nature of Violations: [WILLFUL / NEGLIGENT]



II. FACTUAL BACKGROUND



[Provide detailed chronological narrative:]



On ${data.today}, Consumer obtained a credit report from Defendant revealing ${data.accountNumber || 'XXXX-XXXX-XXXX'} inaccurate/obsolete items.



On ${data.today}, Consumer sent a detailed dispute letter via certified mail (tracking #${data.accountNumber || 'XXXX-XXXX-XXXX'}) identifying each inaccuracy and providing supporting documentation including:

- [DOCUMENT 1]

- [DOCUMENT 2]

- [DOCUMENT 3]



Defendant received the dispute on ${data.today} (confirmed by return receipt).



On ${data.today}, Defendant responded claiming the information was "verified" without providing any explanation of the verification process or addressing Consumer's documentary evidence.



The inaccurate information continues to appear on Consumer's credit report as of ${data.today}.



III. SPECIFIC VIOLATIONS



VIOLATION #1: 15 U.S.C. § 1681c(a)(4) - OBSOLETE INFORMATION



Account: ${data.creditorName || 'CREDITOR'}, Account #${data.clientSSNLast4 || 'XXXX'}

Date of First Delinquency: ${data.today}

Seven-Year Removal Date: ${data.today}

Current Date: ${data.today}

Days Past Deadline: ${data.accountNumber || 'XXXX-XXXX-XXXX'}



This is a PER SE violation. No investigation is required—mathematical calculation proves the violation.



VIOLATION #2: 15 U.S.C. § 1681i(a) - FAILURE TO CONDUCT REASONABLE REINVESTIGATION



Despite receiving clear evidence of inaccuracy (including [SPECIFIC DOCUMENTS]), Defendant conducted a superficial "verification" that constituted mere parroting of furnisher information.



Defendant's investigation was unreasonable because:

- Failed to review Consumer's documentation

- Relied solely on furnisher's automated response

- Completed investigation in ${data.accountNumber || 'XXXX-XXXX-XXXX'} days suggesting no substantive review

- Did not contact obvious alternative sources

- Failed to resolve clear contradictions



This violates the standard established in Cushman v. Trans Union Corp., 115 F.3d 220 (3d Cir. 1997).



VIOLATION #3: 15 U.S.C. § 1681e(b) - FAILURE TO MAINTAIN ACCURACY



Defendant failed to follow reasonable procedures to assure maximum possible accuracy by:

- [SPECIFIC PROCEDURAL FAILURES]

- [SYSTEMIC INADEQUACIES]

- [FAILURE TO IMPLEMENT PROPER SAFEGUARDS]



[CONTINUE FOR EACH VIOLATION]



IV. WILLFUL NONCOMPLIANCE



Defendant's violations constitute WILLFUL NONCOMPLIANCE under the standard established in Safeco Ins. Co. v. Burr, 551 U.S. 47 (2007).



Evidence of Willfulness:



1. RECKLESS DISREGARD: Reporting information past the seven-year deadline despite automated systems designed to calculate obsolescence demonstrates reckless disregard.



2. OBJECTIVELY UNREASONABLE: Ignoring clear documentary evidence of inaccuracy is objectively unreasonable and cannot be justified under any reasonable interpretation of the FCRA.



3. SOPHISTICATED DEFENDANT: Defendant is a [large/national] consumer reporting agency with:

   - Annual revenues exceeding $$1,000.00

   - Dedicated compliance department

   - Legal counsel specializing in FCRA

   - Automated compliance systems

   - Knowledge of statutory requirements



4. PATTERN AND PRACTICE: [IF APPLICABLE] Defendant has been sued previously for similar violations, including:

   - [CASE NAME, COURT, CASE NUMBER, DATE]

   - [CONSENT ORDERS WITH CFPB/FTC]



5. NOTICE OF VIOLATION: Despite receiving clear notice of the violations via Consumer's dispute letter, Defendant continued to report inaccurate information.



V. DAMAGES CALCULATION



A. STATUTORY DAMAGES (15 U.S.C. § 1681n)



For EACH willful violation, Consumer is entitled to statutory damages between $100 and $1,000.



Number of Willful Violations: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

Statutory Damages Range: $[MIN] to $[MAX]



We demand the MAXIMUM statutory damages of $1,000 per violation:



${data.accountNumber || 'XXXX-XXXX-XXXX'} violations × $1,000 = $[TOTAL STATUTORY]



B. ACTUAL DAMAGES



Consumer has suffered the following actual damages:



1. CREDIT DENIAL:

   - Denied credit by ${data.creditorName || 'CREDITOR'} on ${data.today}

   - Adverse action notice cited inaccurate information (Exhibit [X])

   - Lost benefit: [DESCRIBE - e.g., "0% financing worth $2,500"]

   - Actual Damages: $$1,000.00



2. HIGHER INTEREST RATES:

   - Approved for loan at [X]% instead of qualified [Y]%

   - Interest rate differential over [TIME]: $$1,000.00

   - Actual Damages: $$1,000.00



3. EMPLOYMENT DENIAL:

   - Applied for position with [EMPLOYER] on ${data.today}

   - Employer cited credit report in denial

   - Lost annual salary: $$1,000.00

   - Actual Damages: $$1,000.00



4. HOUSING DENIAL/INCREASED RENT:

   - [DESCRIBE]

   - Actual Damages: $$1,000.00



5. EMOTIONAL DISTRESS:

   - Severe anxiety and humiliation

   - Sleep disturbances

   - Damage to reputation

   - [Medical treatment sought if applicable]

   - Actual Damages: $$1,000.00



6. TIME AND EXPENSES:

   - ${data.accountNumber || 'XXXX-XXXX-XXXX'} hours spent × $[HOURLY RATE] = $$1,000.00

   - Out-of-pocket expenses: $$1,000.00

   - Actual Damages: $$1,000.00



TOTAL ACTUAL DAMAGES: $$1,000.00



C. PUNITIVE DAMAGES



Given the willful nature of violations and need for deterrence, Consumer will seek punitive damages.



Factors supporting punitive award:

- Defendant's substantial financial resources

- Egregious nature of violations

- Pattern and practice (if applicable)

- Need for general deterrence



Estimated Punitive Damages: $$1,000.00



D. ATTORNEY'S FEES AND COSTS



Pursuant to 15 U.S.C. § 1681n(a)(3) and § 1681o(a)(2), Consumer is entitled to reasonable attorney's fees and costs.



Estimated attorney's fees through trial: $$1,000.00

Estimated costs (filing, service, depositions, experts): $$1,000.00



TOTAL POTENTIAL LIABILITY: $[GRAND TOTAL]



VI. SETTLEMENT OFFER



To avoid the cost and uncertainty of litigation, Consumer is willing to settle all claims for:



TOTAL SETTLEMENT AMOUNT: $[SETTLEMENT DEMAND]



This settlement offer includes:



1. Payment of $$1,000.00 to Consumer

2. Immediate deletion of all inaccurate/obsolete items from Consumer's credit file

3. Written confirmation of deletions

4. Notification to all parties who received Consumer's credit report in past:

   - 6 months (credit purposes)

   - 2 years (employment purposes)

5. Agreement not to re-report deleted information

6. [OTHER INJUNCTIVE RELIEF]



VII. TERMS OF SETTLEMENT



If Defendant agrees to settle, the following terms will apply:



A. PAYMENT:

- Settlement payment within [15] days of agreement

- Payment method: [CERTIFIED CHECK / WIRE TRANSFER]



B. DELETION AND CORRECTION:

- All deletions/corrections completed within [10] business days

- Written confirmation provided to Consumer

- Updated credit report provided



C. RELEASE:

- Upon receipt of full payment and completion of all corrections, Consumer will execute a limited release of claims related to the violations described herein

- Release will NOT waive future claims for subsequent violations



D. CONFIDENTIALITY:

- [IF DESIRED] Settlement terms shall remain confidential



E. NO ADMISSION:

- Settlement does not constitute admission of liability



VIII. DEADLINE AND CONSEQUENCES OF REJECTION



This settlement offer expires on [DATE - 30 DAYS FROM MAILING].



If this offer is rejected or no response is received by the deadline, Consumer will:



1. FILE FEDERAL LAWSUIT in the United States District Court for [DISTRICT]



2. SEEK MAXIMUM DAMAGES:

   - Statutory damages: $1,000 per violation

   - Full actual damages

   - Punitive damages

   - Attorney's fees (which will be substantially higher after litigation)

   - Pre-judgment and post-judgment interest

   - Costs of suit



3. SEEK INJUNCTIVE RELIEF:

   - Permanent deletion of information

   - Implementation of corrective procedures



4. FILE REGULATORY COMPLAINTS with:

   - Consumer Financial Protection Bureau (CFPB)

   - Federal Trade Commission (FTC)

   - [STATE] Attorney General

   - [STATE] Department of Financial Services



5. PUBLICIZE VIOLATIONS:

   - Submit complaint to consumer advocacy websites

   - Report to consumer protection organizations

   - [IF APPLICABLE] Explore class action viability



IX. PRESERVATION OF EVIDENCE



Defendant is hereby notified to preserve all documents and electronically stored information related to Consumer's credit file, disputes, and investigations, including:



- Consumer's complete credit file

- All dispute letters and supporting documentation

- All correspondence with furnishers

- Consumer Dispute Verification (CDV) forms

- Investigation notes and results

- Automated Dispute Verification (ACV) system records

- Emails and internal communications

- Policies and procedures manuals

- Training materials

- Compliance audit reports

- [OTHER RELEVANT DOCUMENTS]



Failure to preserve evidence may result in spoliation sanctions.



X. RESPONSE REQUIRED



Please direct your response to:



[IF ATTORNEY:]

[ATTORNEY NAME]

[LAW FIRM]

${data.clientAddress}

${data.clientPhone || ''}

${data.clientEmail || ''}



[IF PRO SE:]

${data.clientName}

${data.clientAddress}

${data.clientPhone || ''}

${data.clientEmail || ''}



To accept this settlement offer, please contact me immediately to arrange payment and deletion/correction timeline.



If you wish to discuss this matter, I am available at ${data.clientPhone || ''} or ${data.clientEmail || ''}.



XI. RESERVATION OF RIGHTS



This settlement offer does not waive any rights or remedies available to Consumer under federal or state law. All rights are expressly reserved.



XII. AUTHORITY TO SETTLE



I am authorized to enter into settlement negotiations and to execute a settlement agreement on behalf of Consumer.



XIII. GOOD FAITH SETTLEMENT



This offer is made in good faith to avoid the costs and burdens of litigation. It is made pursuant to Federal Rule of Evidence 408 and cannot be used as evidence in any subsequent litigation.



---



Your immediate attention to this matter is required. The violations are clear, the damages are substantial, and Consumer is fully prepared to vindicate his/her rights in federal court if necessary.



However, settlement now will avoid significant litigation costs for both parties and provide certainty of outcome.



I look forward to your response by [DEADLINE DATE].



Very truly yours,





_________________________

${data.clientName}

[NAME]

[TITLE - ATTORNEY FOR CONSUMER / CONSUMER PRO SE]



ENCLOSURES:

- Exhibit A: Credit Report(s) showing violations

- Exhibit B: Dispute Letter(s)

- Exhibit C: Proof of Delivery (Return Receipt)

- Exhibit D: Defendant's Response(s)

- Exhibit E: Evidence of Damages [Adverse Action Notices, etc.]

- Exhibit F: Timeline of Violations

- Exhibit G: Damages Calculation Worksheet

- [OTHER EXHIBITS]



CC: [IF MULTIPLE DEFENDANTS - LIST ALL]

\`\`\`

# **ULTIMATE CREDIT REPAIR & LITIGATION SOFTWARE**

## **COMPLETE TEMPLATE LIBRARY - ALL 50+ DOCUMENTS**

### **CONTINUED - FULL PROFESSIONAL SUITE**



---`;
}


// ===============================================================
// generateIntentToSueLetterFcra
// ===============================================================
export function generateIntentToSueLetterFcra(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `
[ATTORNEY LETTERHEAD OR CONSUMER NAME]

${data.clientAddress}

${data.clientPhone || ''}

${data.clientEmail || ''}



${data.today}



[DEFENDANT NAME]

[DEFENDANT ADDRESS]

${data.clientCity}, ${data.clientState} ${data.clientZip}



RE: NOTICE OF INTENT TO FILE FEDERAL LAWSUIT

    FAIR CREDIT REPORTING ACT VIOLATIONS

    CONSUMER: ${data.clientName}

    YOUR FINAL OPPORTUNITY TO CURE: 15 DAYS



SENT VIA CERTIFIED MAIL, RETURN RECEIPT REQUESTED

AND REGULAR U.S. MAIL



To Whom It May Concern:



I. NOTICE OF INTENT



This letter serves as formal notice of my intent to file a lawsuit in the United States District Court for [DISTRICT] against [DEFENDANT NAME] for multiple violations of the Fair Credit Reporting Act, 15 U.S.C. § 1681 et seq.



This is your FINAL opportunity to cure these violations before I incur the expense of filing suit.



II. IDENTIFIED VIOLATIONS



After thorough legal analysis, I have identified the following actionable violations:



COUNT I: WILLFUL VIOLATION OF 15 U.S.C. § 1681c(a)(4)

Reporting Obsolete Information Past Seven-Year Deadline



Account: ${data.creditorName || 'CREDITOR'}, Acct #${data.clientSSNLast4 || 'XXXX'}

DOFD: ${data.today}

Removal Deadline: ${data.today}

Still Reporting as of: ${data.today}

Days Overdue: ${data.accountNumber || 'XXXX-XXXX-XXXX'}



This is a per se violation. No factual dispute exists.



COUNT II: WILLFUL VIOLATION OF 15 U.S.C. § 1681i(a)

Failure to Conduct Reasonable Reinvestigation



On ${data.today}, I sent a detailed dispute with supporting documentation:

- [DOCUMENT 1]

- [DOCUMENT 2]

- [DOCUMENT 3]



Your "investigation" consisted of:

- Automated CDV form to furnisher

- No review of my documentation

- Superficial "verification" in ${data.accountNumber || 'XXXX-XXXX-XXXX'} days

- No independent verification



This violates Cushman v. Trans Union Corp., 115 F.3d 220 (3d Cir. 1997).



COUNT III: WILLFUL VIOLATION OF 15 U.S.C. § 1681e(b)

Failure to Maintain Maximum Possible Accuracy



You failed to implement reasonable procedures to ensure accuracy.



[ADDITIONAL COUNTS AS APPLICABLE]



TOTAL COUNTS: ${data.accountNumber || 'XXXX-XXXX-XXXX'}



III. WILLFULNESS



Your violations are WILLFUL under Safeco Ins. Co. v. Burr, 551 U.S. 47 (2007):



1. You are a sophisticated CRA with compliance infrastructure

2. You ignored clear evidence of inaccuracy

3. You reported past statutory deadlines despite automated systems

4. Your conduct was objectively unreasonable

5. [IF APPLICABLE] You have prior violations/consent orders



Willfulness supports:

- Statutory damages: $100-$1,000 PER VIOLATION

- Punitive damages (unlimited)

- Attorney's fees (significantly higher if I must file suit)



IV. DAMAGES SUMMARY



Statutory Damages: [NUMBER violations] × $1,000 = $$1,000.00

Actual Damages: $$1,000.00

  - Credit denial: $$1,000.00

  - Higher interest rates: $$1,000.00

  - Employment/housing denial: $$1,000.00

  - Emotional distress: $$1,000.00

  - Time/expenses: $$1,000.00

Punitive Damages: $$1,000.00 (to be determined by jury)

Attorney's Fees: $[ESTIMATED] (through trial)

Costs: $[ESTIMATED]



TOTAL POTENTIAL EXPOSURE: $$1,000.00



V. SETTLEMENT TERMS



To avoid federal litigation, I will accept the following settlement:



1. PAYMENT: $[SETTLEMENT AMOUNT]

   (Payable within 15 days of agreement)



2. IMMEDIATE DELETIONS:

   - [ACCOUNT 1]

   - [ACCOUNT 2]

   - [ACCOUNT 3]



3. WRITTEN CONFIRMATION:

   - Deletions completed

   - Updated credit report provided

   - Notifications sent to all report recipients



4. NO RE-REPORTING:

   - Written guarantee deleted items will not return



5. RELEASE:

   - Limited release upon full payment and compliance



VI. DEADLINE: [DATE - 15 DAYS]



If I do not receive yo
<truncated 210977 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.`;
}


// ===============================================================
// generateIdentityTheftComprehensiveDispute
// ===============================================================
export function generateIdentityTheftComprehensiveDispute(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `TEMPLATE 6.1: IDENTITY THEFT COMPREHENSIVE DISPUTE

Copy${data.clientName}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}

${data.clientPhone || ''}

${data.clientEmail || ''}



${data.today}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}



RE: IDENTITY THEFT VICTIM STATEMENT AND FRAUD ALERT

    FRAUDULENT ACCOUNT REMOVAL DEMAND

    15 U.S.C. § 1681c-2 (IDENTITY THEFT BLOCK)

    CONSUMER FILE: [FILE NUMBER]



CERTIFIED MAIL - RETURN RECEIPT REQUESTED



Dear Sir or Madam:



I am a victim of identity theft. This letter serves multiple purposes under the Fair Credit Reporting Act:



I. INITIAL FRAUD ALERT (15 U.S.C. § 1681c-1)



Pursuant to 15 U.S.C. § 1681c-1(a), I request that you place an INITIAL FRAUD ALERT on my credit file.



Required Duration: At least 90 days

Required Actions by CRA:

☑ Include fraud alert with any credit score generated

☑ Exclude my name from prescreened offer lists for 5 years

☑ Notify other nationwide CRAs within 24 hours

☑ Provide procedures for placing extended alert



II. EXTENDED FRAUD ALERT REQUEST (15 U.S.C. § 1681c-1(b))



I am also requesting an EXTENDED FRAUD ALERT (7 years).



Required Documentation Enclosed:

☑ Identity Theft Report from IdentityTheft.gov (Exhibit A)

☑ Police Report #${data.accountNumber || 'XXXX-XXXX-XXXX'}, [POLICE DEPT], dated ${data.today} (Exhibit B)

☑ FTC Identity Theft Affidavit (Exhibit C)



Required CRA Actions:

☑ Extended alert for 7 years from date of request

☑ Notify other nationwide CRAs within 24 hours

☑ Provide free credit reports (2 per year for 7 years)

☑ Exclude from prescreened lists for 5 years



III. SECURITY FREEZE REQUEST (15 U.S.C. § 1681c-1(i))



I request that you place a SECURITY FREEZE on my credit file pursuant to 15 U.S.C. § 1681c-1(i).



Identity Verification Documents Enclosed:

☑ Copy of driver's license

☑ Copy of Social Security card

☑ Copy of utility bill showing current address

☑ [OTHER IDENTITY DOCUMENTS]



Required CRA Actions:

☑ Place freeze within 1 business day of request

☑ Provide confirmation and unique PIN/password

☑ Provide procedures for temporary lift

☑ NO FEE for identity theft victims



IV. FRAUDULENT ACCOUNTS - IDENTITY THEFT BLOCK (15 U.S.C. § 1681c-2)



Pursuant to 15 U.S.C. § 1681c-2, I demand that you BLOCK the following fraudulent information from my credit file.



FRAUDULENT ACCOUNT #1:

Creditor: [NAME]

Account Type: [CREDIT CARD / LOAN / ETC.]

Account Number: ${data.clientSSNLast4 || 'XXXX'}

Date Opened: ${data.today}

Balance Reported: $$1,000.00



Declaration: I did NOT:

☑ Open this account

☑ Authorize this account

☑ Apply for this account

☑ Receive any goods or services from this account

☑ Benefit from this account in any way



This account was opened by an identity thief using my stolen personal information.



FRAUDULENT ACCOUNT #2:

[REPEAT FORMAT FOR EACH ACCOUNT]



FRAUDULENT ACCOUNT #3:

[REPEAT FORMAT]



UNAUTHORIZED INQUIRIES:

Company: [NAME], Date: ${data.today} - I did NOT authorize

Company: [NAME], Date: ${data.today} - I did NOT authorize

Company: [NAME], Date: ${data.today} - I did NOT authorize



V. STATUTORY REQUIREMENTS - 4 BUSINESS DAY DEADLINE



15 U.S.C. § 1681c-2(a) REQUIRES that you:



1. BLOCK fraudulent information within FOUR (4) BUSINESS DAYS of receiving:

   ☑ Appropriate proof of identity (enclosed)

   ☑ Identity theft report (enclosed)

   ☑ Identification of fraudulent information (above)



2. NOTIFY furnishers that information resulted from identity theft



3. DECLINE to accept new information from identity thief



4. PROVIDE written confirmation of block to me



DEADLINE: [DATE - 4 BUSINESS DAYS FROM MAILING]



VI. VICTIM'S STATEMENT (15 U.S.C. § 1681c-1(d))



I request that you include the following 100-word victim's statement in my credit file:



"I am a victim of identity theft. An identity thief used my personal information to fraudulently open accounts and make unauthorized inquiries. I did not open the accounts listed as fraudulent, did not authorize any inquiries, and did not receive any benefit from these accounts. I have filed reports with law enforcement and the Federal Trade Commission. Any inquiries regarding these fraudulent accounts should be directed to me at ${data.clientPhone || ''} or ${data.clientEmail || ''}. I am actively working to resolve this identity theft."



Required Action: Include this statement with all credit reports for [2 years / until I request removal].



VII. IDENTITY THEFT DETAILS



Date Identity Theft Discovered: ${data.today}



How Discovered:

☑ Received collection notice for unknown account

☑ Credit denial for fraudulent account

☑ Credit monitoring alert

☑ Reviewed credit report

☑ Other: __________



Identity Thief Information (if known):

Name: [IF KNOWN]

Relationship: [STRANGER / FAMILY MEMBER / EX-SPOUSE / CO-WORKER / UNKNOWN]

How they obtained information: [DATA BREACH / STOLEN WALLET / MAIL THEFT / PHISHING / UNKNOWN]



Affected Personal Information:

☑ Social Security Number

☑ Date of Birth

☑ Driver's License Number

☑ Credit Card Numbers

☑ Bank Account Information

☑ Other: __________



Law Enforcement Reports Filed:

1. Police Report: ${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}, Report #${data.accountNumber || 'XXXX-XXXX-XXXX'}, Date: ${data.today}

2. FTC Report: IdentityTheft.gov, Report ID: ${data.accountNumber || 'XXXX-XXXX-XXXX'}, Date: ${data.today}

3. [OTHER REPORTS]



Creditors Notified:

[LIST ALL CREDITORS NOTIFIED OF FRAUD]



Accounts Closed:

[LIST ALL ACCOUNTS CLOSED DUE TO FRAUD]



VIII. ADDITIONAL FRAUDULENT ACTIVITY



In addition to the accounts listed above, the identity thief may have:



☑ Filed fraudulent tax returns in my name

☑ Used my identity for employment

☑ Obtained medical services in my name

☑ Committed crimes in my name

☑ Obtained government benefits in my name

☑ Other: __________



I am working with appropriate authorities to address all fraudulent activity.



IX. PROHIBITION ON UNBLOCKING



15 U.S.C. § 1681c-2(b) PROHIBITS you from unblocking information unless:



1. You notify me in advance (at least 5 days), AND

2. You have reason to believe information was blocked in error or based on material misrepresentation, AND

3. You provide me with method to verify identity, AND

4. You allow me to dispute the unblocking



You may NOT unblock simply because the furnisher requests it or claims the account is valid.



X. FURNISHER NOTIFICATION REQUIREMENTS



When you block fraudulent information, you MUST notify the furnisher pursuant to 15 U.S.C. § 1681c-2(a)(3) that:



☑ Information resulted from identity theft

☑ Information has been blocked

☑ Furnisher should not report information to any CRA

☑ Furnisher should not attempt to collect from victim



Provide me with:

☑ Names and addresses of all furnishers notified

☑ Dates of notification

☑ Copies of notifications sent



XI. FREE CREDIT REPORTS



As an identity theft victim, I am entitled to:



1. FREE INITIAL REPORT: Upon placing fraud alert (15 U.S.C. § 1681j(d))

2. FREE REPORTS DURING ALERT: 1 free report per year during initial alert

3. FREE REPORTS WITH EXTENDED ALERT: 2 free reports per year for 7 years

4. FREE REPORT AFTER BLOCK: Within 3 business days of block request



Please provide my free credit report(s) to:

[NAME]

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}



XII. CREDIT SCORE DISCLOSURE



When generating credit scores, you MUST include the fraud alert with the score (15 U.S.C. § 1681c-1(a)(2)).



Failure to include fraud alert with credit score violates FCRA.



XIII. PRESCREENED OFFER EXCLUSION



Pursuant to 15 U.S.C. § 1681c-1(a)(3), you must EXCLUDE my name and address from any list provided in connection with credit or insurance transactions not initiated by me.



Duration: 5 years (or until I request removal)



XIV. CONTACT INFORMATION FOR ALERTS



All communications regarding fraud alerts, security freeze, or identity theft blocks should be sent to:



Mailing Address:

[NAME]

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}



Phone: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

Email: ${data.clientEmail || ''}



DO NOT contact me at any other address, as identity thief may have provided fraudulent addresses.



XV. REQUIRED RESPONSE



Within FOUR (4) BUSINESS DAYS, provide written confirmation that:



1. ☑ Initial/Extended fraud alert has been placed

2. ☑ Security freeze has been implemented

3. ☑ Freeze PIN/password provided

4. ☑ Other nationwide CRAs have been notified

5. ☑ All fraudulent accounts have been BLOCKED

6. ☑ All unauthorized inquiries have been REMOVED

7. ☑ Furnishers have been notified

8. ☑ Victim's statement has been added

9. ☑ Name excluded from prescreened offer lists

10. ☑ Free credit report(s) provided



XVI. LEGAL NOTICE



Violations of identity theft provisions may result in:



- FCRA liability under 15 U.S.C. § 1681n (willful) or § 1681o (negligent)

- Statutory damages: $100 to $1,000 per violation

- Actual damages

- Punitive damages

- Attorney's fees and costs

- CFPB enforcement action

- FTC enforcement action

- State AG enforcement action



I expect full compliance with all identity theft provisions of the FCRA.



XVII. CERTIFICATION UNDER PENALTY OF PERJURY



I certify under penalty of perjury that:



1. I am a victim of identity theft

2. The accounts and inquiries listed above are fraudulent

3. I did not open, authorize, or benefit from these accounts

4. All information provided is true and accurate

5. The attached identity theft report is complete and accurate

6. I have filed reports with appropriate law enforcement



I understand that providing false information may subject me to criminal penalties.



Signature: _________________________

Name: ${data.clientName}

Date: ${data.today}



XVIII. CONTACT FOR VERIFICATION



If you need to verify my identity or have questions, contact me ONLY at:



Phone: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

Email: ${data.clientEmail || ''}

Address: ${data.clientAddress}



DO NOT contact any other phone number, email, or address, as these may have been provided by the identity thief.



XIX. ENCLOSURES



☑ Exhibit A: FTC Identity Theft Report (IdentityTheft.gov)

☑ Exhibit B: Police Report

☑ Exhibit C: FTC Identity Theft Affidavit

☑ Exhibit D: Copy of Driver's License

☑ Exhibit E: Copy of Social Security Card

☑ Exhibit F: Copy of Utility Bill (Proof of Address)

☑ Exhibit G: Letters to Creditors Reporting Fraud

☑ Exhibit H: Account Closure Confirmations

☑ Exhibit I: [OTHER SUPPORTING DOCUMENTS]



XX. COPIES TO



I am sending copies of this letter to:

☑ [OTHER NATIONWIDE CRAs]

☑ Federal Trade Commission

☑ Consumer Financial Protection Bureau

☑ [STATE] Attorney General

☑ [LOCAL] Police Department



I expect your immediate attention to this serious matter.



Very truly yours,





_________________________

${data.clientName}

${data.clientName}



DELIVERY: Certified Mail, Return Receipt Requested

TRACKING: [NUMBER - ADD AFTER MAILING]

Copy`;
}


// ===============================================================
// generateMixedFileCorrectionDemand
// ===============================================================
export function generateMixedFileCorrectionDemand(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `TEMPLATE 6.2: MIXED FILE CORRECTION DEMAND

Copy${data.clientName}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}

[SSN: XXX-XX-${data.clientSSNLast4 || 'XXXX'}]

[DOB: MM/DD/YYYY]



${data.today}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}



RE: MIXED FILE VIOLATION - IMMEDIATE CORRECTION REQUIRED

    15 U.S.C. § 1681e(b) VIOLATION

    CONSUMER FILE: [FILE NUMBER]



CERTIFIED MAIL - RETURN RECEIPT REQUESTED



Dear Sir or Madam:



You have created a "MIXED FILE" by merging my credit information with another consumer's information, in violation of 15 U.S.C. § 1681e(b).



This is one of the most serious FCRA violations because it completely destroys the accuracy and reliability of both consumers' credit files.



I. MIXED FILE VIOLATION



A "mixed file" occurs when a consumer reporting agency incorrectly combines the credit information of two or more consumers into a single file.



Evidence of Mixed File:



My Correct Information:

Full Legal Name: [YOUR FULL LEGAL NAME]

Social Security Number: XXX-XX-[YOUR LAST 4]

Date of Birth: [YOUR DOB]

Current Address: [YOUR CURRENT ADDRESS]

Previous Addresses: 

  - [ADDRESS 1] ([DATES])

  - [ADDRESS 2] ([DATES])



Other Person's Information Incorrectly in My File:

Name Variation: [OTHER PERSON'S NAME]

SSN (if different): XXX-XX-[OTHER LAST 4]

DOB (if different): [OTHER DOB]

Addresses I've Never Lived At:

  - [ADDRESS 1] - NEVER LIVED HERE

  - [ADDRESS 2] - NEVER LIVED HERE

  - [ADDRESS 3] - NEVER LIVED HERE



II. ACCOUNTS THAT DO NOT BELONG TO ME



The following accounts belong to the OTHER consumer and must be REMOVED from my file:



ACCOUNT #1 (OTHER PERSON'S ACCOUNT):

Creditor: [NAME]

Account Number: ${data.clientSSNLast4 || 'XXXX'}

Address on Account: [ADDRESS I'VE NEVER LIVED AT]

Why This is Not Mine:

  ☑ I have never lived at the address on this account

  ☑ I have never done business with this creditor

  ☑ Account opened before my 18th birthday

  ☑ Account opened when I lived in different state

  ☑ Different SSN associated with account

  ☑ Different DOB associated with account



ACCOUNT #2 (OTHER PERSON'S ACCOUNT):

[REPEAT FORMAT]



ACCOUNT #3 (OTHER PERSON'S ACCOUNT):

[REPEAT FORMAT]



INQUIRIES THAT DO NOT BELONG TO ME:



Company: [NAME], Date: ${data.today}, Location: [STATE I'VE NEVER LIVED IN]

Company: [NAME], Date: ${data.today}, Location: [ADDRESS I'VE NEVER LIVED AT]

[LIST ALL INQUIRIES FROM LOCATIONS/ADDRESSES NOT ASSOCIATED WITH YOU]



III. HOW THE MIXED FILE OCCURRED



Common causes of mixed files:

☑ Similar names (e.g., John Smith vs. John A. Smith)

☑ Similar Social Security Numbers (one digit different)

☑ Father/son with same or similar names

☑ Family members at same address

☑ Transposed digits in SSN

☑ Typographical errors by creditors

☑ Inadequate matching procedures by CRA



In my case, the mixed file appears to have resulted from:

[EXPLAIN YOUR THEORY OF HOW MIXING OCCURRED]



IV. EVIDENCE PROVING ACCOUNTS DO NOT BELONG TO ME



EXHIBIT A: My Driver's License

Shows: Name, DOB, Address

Proves: My identity and residence history



EXHIBIT B: My Social Security Card

Shows: My SSN

Proves: Accounts with different SSN are not mine



EXHIBIT C: My Residence History

Shows: Every address I've lived at

Proves: Accounts at other addresses are not mine



EXHIBIT D: My Employment History

Shows: Where I've worked and when

Proves: Accounts opened in states where I've never lived/worked are not mine



EXHIBIT E: [OTHER EVIDENCE]

Examples:

- School records showing where I lived

- Tax returns showing filing addresses

- Utility bills showing service addresses

- Birth certificate

- Passport



V. COMPARISON TABLE



                    ME                  OTHER PERSON

Name:           [YOUR NAME]           [OTHER NAME]

SSN:            XXX-XX-[YOUR #]       XXX-XX-[OTHER #]

DOB:            [YOUR DOB]            [OTHER DOB]

Address:        [YOUR ADDRESS]        [OTHER ADDRESS]



Accounts at:    [YOUR ADDRESSES]      [OTHER ADDRESSES]

Employers:      [YOUR EMPLOYERS]      [UNKNOWN/OTHER]



VI. CASE LAW ON MIXED FILES



Guimond v. Trans Union Credit Info. Co., 45 F.3d 1329 (9th Cir. 1995):

"Mixed files" are serious FCRA violations. CRA liable for negligently mixing files.



Stuart v. TransUnion LLC, 462 F. Supp. 3d 562 (N.D. Ill. 2020):

CRA's inadequate file matching procedures caused mixed file. Willful violation found.



Mixed files violate 15 U.S.C. § 1681e(b) (reasonable procedures for maximum possible accuracy).



VII. YOUR INADEQUATE PROCEDURES



You failed to implement reasonable procedures to prevent mixed files:



☑ Failed to verify SSN matches before merging information

☑ Failed to verify DOB matches

☑ Failed to verify address consistency

☑ Used inadequate matching algorithms

☑ Relied on name similarity alone

☑ Failed to implement quality control

☑ Ignored obvious red flags (different states, addresses, SSN)



These procedural failures constitute WILLFUL NONCOMPLIANCE under Safeco v. Burr.



VIII. HARM CAUSED



The mixed file has caused me severe harm:



1. CREDIT DENIALS:

   - Denied by ${data.creditorName || 'CREDITOR'} on ${data.today}

   - Other person's derogatory information caused denial

   - I would have been approved based on MY actual credit



2. INACCURATE CREDIT SCORE:

   - My score: [ACTUAL SCORE]

   - Score with mixed file: [DEFLATED SCORE]

   - Score difference: [POINTS]



3. INABILITY TO VERIFY IDENTITY:

   - Cannot answer credit-based security questions

   - Questions about accounts/addresses I don't recognize

   - Cannot access online accounts due to verification failures



4. EMOTIONAL DISTRESS:

   - Severe anxiety and stress

   - Feeling violated by loss of credit identity

   - Frustration at being confused with another person



5. TIME AND EXPENSES:

   - [HOURS] spent trying to resolve

   - $$1,000.00 in expenses



IX. REQUIRED IMMEDIATE ACTIONS



You must IMMEDIATELY (within 5 business days):



1. SEPARATE the two consumers' files:

   - Create separate file for me with ONLY my information

   - Remove ALL accounts, inquiries, and personal information belonging to other person



2. CORRECT my identifying information:

   - Name: [CORRECT NAME]

   - SSN: [CORRECT SSN]

   - DOB: [CORRECT DOB]

   - Addresses: [ONLY MY ADDRESSES]



3. DELETE from my file:

   - [LIST EACH ACCOUNT TO DELETE]

   - [LIST EACH INQUIRY TO DELETE]

   - [LIST EACH ADDRESS TO DELETE]



4. UPDATE furnishers:

   - Notify all furnishers of mixed file correction

   - Provide correct consumer information

   - Request furnishers verify which consumer actually has account



5. PROVIDE written confirmation:

   - All corrections made

   - Updated credit report showing only MY information

   - List of all furnishers notified



6. NOTIFY other nationwide CRAs:

   - Inform Experian, Equifax, TransUnion of mixed file

   - Provide corrected information

   - Request they check their files for same mixing



7. FLAG my file:

   - Add special handling flag to prevent future mixing

   - Implement enhanced matching procedures for my file

   - Require manual review of any new information before adding



X. PROHIBITION ON RE-MIXING



After separating files, you may NOT:

☑ Re-merge the files

☑ Add other person's information back to my file

☑ Report my information in other person's file

☑ Combine files based on name similarity alone



You must implement procedures to PERMANENTLY prevent re-mixing.



XI. FILE SEPARATION PROCEDURES



When separating files, you must:



1. REVIEW all accounts/inquiries for correct association

2. VERIFY SSN, DOB, address for each item

3. CONTACT furnishers to verify which consumer has account

4. REMOVE items that cannot be positively verified as mine

5. DOCUMENT separation process

6. PRESERVE evidence of mixed file (for my records/litigation)



XII. NOTIFICATION TO OTHER CONSUMER



You should notify the OTHER consumer that:

- Their information was mixed with another person's file

- Their file has been corrected

- They should review their credit report for accuracy



This protects the other consumer's rights as well.



XIII. FREE CREDIT REPORTS



As a victim of a mixed file, provide me with:

☑ Free credit report BEFORE separation (showing mixed file)

☑ Free credit report AFTER separation (showing corrections)

☑ Free credit reports for next 12 months (monthly)

☑ Free credit monitoring to detect any re-mixing



XIV. CREDIT SCORE RECALCULATION



Recalculate my credit score using ONLY my actual credit information (excluding other person's accounts).



Provide:

☑ Score before separation: [SCORE]

☑ Score after separation: [SCORE]

☑ Score increase: [POINTS]

☑ Factors affecting score (based on MY information only)



XV. NOTIFICATION TO REPORT RECIPIENTS



Send corrected credit reports to:

☑ All parties who received mixed file report in past 6 months (credit)

☑ All parties who received mixed file report in past 2 years (employment)

☑ Notify them that previous report contained mixed file error



Provide me with list of all parties notified.



XVI. LEGAL LIABILITY



Mixed file violations expose you to:



NEGLIGENT VIOLATIONS (15 U.S.C. § 1681o):

- Actual damages

- Attorney's fees and costs



WILLFUL VIOLATIONS (15 U.S.C. § 1681n):

- Statutory damages: $100 - $1,000 per violation

- Actual damages

- Punitive damages

- Attorney's fees and costs



CASE LAW DAMAGES:

- Guimond: $50,000 compensatory + punitive

- Stuart: Substantial damages for mixed file

- [OTHER CASES]



REGULATORY ENFORCEMENT:

- CFPB enforcement action

- FTC enforcement action

- State AG action



XVII. WILLFULNESS



Your mixed file violation is WILLFUL because:



☑ You had inadequate file matching procedures

☑ You ignored obvious red flags (different SSN, DOB, addresses)

☑ You failed to verify before merging

☑ Mixed files are well-known violation

☑ You have resources to prevent mixed files

☑ Industry standards exist that you failed to follow

☑ Prior enforcement actions put you on notice



Reckless disregard of matching procedures = willful under Safeco.



XVIII. DEADLINE



IMMEDIATE CORRECTION REQUIRED: [DATE - 5 BUSINESS DAYS]



This is an emergency. Every day the mixed file persists:

- Damages me

- Violates FCRA

- Increases your liability



XIX. RESPONSE REQUIRED



Within 5 business days, provide:



1. ☑ Written confirmation of file separation

2. ☑ Updated credit report (only my information)

3. ☑ List of accounts/inquiries removed

4. ☑ List of furnishers notified

5. ☑ Confirmation other CRAs notified

6. ☑ Procedures implemented to prevent re-mixing

7. ☑ Credit score recalculation

8. ☑ List of report recipients notified



XX. PRESERVATION OF EVIDENCE



Preserve ALL evidence of the mixed file, including:

- Original mixed file

- Source documents showing how mixing occurred

- Furnisher information

- Investigation records

- Separation documentation



This evidence may be needed for litigation.



XXI. CONTACT INFORMATION



Direct all correspondence to:

[NAME]

${data.clientAddress}

${data.clientPhone || ''}

${data.clientEmail || ''}



DO NOT contact me at any addresses that belong to the other person.



XXII. CERTIFICATION



I certify under penalty of perjury that:



1. I have NEVER lived at the addresses listed as belonging to other person

2. I have NEVER had accounts with the creditors listed

3. The accounts identified do NOT belong to me

4. All information provided is true and accurate



Signature: _________________________

Name: ${data.clientName}

Date: ${data.today}



XXIII. ENCLOSURES



☑ Exhibit A: Copy of Driver's License

☑ Exhibit B: Copy of Social Security Card

☑ Exhibit C: Residence History Documentation

☑ Exhibit D: Employment History Documentation

☑ Exhibit E: Credit Report Showing Mixed File (highlighted)

☑ Exhibit F: Comparison Chart

☑ Exhibit G: [OTHER SUPPORTING DOCUMENTS]



XXIV. COPIES TO



☑ [OTHER NATIONWIDE CRAs]

☑ Consumer Financial Protection Bureau

☑ Federal Trade Commission

☑ [STATE] Attorney General



This is a serious violation requiring immediate correction.



Very truly yours,





_________________________

${data.clientName}

${data.clientName}



DELIVERY: Certified Mail, Return Receipt Requested

TRACKING: ${data.accountNumber || 'XXXX-XXXX-XXXX'}      # 📋 **CONTINUING THE ULTIMATE CREDIT REPAIR & LITIGATION SOFTWARE TEMPLATE LIBRARY**



---



## **SECTION 7: SPECIALIZED VIOLATION DISPUTE LETTERS**



---



### **`;
}


// ===============================================================
// generateStudentLoanReportingViolationDispute
// ===============================================================
export function generateStudentLoanReportingViolationDispute(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `Template 7.1 – Student Loan Reporting Violation Dispute**



\`\`\`

${data.clientName}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}

${data.clientPhone || ''}

${data.clientEmail || ''}



${data.today}



CERTIFIED MAIL #: ${data.reportId || '7020 1810 0001 XXXX XXXX'}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}



RE: FORMAL DISPUTE – STUDENT LOAN REPORTING VIOLATIONS

    CONSUMER: ${data.clientName}

    FILE NUMBER: [CREDIT FILE NUMBER]

    ACCOUNT: [STUDENT LOAN ACCOUNT NUMBER]



Dear Sir/Madam:



I. NATURE OF VIOLATION



This letter disputes the reporting of student loan account #${data.accountNumber || 'XXXX-XXXX-XXXX'} by [FURNISHER NAME] for the following violations:



☐ Rehabilitation Period Violations (34 CFR § 685.209(f))

☐ Defaulted Loan Reported After Rehabilitation

☐ Late Payments Shown During Rehabilitation Period

☐ Failure to Delete Pre-Rehabilitation History

☐ Income-Driven Repayment (IDR) Violations

☐ Forbearance/Deferment Misreporting

☐ Public Service Loan Forgiveness (PSLF) Errors

☐ Federal vs. Private Loan Misclassification

☐ Consolidation Reporting Errors



II. STATUTORY VIOLATIONS



A. FCRA VIOLATIONS:

   • 15 U.S.C. § 1681c(a)(5) – Obsolete Information

   • 15 U.S.C. § 1681e(b) – Maximum Possible Accuracy

   • 15 U.S.C. § 1681i(a) – Failure to Conduct Reasonable Reinvestigation

   • 15 U.S.C. § 1681s-2(a)(1)(A) – Furnishing Inaccurate Information

   • 15 U.S.C. § 1681s-2(b) – Duty to Investigate Disputes



B. HIGHER EDUCATION ACT VIOLATIONS:

   • 20 U.S.C. § 1080a – Rehabilitation Agreement Requirements

   • 34 CFR § 685.209(f) – Default History Deletion After Rehabilitation



C. DEPARTMENT OF EDUCATION POLICY:

   • DCL GEN-17-07 (April 2017) – Credit Reporting Guidance

   • Federal Student Aid Handbook – Rehabilitation Standards



III. FACTUAL BACKGROUND



A. LOAN ORIGINATION:

   Original Creditor: [ORIGINAL LENDER]

   Loan Type: ☐ Direct Loan ☐ FFEL ☐ Perkins ☐ Private

   Disbursement Date: ${data.today}

   Original Amount: $$1,000.00

   

B. DEFAULT STATUS:

   Default Date: ${data.today}

   Default Balance: $$1,000.00

   Collection Agency: ${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}



C. REHABILITATION COMPLETION:

   Rehabilitation Start: ${data.today}

   Number of Payments: [9 or 10]

   Rehabilitation Completion: ${data.today}

   Final Rehabilitation Payment: ${data.today}

   New Loan Holder: [SERVICER NAME]



IV. SPECIFIC VIOLATIONS



A. FAILURE TO DELETE DEFAULT HISTORY (34 CFR § 685.209(f)):



   "Upon sale of a rehabilitated loan, the Secretary instructs any consumer 

   reporting agency to which the Secretary previously reported the default 

   to remove the default from the borrower's credit history."



   YOUR REPORT SHOWS:

   ☐ "Default" status still appearing

   ☐ Late payment history from default period

   ☐ Collection account still listed

   ☐ Charge-off status remaining

   ☐ Multiple tradelines for same loan



   REQUIRED ACTION:

   Delete ALL references to:

   • Default status

   • Late payments prior to rehabilitation

   • Collection account tradeline

   • Charge-off notations

   • Any adverse payment history before rehabilitation completion



B. LATE PAYMENTS DURING REHABILITATION:



   Date Range: [START] to [END]

   Payments Reported Late: [DATES]

   

   VIOLATION: During rehabilitation, borrower made [9/10] qualifying payments:

   Payment 1: $$1,000.00 on ${data.today}

   Payment 2: $$1,000.00 on ${data.today}

   [Continue for all 9/10 payments]

   

   NO late payments occurred. Reporting late payments during successful 

   rehabilitation violates 15 U.S.C. § 1681e(b).



C. DUPLICATE REPORTING:



   The following tradelines ALL represent the SAME student loan:

   

   1. [ORIGINAL CREDITOR] – Account #${data.accountNumber || 'XXXX-XXXX-XXXX'} – $[BALANCE]

   2. [GUARANTY AGENCY] – Account #${data.accountNumber || 'XXXX-XXXX-XXXX'} – $[BALANCE]

   3. [COLLECTION AGENCY] – Account #${data.accountNumber || 'XXXX-XXXX-XXXX'} – $[BALANCE]

   4. [NEW SERVICER] – Account #${data.accountNumber || 'XXXX-XXXX-XXXX'} – $[BALANCE]

   

   VIOLATION: Only ONE tradeline (current servicer) should appear.

   Total Inflated Debt: $[TOTAL] (actual debt: $[ACTUAL])



D. INCOME-DRIVEN REPAYMENT (IDR) VIOLATIONS:



   ☐ $0 payments reported as "late" or "delinquent"

   ☐ Recertification period showing missed payments

   ☐ Administrative forbearance reported as delinquency

   

   FACT: Borrower enrolled in [REPAYE/PAYE/IBR/ICR] plan.

   Certified Income Date: ${data.today}

   Calculated Payment: $[0 or AMOUNT]

   All $0 payments are ON-TIME per 34 CFR § 685.209(a).



E. PUBLIC SERVICE LOAN FORGIVENESS (PSLF) IMPACTS:



   Borrower is employed by: [QUALIFYING EMPLOYER]

   Employment Certification Filed: ${data.today}

   Qualifying Payments Made: ${data.accountNumber || 'XXXX-XXXX-XXXX'}/120

   

   These reporting errors jeopardize PSLF eligibility and violate 

   15 U.S.C. § 1681e(b) by creating inaccurate loan status.



V. HARM SUFFERED



Financial Harm:

☐ Mortgage denial – ${data.today} – [LENDER] – $[AMOUNT LOAN]

☐ Auto loan denial – ${data.today} – [LENDER]

☐ Credit card denial – ${data.today} – ${data.creditorName || 'CREDITOR'}

☐ Higher interest rates paid: $$1,000.00 over [TIME PERIOD]

☐ Security deposits required: $$1,000.00

☐ Employment denial (credit check) – [EMPLOYER] – ${data.today}



Credit Score Impact:

• Score before violation: [SCORE]

• Score with violation: [SCORE]

• Point drop: ${data.accountNumber || 'XXXX-XXXX-XXXX'} points

• Estimated recovery after correction: [SCORE]



Emotional Distress:

☐ Anxiety over credit denials

☐ Stress from collection calls

☐ Embarrassment from loan denials

☐ Family strain due to financial limitations



Time and Expenses:

• Hours spent disputing: ${data.accountNumber || 'XXXX-XXXX-XXXX'} hours

• Postage/certified mail: $$1,000.00

• Credit monitoring fees: $$1,000.00/month × [MONTHS]

• Professional assistance: $$1,000.00

• Lost work time: [HOURS] × $[HOURLY RATE]



VI. REQUIRED CORRECTIVE ACTIONS



Within 30 days of receipt of this letter, you MUST:



1. ☐ INVESTIGATE this dispute per 15 U.S.C. § 1681i(a)

2. ☐ FORWARD to furnisher within 5 business days per § 1681i(a)(2)

3. ☐ DELETE all default-related information per 34 CFR § 685.209(f):

   • Default status notation

   • Late payment history prior to rehabilitation

   • Collection account tradeline

   • Charge-off notation

   • Public record entries

4. ☐ UPDATE current tradeline to show:

   • Account Type: Installment / Student Loan

   • Status: Current / Pays as Agreed

   • Payment History: No late payments post-rehabilitation

   • Balance: $[CURRENT BALANCE]

   • High Credit: $$1,000.00

5. ☐ MERGE duplicate tradelines into single current account

6. ☐ CORRECT any $0 IDR payments shown as late

7. ☐ NOTIFY furnisher of correction requirements

8. ☐ SEND written confirmation of all corrections

9. ☐ PROVIDE updated credit report showing corrections

10. ☐ NOTIFY other CRAs (Experian, Equifax, TransUnion) of corrections



VII. LEGAL NOTICE



Your failure to correct these violations constitutes:



A. FCRA VIOLATIONS:

   • Willful noncompliance: 15 U.S.C. § 1681n

     Damages: $100-$1,000 per violation + punitive damages

   • Negligent noncompliance: 15 U.S.C. § 1681o

     Damages: Actual damages

   • Attorney fees and costs: Both §§ 1681n(a)(3) and 1681o(a)(2)



B. DEPARTMENT OF EDUCATION VIOLATIONS:

   • 34 CFR § 685.209(f) – Mandatory deletion after rehabilitation

   • Potential reporting to Federal Student Aid Ombudsman



C. STATE LAW VIOLATIONS:

   [STATE] Consumer Protection Act: [STATE STATUTE]

   Damages: $[RANGE] per violation + attorney fees



VIII. STATUTE OF LIMITATIONS ANALYSIS



☐ This debt is BEYOND the statute of limitations for collections:

   State: [STATE]

   SOL Period: [YEARS] years for [Open-Ended/Written Contract]

   Date of First Delinquency: ${data.today}

   SOL Expiration: ${data.today}

   Current Date: ${data.today}

   

   Reporting this time-barred debt violates 15 U.S.C. § 1681c(a)(4).



IX. EVIDENCE ENCLOSED



Exhibit A: Loan Rehabilitation Agreement dated ${data.today}

Exhibit B: Final Rehabilitation Payment Confirmation dated ${data.today}

Exhibit C: Loan Sale Notice from [ED/GUARANTOR] to [SERVICER]

Exhibit D: Payment History showing 9/10 qualifying payments

Exhibit E: Income-Driven Repayment Plan Certification

Exhibit F: Employment Certification Form (PSLF) dated ${data.today}

Exhibit G: Credit Report showing violations dated ${data.today}

Exhibit H: Credit Denial Letter(s) – [LENDER(S)] – [DATE(S)]

Exhibit I: Correspondence with [FURNISHER] dated ${data.today}

Exhibit J: Department of Education Account Statement

Exhibit K: NSLDS (National Student Loan Data System) Report

Exhibit L: [OTHER SUPPORTING DOCUMENTS]



X. RESPONSE REQUIREMENTS



Within 30 days, provide:



1. ☐ Written confirmation of investigation initiation

2. ☐ Method of verification used

3. ☐ Name and contact of furnisher representative contacted

4. ☐ Copy of information forwarded to furnisher

5. ☐ Results of investigation

6. ☐ Copy of corrected credit report

7. ☐ Confirmation letters sent to other CRAs

8. ☐ Explanation of how rehabilitation deletion was processed

9. ☐ Name and title of person conducting investigation

10. ☐ Timeline of all investigative steps taken



XI. PRESERVATION OF EVIDENCE



You are hereby notified to preserve ALL documents and electronic records 

related to:

• This dispute and investigation

• Consumer credit file

• Furnisher communications

• Verification methods used

• Investigation procedures

• Training materials on student loan rehabilitation reporting

• Policies regarding 34 CFR § 685.209(f) compliance

• All versions of my credit report from ${data.today} to present



Failure to preserve evidence may result in spoliation sanctions.



XII. COPIES FURNISHED TO



☐ Consumer Financial Protection Bureau (CFPB)

☐ Federal Trade Commission (FTC)

☐ [STATE] Attorney General Consumer Protection Division

☐ U.S. Department of Education, Federal Student Aid Ombudsman

☐ [STATE] Department of Banking/Financial Regulation

☐ [FURNISHER NAME] (original creditor/servicer)

☐ [COLLECTION AGENCY NAME]

☐ Private legal counsel



XIII. CERTIFICATION



I certify under penalty of perjury under the laws of the United States 

that the foregoing is true and correct to the best of my knowledge.



Executed this [DAY] day of [MONTH], [YEAR].



_________________________________

${data.clientName}

${data.clientName}



CONTACT INFORMATION:

Phone: ${data.clientPhone || ''}

Email: ${data.clientEmail || ''}

Preferred Contact Method: [METHOD]



ENCLOSURES: Exhibits A-L (as listed)

\`\`\`



---



### **`;
}


// ===============================================================
// generateScraViolationDispute
// ===============================================================
export function generateScraViolationDispute(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `Template 7.2 – SCRA (Servicemembers Civil Relief Act) Violation Dispute**



\`\`\`

${data.clientName}

[RANK, BRANCH OF SERVICE]

[MILITARY ADDRESS / APO/FPO]

${data.clientCity}, ${data.clientState} ${data.clientZip}

${data.clientPhone || ''}

${data.clientEmail || ''}



${data.today}



CERTIFIED MAIL #: ${data.reportId || '7020 1810 0001 XXXX XXXX'}



[CREDITOR/FURNISHER NAME]

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}



CC: ${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

    [CREDIT BUREAU ADDRESS]



RE: SCRA VIOLATION – UNLAWFUL REPORTING & COLLECTION

    SERVICEMEMBER: [RANK] ${data.clientName}

    SSN: ***-**-${data.clientSSNLast4 || 'XXXX'}

    ACCOUNT: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

    

⚠️ PROTECTED UNDER 50 U.S.C. § 3901 ET SEQ. ⚠️



Dear Sir/Madam:



I. MILITARY STATUS NOTIFICATION



I am an active-duty servicemember of the [BRANCH OF SERVICE]:



Service Branch: [ARMY/NAVY/AIR FORCE/MARINES/COAST GUARD/SPACE FORCE]

Rank: [RANK]

Unit: [UNIT NAME AND NUMBER]

Duty Station: [BASE NAME, LOCATION]

Active Duty Start: ${data.today}

Current Status: ☐ Active Duty ☐ Mobilized Reserve ☐ National Guard (Title 10)

Deployment: ☐ Currently Deployed ☐ Recently Returned ☐ PCS Orders



Military Orders Enclosed: Exhibit A



II. SCRA VIOLATIONS ALLEGED



This letter formally notifies you of violations of the Servicemembers Civil 

Relief Act (50 U.S.C. § 3901 et seq.) regarding account #${data.accountNumber || 'XXXX-XXXX-XXXX'}:



☐ A. INTEREST RATE VIOLATION (50 U.S.C. § 3937)

☐ B. ADVERSE CREDIT REPORTING DURING DEPLOYMENT

☐ C. DEFAULT JUDGMENT WITHOUT SCRA AFFIDAVIT (50 U.S.C. § 3931)

☐ D. EVICTION/FORECLOSURE VIOLATIONS (50 U.S.C. §§ 3951, 3953)

☐ E. TERMINATION OF LEASE VIOLATIONS (50 U.S.C. § 3955)

☐ F. LIFE INSURANCE VIOLATIONS (50 U.S.C. § 3973)

☐ G. INSTALLMENT CONTRACT VIOLATIONS (50 U.S.C. § 3952)

☐ H. CIVIL LIABILITY STAY VIOLATIONS (50 U.S.C. § 3932)



III. DETAILED VIOLATION ANALYSIS



A. INTEREST RATE VIOLATION (50 U.S.C. § 3937)



STATUTORY REQUIREMENT:

"An obligation or liability bearing interest at a rate in excess of 6 percent 

per year that is incurred by a servicemember...before the servicemember enters 

military service shall not bear interest at a rate in excess of 6 percent."



ACCOUNT FACTS:

• Pre-Service Obligation: ☐ Yes ☐ No

• Account Opened: ${data.today}

• Active Duty Commenced: ${data.today}

• Account PREDATES military service by: [DAYS/MONTHS/YEARS]

• Written Notice Sent: ${data.today} (Exhibit B – Copy of Notice + Military Orders)

• Interest Rate Before Notice: [X.XX]%

• Interest Rate After Notice: [X.XX]% ← VIOLATION (exceeds 6%)



VIOLATION:

From ${data.today} to ${data.today}, you charged [X.XX]% interest, collecting 

$$1,000.00 in excess interest.



REQUIRED CORRECTION:

1. Reduce interest rate to 6% effective [DATE NOTICE SENT]

2. Refund excess interest: $[AMOUNT CALCULATION]

3. Remove adverse credit reporting related to excess charges

4. Recalculate account balance using 6% cap

5. Update credit report to show compliant payment history



B. ADVERSE CREDIT REPORTING DURING DEPLOYMENT



DEPLOYMENT FACTS:

• Deployment Start: ${data.today}

• Deployment End: ${data.today}

• Deployment Location: [COMBAT ZONE / QUALIFIED HAZARDOUS DUTY AREA]

• Orders: Exhibit C



LATE PAYMENTS REPORTED DURING DEPLOYMENT:

• ${data.today}: 30 days late

• ${data.today}: 60 days late

• ${data.today}: 90 days late



VIOLATION ANALYSIS:

Under DoD Directive 1344.9 and CFPB guidance, adverse credit reporting 

during active deployment may violate SCRA protections when:



1. Servicemember had reduced income during deployment

2. Servicemember faced communication difficulties

3. Mail delays prevented timely payment

4. Combat conditions impaired financial management

5. Creditor failed to work with servicemember per SCRA spirit



SUPPORTING FACTS:

☐ Combat pay LOWER than regular salary

☐ Limited internet/phone access in [DEPLOYMENT LOCATION]

☐ Mail delays of ${data.accountNumber || 'XXXX-XXXX-XXXX'} days documented

☐ Family financial hardship during deployment (spouse unemployed, etc.)

☐ Creditor refused deferment/accommodation requests



C. DEFAULT JUDGMENT WITHOUT SCRA AFFIDAVIT (50 U.S.C. § 3931)



JUDGMENT DETAILS:

• Court: [COURT NAME]

• Case Number: [CASE NUMBER]

• Judgment Date: ${data.today}

• Judgment Amount: $$1,000.00



VIOLATION:

On ${data.today}, you obtained a default judgment without filing the mandatory 

SCRA affidavit required by 50 U.S.C. § 3931(b):



"Before entering a default judgment, the court shall require the plaintiff 

to file with the court an affidavit stating whether or not the defendant 

is in military service."



At the time of judgment, I was:

☐ On active duty

☐ Deployed to [LOCATION]

☐ Unable to appear due to military orders



VIOLATION CONSEQUENCE:

• Judgment is VOIDABLE per 50 U.S.C. § 3931(b)

• Reporting of judgment on credit report is based on VOID judgment

• Court reopening under § 3931(g) sought



REQUIRED ACTION:

1. Cease reporting judgment

2. Delete judgment from credit reports

3. Vacate judgment per SCRA § 3931(g)

4. Refund garnished wages: $$1,000.00

5. Remove all collection actions



D. INSTALLMENT CONTRACT VIOLATION (50 U.S.C. § 3952)



PROPERTY TYPE: ☐ Motor Vehicle ☐ Real Property ☐ Other: [DESCRIBE]

Purchase Date: ${data.today}

Down Payment: $$1,000.00 ([XX]% of purchase price)



VIOLATION:

50 U.S.C. § 3952 prohibits repossession/foreclosure of property purchased 

before military service with a deposit of $$1,000.00 or more, without 

court order.



YOUR ACTION:

☐ Repossessed vehicle on ${data.today} without court order

☐ Foreclosed on property on ${data.today} without court order

☐ Reported repossession/foreclosure to credit bureaus



PENALTIES (50 U.S.C. § 3959):

• Fines up to $100,000

• Imprisonment up to one year

• Private right of action for damages



REQUIRED REMEDY:

1. Return property immediately

2. Void sale of repossessed property

3. Reimburse auction proceeds shortfall

4. Delete adverse credit reporting

5. Compensate for damages



IV. HARM SUFFERED



Financial Damages:

• Excess interest charged: $$1,000.00

• Late fees during deployment: $$1,000.00

• Repossession/sale deficiency: $$1,000.00

• Garnished wages: $$1,000.00

• Security clearance investigation costs: $$1,000.00

• Credit repair expenses: $$1,000.00

• Higher insurance premiums: $$1,000.00/year × [YEARS]



Credit Score Impact:

• Score before violations: [SCORE]

• Score with violations: [SCORE]

• Point drop: ${data.accountNumber || 'XXXX-XXXX-XXXX'} points



Career Impact:

☐ Security clearance review triggered

☐ Promotion delayed due to financial issues

☐ Command investigation of financial irresponsibility

☐ Loss of special duty assignment eligibility



Emotional Distress:

• Stress while deployed in combat zone

• Family hardship (spouse dealing with creditor harassment)

• Anxiety over security clearance

• Embarrassment within unit



V. LEGAL VIOLATIONS SUMMARY



A. SCRA VIOLATIONS (50 U.S.C. § 3901 et seq.):

   § 3937 – Interest rate cap violation

   § 3931 – Default judgment without affidavit

   § 3952 – Unlawful repossession/foreclosure

   § 3953 – Mortgage foreclosure protection

   § 3959 – Criminal penalties (fines + imprisonment)

   

   PRIVATE RIGHT OF ACTION: 50 U.S.C. § 4041

   Damages: Actual + Punitive + Attorney Fees + Costs



B. FCRA VIOLATIONS (15 U.S.C. § 1681 et seq.):

   § 1681e(b) – Inaccurate reporting (late payments based on SCRA-protected debt)

   § 1681s-2(a) – Furnishing inaccurate information

   § 1681s-2(b) – Failure to investigate dispute

   

   Damages (Willful): $100-$1,000 per violation + punitive + attorney fees

   Damages (Negligent): Actual damages + attorney fees



C. FDCPA VIOLATIONS (if applicable – 15 U.S.C. § 1692):

   § 1692e – False/misleading representations (claiming debt not reduced to 6%)

   § 1692f – Unfair practices (collecting excess interest)

   

   Damages: Up to $1,000 + actual + attorney fees



D. STATE LAW VIOLATIONS:

   [STATE] SCRA Supplement: [STATE STATUTE]

   [STATE] Consumer Protection Act: [STATE STATUTE]



VI. REQUIRED CORRECTIVE ACTIONS



Within 15 DAYS of receipt, you MUST:



1. ☐ REDUCE interest rate to 6% retroactive to [DATE NOTICE SENT]

2. ☐ RECALCULATE account balance using 6% interest cap

3. ☐ REFUND excess interest collected: $$1,000.00

4. ☐ WAIVE all late fees charged during deployment: $$1,000.00

5. ☐ DELETE all adverse credit reporting:

   • Late payment notations during deployment

   • Default/charge-off status

   • Repossession notation

   • Judgment reporting

   • Collection account

6. ☐ UPDATE credit report to show:

   • Current/Paid as Agreed status

   • Corrected balance

   • No late payments

7. ☐ RETURN repossessed property (if applicable)

8. ☐ VOID judgment obtained without SCRA affidavit

9. ☐ CEASE all collection activities

10. ☐ PROVIDE written confirmation of all corrections

11. ☐ SEND updated credit report showing corrections

12. ☐ NOTIFY all credit bureaus of corrections



VII. EVIDENCE ENCLOSED



Exhibit A: Military Orders (Active Duty/Deployment)

Exhibit B: Written Notice + Proof of Military Service (DD Form 214 / LES)

Exhibit C: Deployment Orders to [LOCATION]

Exhibit D: Account Statement showing interest charges > 6%

Exhibit E: Calculation of excess interest: $$1,000.00

Exhibit F: Credit report showing adverse reporting dated ${data.today}

Exhibit G: Repossession notice dated ${data.today} (if applicable)

Exhibit H: Default judgment docket entry (if applicable)

Exhibit I: Correspondence with creditor dated [DATES]

Exhibit J: Leave and Earnings Statement (LES) showing active duty pay

Exhibit K: Documentation of deployment communication limitations

Exhibit L: [OTHER SUPPORTING DOCUMENTS]



VIII. REGULATORY NOTIFICATION



Copies of this complaint are being filed with:



☐ U.S. Department of Justice, Civil Rights Division (SCRA enforcement)

☐ Consumer Financial Protection Bureau (CFPB)

☐ Federal Trade Commission (FTC)

☐ [STATE] Attorney General

☐ Military Legal Assistance Office, [BASE NAME]

☐ [BRANCH] Judge Advocate General Corps

☐ Department of Defense Inspector General

☐ Servicemembers Civil Relief Act Centralized Verification Service



IX. INTENT TO LITIGATE



Failure to remedy these violations within 15 days will result in:



1. Federal lawsuit under 50 U.S.C. § 4041 (SCRA private right of action)

2. FCRA lawsuit under 15 U.S.C. §§ 1681n (willful) and 1681o (negligent)

3. Request for:

   • Actual damages (excess interest, fees, lost wages, etc.)

   • Statutory damages ($100-$1,000 per FCRA violation)

   • Punitive damages (SCRA and FCRA)

   • Injunctive relief

   • Attorney fees and costs

   • Criminal referral to DOJ (50 U.S.C. § 3959)



X. CERTIFICATION UNDER PENALTY OF PERJURY



I, [RANK] [FULL NAME], certify under penalty of perjury under the laws 

of the United States that:



1. I am currently serving on active duty in the [BRANCH]

2. The account #${data.accountNumber || 'XXXX-XXXX-XXXX'} was incurred BEFORE entering military service

3. I provided written notice and proof of military service on ${data.today}

4. The facts stated in this letter are true and correct

5. The enclosed military orders are authentic



Executed this [DAY] day of [MONTH], [YEAR] at [LOCATION].



_________________________________

${data.clientName}

[RANK] [FULL NAME]

[SERVICE BRANCH]



MILITARY CONTACT:

Unit: [UNIT NAME]

Duty Station: [BASE, STATE/COUNTRY]

Phone: [DSN/COMMERCIAL]

Email: [MILITARY EMAIL]



PERMANENT CONTACT:

Address: [HOME ADDRESS]

Phone: [CIVILIAN PHONE]

Email: [CIVILIAN EMAIL]



ENCLOSURES: Exhibits A-L (as listed)



⚠️ NOTICE: Violation of SCRA protections may result in criminal prosecution 

under 50 U.S.C. § 3959 (fines up to $100,000 and/or imprisonment up to 1 year).

\`\`\`



# 📋 **ULTIMATE CREDIT REPAIR & LITIGATION SOFTWARE – COMPLETE TEMPLATE LIBRARY**



---



## **SECTION 7: SPECIALIZED VIOLATION DISPUTE LETTERS (CONTINUED)**



---



### **`;
}


// ===============================================================
// generateMedicalDebtViolationDisputeCfpb2024
// ===============================================================
export function generateMedicalDebtViolationDisputeCfpb2024(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `Template 7.3 – Medical Debt Violation Dispute (CFPB 2024 Rules)**



\`\`\`

${data.clientName}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}

${data.clientPhone || ''}

${data.clientEmail || ''}



${data.today}



CERTIFIED MAIL #: ${data.reportId || '7020 1810 0001 XXXX XXXX'}



${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

${data.clientAddress}

${data.clientCity}, ${data.clientState} ${data.clientZip}



RE: FORMAL DISPUTE – MEDICAL DEBT REPORTING VIOLATIONS

    CONSUMER: ${data.clientName}

    FILE NUMBER: [CREDIT FILE NUMBER]

    MEDICAL ACCOUNT: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

    PROVIDER: [MEDICAL PROVIDER/COLLECTION AGENCY]



Dear Sir/Madam:



I. CFPB FINAL RULE – MEDICAL DEBT PROHIBITION



On March 30, 2023, the Consumer Financial Protection Bureau issued a final 

rule (Regulation V, 12 CFR § 1022.30(b)) PROHIBITING the reporting of 

medical debt information on consumer credit reports.



EFFECTIVE DATE: Enforcement began [DATE - check current CFPB rule status]



STATUTORY AUTHORITY:

• Dodd-Frank Wall Street Reform Act § 1022(c)(9)

• Fair Credit Reporting Act § 604(g), 15 U.S.C. § 1681b(g)



II. VIOLATIONS IDENTIFIED



Your credit report dated ${data.today} contains the following PROHIBITED medical 

debt information:



ACCOUNT #1:

☐ Medical Collection Account

   Original Creditor: [HOSPITAL/PROVIDER NAME]

   Collection Agency: ${(data.bureau || 'Equifax/Experian/TransUnion').toUpperCase()}

   Account Number: ${data.accountNumber || 'XXXX-XXXX-XXXX'}

   Balance: $$1,000.00

   Date Opened: ${data.today}

   Status: [Collection/Charge-Off/etc.]

   

ACCOUNT #2: [REPEAT AS NEEDED]



VIOLATION: All medical debt reporting is PROHIBITED under 12 CFR § 1022.30(b).



III. ADDITIONAL VIOLATIONS (Pre-2024 Rules)



Even under PRIOR regulations, this medical debt violates multiple laws:



A. ONE-YEAR REPORTING PROHIBITION (15 U.S.C. § 1681c(a)(7)):



   Date of Service: ${data.today}

   Date Placed for Collection: ${data.today}

   Age of Debt: ${data.accountNumber || 'XXXX-XXXX-XXXX'} days/months

   

   ☐ VIOLATION: Debt less than 365 days old (reported at ${data.accountNumber || 'XXXX-XXXX-XXXX'} days)

   

   "A consumer reporting agency may not furnish...any information related 

   to a debt arising from a medical service...until the date that is 365 

   days after the date on which the debt was placed for collection."



B. PAID MEDICAL DEBT PROHIBITION (15 U.S.C. § 1681c(a)(8)):



   Date Paid: ${data.today}

   Payment Method: ☐ Insurance ☐ Personal Payment ☐ Settlement

   Proof: Exhibit A – [Receipt/EOB/Settlement Agreement]

   

   ☐ VIOLATION: Reporting PAID medical debt

   

   "A consumer reporting agency may not furnish...information related to 

   a fully paid or settled debt...that arose from a medical service."



C. VETERANS' MEDICAL DEBT (15 U.S.C. § 1681c(a)(9)):



   ☐ I am a veteran (DD-214 enclosed as Exhibit B)

   ☐ This debt is from VA medical care

   ☐ OR debt is owed to a non-VA provider for VA-authorized care

   

   VIOLATION: ALL veterans' medical debt is prohibited from reporting.



D. INSURANCE PAYMENT PROCESSING DELAYS:



   ☐ Debt resulted from insurance claim processing delay

   ☐ Insurance paid claim on ${data.today} AFTER collection reporting began

   ☐ Provider/collector failed to verify insurance before reporting

   

   Explanation of Benefits (EOB): Exhibit C

   

   VIOLATION: 15 U.S.C. § 1681e(b) – Reporting debt consumer did not owe.



E. ERISA VIOLATIONS (29 U.S.C. § 1001 et seq.):



   ☐ Employer-sponsored health plan covered th
<truncated 236956 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.`;
}


// ===============================================================
// generateTexasFinanceCode392Enhanced
// ===============================================================
export function generateTexasFinanceCode392Enhanced(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `9.3 – TEXAS FINANCE CODE CHAPTER 392 ENHANCED LETTER**

\`\`\`
${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
${data.clientPhone || ''}
${data.clientEmail || ''}

${data.today}

CERTIFIED MAIL #: ${data.reportId || '7020 1810 0001 XXXX XXXX'}

${data.creditorName || 'CREDITOR'}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}

RE: TEXAS FINANCE CODE CHAPTER 392 VIOLATIONS
    CONSUMER: ${data.clientName}
    ACCOUNT: ${data.accountNumber || 'XXXX-XXXX-XXXX'}
    TEXAS RESIDENT - STATE LAW PROTECTIONS APPLY

Dear Sir/Madam:

I. JURISDICTIONAL STATEMENT

I am a resident of the State of Texas. Your debt collection activities 
are governed by:

• Texas Finance Code Chapter 392 (Debt Collection Act)
• Texas Deceptive Trade Practices-Consumer Protection Act (DTPA), Tex. Bus. & Com. Code § 17.41 et seq.
• Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692 et seq.
• Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

Texas law provides ADDITIONAL protections beyond federal law.

II. TEXAS DEBT COLLECTION ACT VIOLATIONS

Texas Finance Code Chapter 392 PROHIBITS specific collection practices:

A. THREATS OR COERCION (Tex. Fin. Code § 392.301)

A debt collector may NOT use threats, coercion, or attempts to coerce 
that employ any of the following practices:

☐ (1) USING OR THREATENING VIOLENCE
    Your Action: Detailed report inaccuracy and incorrect reporting status.
    Date: ${data.today}
    
    ✅ VIOLATION: Tex. Fin. Code § 392.301(a)(1)
    Criminal Penalty: Class B misdemeanor

☐ (2) THREATENING CRIMINAL PROSECUTION
    Your Statement: [QUOTE]
    Date: ${data.today}
    
    Reality: Non-payment of debt is NOT a crime in Texas
    
    ✅ VIOLATION: Tex. Fin. Code § 392.301(a)(2)

☐ (3) DISCLOSING/THREATENING TO DISCLOSE FALSE CREDIT INFORMATION
    Your Action: Detailed report inaccuracy and incorrect reporting status.
    
    Examples:
    • Threatening to report inaccurate amount
    • Threatening to report time-barred debt
    • Reporting without verification
    • Reporting as "unpaid" when disputed
    
    ✅ VIOLATION: Tex. Fin. Code § 392.301(a)(3)

☐ (4) THREATENING SEIZURE WITHOUT LEGAL RIGHT
    Your Threat: [QUOTE]
    Date: ${data.today}
    
    Analysis:
    Debt Type: ☐ Secured ☐ Unsecured
    Judgment Obtained: ☐ YES ☐ NO
    
    IF (Unsecured debt with no judgment):
        ✅ VIOLATION: Tex. Fin. Code § 392.301(a)(4)
        Cannot threaten to seize property without legal right

☐ (5) THREATENING ACTION PROHIBITED BY LAW
    Your Threat: Detailed report inaccuracy and incorrect reporting status.
    
    Examples:
    • Threatening garnishment of wages (very limited in Texas)
    • Threatening arrest
    • Threatening to contact employer (if prohibited)
    
    ✅ VIOLATION: Tex. Fin. Code § 392.301(a)(5)

☐ (6) THREATENING ACTION NOT INTENDED
    Your Threat: "We will sue you"
    
    Evidence of Non-Intent:
    ☐ Debt amount below your company's lawsuit threshold
    ☐ No lawsuits filed by your company in past [X] months
    ☐ Company policy against lawsuits
    
    ✅ VIOLATION: Tex. Fin. Code § 392.301(a)(6)

☐ (7) MISREPRESENTING LEGAL RIGHTS
    Your Misrepresentation: [QUOTE]
    
    Examples:
    • "You have no defense to this debt"
    • "You cannot dispute this debt"
    • "You must pay or be arrested"
    
    ✅ VIOLATION: Tex. Fin. Code § 392.301(a)(7)

☐ (8) USING SIMULATED LEGAL/GOVERNMENTAL PROCESS
    Your Document: Detailed report inaccuracy and incorrect reporting status.
    Date: ${data.today}
    
    Prohibited Elements:
    ☐ Looks like court document
    ☐ Uses seal or emblem
    ☐ Fake case number
    ☐ "LEGAL NOTICE" header
    ☐ Official-looking format
    
    ✅ VIOLATION: Tex. Fin. Code § 392.301(a)(8)
    Criminal Penalty: Class B misdemeanor

B. HARASSMENT (Tex. Fin. Code § 392.302)

A debt collector may NOT oppress or harass a person by:

☐ (1) USING PROFANE OR OBSCENE LANGUAGE
    Date/Time: [DATE/TIME]
    Language Used: [QUOTE]
    
    ✅ VIOLATION: Tex. Fin. Code § 392.302(1)

☐ (2) PLACING REPEATED CALLS WITHOUT DISCLOSURE
    Call Log:
    ${data.today}: ${data.accountNumber || 'XXXX-XXXX-XXXX'} calls - Caller ID: [SHOWN/BLOCKED]
    ${data.today}: ${data.accountNumber || 'XXXX-XXXX-XXXX'} calls - Caller ID: [SHOWN/BLOCKED]
    
    Total Calls: ${data.accountNumber || 'XXXX-XXXX-XXXX'} in [TIME PERIOD]
    
    ✅ VIOLATION: Tex. Fin. Code § 392.302(2)

☐ (3) CALLING WITHOUT MEANINGFUL DISCLOSURE OF IDENTITY
    Call Details:
    Date: ${data.today}
    Caller Said: [QUOTE]
    
    Did NOT disclose:
    ☐ Collector's name
    ☐ Company name
    ☐ Purpose of call (debt collection)
    
    ✅ VIOLATION: Tex. Fin. Code § 392.302(3)

☐ (4) CAUSING PHONE TO RING REPEATEDLY
    Dates/Times of Repeated Calls:
    ${data.today} [TIME]
    ${data.today} [TIME]
    ${data.today} [TIME]
    
    Pattern: [DESCRIPTION OF HARASSMENT]
    
    ✅ VIOLATION: Tex. Fin. Code § 392.302(4)

☐ (5) CALLING AFTER NOTIFICATION OF INCONVENIENT TIME
    My Notice to You: ${data.today}
    Method: [ORAL/WRITTEN]
    Inconvenient Times: [SPECIFY]
    
    Calls After Notice:
    ${data.today} [TIME] - [DURING PROHIBITED TIME]
    
    ✅ VIOLATION: Tex. Fin. Code § 392.302(5)

☐ (6) ANONYMOUSLY OR REPEATEDLY CALLING BY PHONE
    ☐ Blocked caller ID
    ☐ Spoofed number
    ☐ Anonymous calls
    
    ✅ VIOLATION: Tex. Fin. Code § 392.302(6)

☐ (7) CALLING BEFORE 8 AM OR AFTER 9 PM
    Call Date/Time: [DATE/TIME]
    My Time Zone: [CENTRAL TIME]
    
    ✅ VIOLATION: Tex. Fin. Code § 392.302(7)

C. UNFAIR OR UNCONSCIONABLE MEANS (Tex. Fin. Code § 392.303)

A debt collector may NOT use unfair or unconscionable means:

☐ (1) SEEKING AMOUNT > DEBT + AUTHORIZED CHARGES
    Amount Claimed: $$1,000.00
    
    Breakdown:
    Principal: $$1,000.00
    Authorized Interest: $$1,000.00 (per contract)
    Authorized Fees: $$1,000.00 (per contract)
    UNAUTHORIZED Charges: $$1,000.00 ← VIOLATION
    
    Unauthorized Items:
    ☐ Collection fee not in contract
    ☐ Interest rate exceeding contract
    ☐ Made-up fees
    
    ✅ VIOLATION: Tex. Fin. Code § 392.303(a)(1)

☐ (2) COLLECTING EXPENSE NOT AUTHORIZED
    Collection Costs Claimed: $$1,000.00
    
    Authorization Analysis:
    ☐ NOT in original contract
    ☐ NOT permitted by Texas law
    ☐ NOT court-awarded
    
    ✅ VIOLATION: Tex. Fin. Code § 392.303(a)(2)

☐ (3) THREATENING TO TAKE PROPERTY WITHOUT LEGAL PROCESS
    Your Threat: [QUOTE]
    Date: ${data.today}
    
    Property Threatened: [DESCRIBE]
    Legal Right: ☐ None ☐ Lien ☐ Security Interest
    
    IF (No legal right):
        ✅ VIOLATION: Tex. Fin. Code § 392.303(a)(3)

☐ (4) MISREPRESENTING DEBT AMOUNT OR STATUS
    Your Representation: [QUOTE]
    Actual Facts: [REALITY]
    
    Examples:
    • Claiming amount higher than actual
    • Claiming debt is judgment when it's not
    • Claiming debt is guaranteed when it's not
    
    ✅ VIOLATION: Tex. Fin. Code § 392.303(a)(4)

☐ (5) THREATENING PROPERTY DISPOSSESSION WITHOUT RIGHT
    Your Threat: "We will take your car/house/etc."
    
    Reality:
    ☐ Unsecured debt (no collateral)
    ☐ No judgment obtained
    ☐ No legal right to property
    
    ✅ VIOLATION: Tex. Fin. Code § 392.303(a)(5)

☐ (6) THREATENING GARNISHMENT WITHOUT LEGAL BASIS
    Your Threat: "We will garnish your wages"
    
    Texas Law: Wage garnishment VERY LIMITED in Texas
    Allowed ONLY for:
    • Child support
    • Spousal maintenance
    • Student loans (federal)
    • Unpaid taxes
    
    This Debt Type: [NOT ON ALLOWED LIST]
    
    ✅ VIOLATION: Tex. Fin. Code § 392.303(a)(6)
    (Threatening action not legally available)

☐ (7) COMMUNICATING DEBT INFO TO EMPLOYER
    Date: ${data.today}
    Your Contact with: [EMPLOYER NAME]
    Information Disclosed: Detailed report inaccuracy and incorrect reporting status.
    
    Texas Law: Cannot communicate with employer EXCEPT:
    • To verify employment
    • To locate consumer
    • Per court order
    
    ✅ VIOLATION: Tex. Fin. Code § 392.303(a)(7)

☐ (8) THREATENING ACTION PROHIBITED BY LAW
    Your Threat: Detailed report inaccuracy and incorrect reporting status.
    
    ✅ VIOLATION: Tex. Fin. Code § 392.303(a)(8)

D. FRAUDULENT, DECEPTIVE, OR MISLEADING REPRESENTATIONS 
   (Tex. Fin. Code § 392.304)

☐ (1) MISREPRESENTING COLLECTOR'S IDENTITY OR DEBT CHARACTER
    Your Representation: [QUOTE]
    Reality: [TRUTH]
    
    Examples:
    • Claiming to be attorney (when not)
    • Claiming to be government agency
    • Misrepresenting debt amount
    • False urgency ("Final notice" when not final)
    
    ✅ VIOLATION: Tex. Fin. Code § 392.304(a)(1)

☐ (2) MISREPRESENTING AVAILABILITY OF CREDIT
    Your Statement: [QUOTE]
    
    Example: "Pay this debt and we'll extend new credit"
    Reality: No such credit available
    
    ✅ VIOLATION: Tex. Fin. Code § 392.304(a)(2)

☐ (3) COMMUNICATING FALSE CREDIT INFORMATION
    Your Credit Reporting: [DETAILS]
    
    False Information:
    ☐ Wrong amount
    ☐ Wrong status
    ☐ Unverified debt
    ☐ Time-barred debt
    
    ✅ VIOLATION: Tex. Fin. Code § 392.304(a)(8)

☐ (4) USING BUSINESS NAME OTHER THAN TRUE NAME
    Your Business Name: [NAME USED]
    Actual Legal Name: [REAL NAME]
    
    Purpose: To mislead/confuse consumer
    
    ✅ VIOLATION: Tex. Fin. Code § 392.304(a)(9)

☐ (5) FAILURE TO DISCLOSE DEBT COLLECTOR STATUS
    Your Communication: Detailed report inaccuracy and incorrect reporting status.
    
    Did NOT state: "This is an attempt to collect a debt"
    
    ✅ VIOLATION: Tex. Fin. Code § 392.304(a)(19)

E. UNCONSCIONABLE CONDUCT (Tex. Fin. Code § 392.305)

☐ TAKING UNCONSCIONABLE ADVANTAGE OF CONSUMER
    Examples:
    • Collecting on debt consumer doesn't owe
    • Exploiting consumer's lack of knowledge
    • Taking advantage of disability/illness
    • Pressuring elderly consumer
    
    Your Action: Detailed report inaccuracy and incorrect reporting status.
    
    ✅ VIOLATION: Tex. Fin. Code § 392.305

III. TEXAS STATUTE OF LIMITATIONS (4-YEAR)

Texas Statute of Limitations for Debts:
• Open accounts (credit cards): 4 years (Tex. Civ. Prac. & Rem. Code § 16.004(c))
• Written contracts: 4 years (Tex. Civ. Prac. & Rem. Code § 16.004(a)(3))
• Oral contracts: 4 years (Tex. Civ. Prac. & Rem. Code § 16.004(a)(3))

This Debt:
Type: [CREDIT CARD / CONTRACT / etc.]
Date of First Delinquency: ${data.today}
SOL: 4 years
SOL Expiration: [DOFD + 4 years]
Today: ${data.today}

Status: ☐ TIME-BARRED (SOL expired)

IF TIME-BARRED:

Your Collection Activities Violate:
✅ Tex. Fin. Code § 392.303(a)(4): Misrepresenting legal status
✅ Tex. Fin. Code § 392.301(a)(5): Threatening action prohibited by law
✅ FDCPA § 1692e(2)(A): False representation of debt's legal status
✅ FDCPA § 1692e(5): Threat of action not intended

Texas Law: Cannot sue on time-barred debt (affirmative defense)
Your Conduct: Implying legal obligation when none exists

IV. TEXAS DECEPTIVE TRADE PRACTICES ACT (DTPA)

Tex. Bus. & Com. Code § 17.41 et seq.

Deceptive Trade Practices in Debt Collection:

☐ § 17.46(b)(7): Representing goods/services have characteristics they 
                  do NOT have
    Application: Representing debt has legal enforceability when 
                 time-barred
    
    ✅ VIOLATION: DTPA § 17.46(b)(7)

☐ § 17.46(b)(12): Representing authority/rights that do not exist
    Examples:
    • Claiming right to garnish wages (when unavailable)
    • Claiming right to seize property (when no lien)
    • Claiming legal authority to collect (when time-barred)
    
    ✅ VIOLATION: DTPA § 17.46(b)(12)

☐ § 17.50: DTPA provides TREBLE DAMAGES for knowing violations
    If your violations were KNOWING/INTENTIONAL:
    Actual Damages: $$1,000.00
    × 3 (Treble)
    ──────────────
    DTPA Damages: $[AMOUNT × 3]
    
    + Attorney Fees (mandatory if I prevail)
    + Court Costs

V. TEXAS DAMAGES - SIGNIFICANTLY HIGHER THAN FEDERAL

┌──────────────────────────────────────────────────────────────┐
│ TEXAS vs. FEDERAL DAMAGES COMPARISON                         │
├──────────────────────────────────────────────────────────────┤
│ FDCPA (Federal):                                             │
│ • Up to $1,000 total (not per violation)                     │
│ • Actual damages                                             │
│ • Attorney fees (discretionary)                              │
│                                                              │
│ TEXAS FINANCE CODE § 392.403:                                │
│ • Actual damages                                             │
│ • $100 minimum statutory (even if no actual damages)         │
│ • Attorney fees (mandatory if consumer prevails)             │
│ • Court costs                                                │
│ • PLUS injunctive relief                                     │
│                                                              │
│ TEXAS DTPA (if applicable):                                  │
│ • Actual damages × 3 (TREBLE) if knowing violation           │
│ • Attorney fees (mandatory)                                  │
│ • Court costs                                                │
│ • Mental anguish damages (up to 3× actuals)                  │
└──────────────────────────────────────────────────────────────┘

DAMAGES CALCULATION FOR THIS CASE:

A. ACTUAL DAMAGES
   Financial Harm:
   • Credit denials: $$1,000.00
   • Higher interest rates: $$1,000.00
   • Lost wages (time spent): $[HOURS] × $[RATE]
   
   Emotional Distress:
   • Anxiety from harassment
   • Stress from threats
   • Humiliation from third-party disclosure
   • Mental anguish (DTPA allows recovery)
   
   Out-of-Pocket:
   • Phone records: $$1,000.00
   • Certified mail: $$1,000.00
   • Credit monitoring: $$1,000.00
   
   TOTAL ACTUAL: $[CALCULATION]

B. TEXAS STATUTORY DAMAGES
   Minimum: $100 (even if actual damages = $0)
   
   IF (Actual damages > $100):
       Statutory = Actual damages amount

C. DTPA TREBLE DAMAGES (if applicable)
   IF (Violations were KNOWING):
       Actual Damages: $$1,000.00
       × 3 (Treble multiplier)
       ──────────────────────────
       DTPA Recovery: $[AMOUNT × 3]

D. ATTORNEY FEES
   Texas law: MANDATORY if consumer prevails
   (NOT discretionary like federal FDCPA)
   
   Estimated: $[AMOUNT based on case complexity]

E. TOTAL TEXAS RECOVERY POTENTIAL
   
   Finance Code Route:
   Actual Damages: $$1,000.00
   Attorney Fees: $$1,000.00
   Costs: $$1,000.00
   ──────────────────────
   TOTAL: $[SUM]
   
   DTPA Route (if knowing violations):
   Treble Damages: $[AMOUNT × 3]
   Attorney Fees: $$1,000.00
   Costs: $$1,000.00
   ──────────────────────
   TOTAL: $[SUM]
   
   PLUS Federal FDCPA (cumulative):
   Up to $1,000 + Actual + Attorney Fees
   
   GRAND TOTAL EXPOSURE: $[MAXIMUM CALCULATION]

VI. CRIMINAL PENALTIES (Texas)

Certain violations constitute CRIMINAL OFFENSES:

Class B Misdemeanor (Tex. Fin. Code § 392.307):
• Simulating legal process (§ 392.301(a)(8))
• Threatening violence (§ 392.301(a)(1))
• Threatening criminal prosecution (§ 392.301(a)(2))

Penalty: Up to 180 days jail + up to $2,000 fine

I am filing criminal complaints with:
☐ Texas Attorney General—Consumer Protection Division
☐ [COUNTY] District Attorney's Office
☐ Texas Department of Banking

VII. TEXAS DEBT COLLECTION LICENSING

Texas Finance Code § 392.101 et seq. requires debt collectors to be 
licensed by the Texas Office of Consumer Credit Commissioner (OCCC).

Your License Status:
License Number: [NUMBER if known]
Licensee Name: [NAME]

Complaints Filed With:
Texas Office of Consumer Credit Commissioner
2601 N. Lamar Blvd.
Austin, TX 78705
Phone: 1-800-538-1579
Email: consumer.complaints@occc.texas.gov

Violations of Chapter 392 may result in:
☐ License suspension
☐ License revocation  
☐ Administrative penalties up to $1,000 per violation per day
☐ Cease-and-desist orders

VIII. REQUIRED ACTIONS

You must IMMEDIATELY:

1. CEASE all collection activities prohibited by Texas law:
   ☐ Stop all phone calls
   ☐ Stop all threatening communications
   ☐ Stop all third-party disclosures
   ☐ Stop false credit reporting
   ☐ Stop collecting unauthorized amounts

2. SEND WRITTEN CONFIRMATION of cessation within 10 days

3. PROVIDE DEBT VALIDATION:
   ☐ Original signed contract/agreement
   ☐ Account statements showing balance
   ☐ Chain of title (if debt purchased)
   ☐ Itemization of all charges
   ☐ Proof of Texas licensure

4. DELETE all inaccurate credit reporting

5. PAY DAMAGES (if settlement desired):
   Settlement Demand: $$1,000.00
   Deadline: [DATE - 30 days]
   
   Settlement includes:
   ☐ Cessation of all collection
   ☐ Deletion of credit reporting
   ☐ Release of all claims against me
   ☐ Payment of damages
   ☐ Written confirmation of above

IX. LEGAL NOTICE

Your failure to comply will result in:

A. TEXAS STATE COURT LAWSUIT
   Court: [COUNTY] County Court at Law / District Court
   Claims:
   • Tex. Fin. Code Chapter 392 violations
   • Tex. Bus. & Com. Code § 17.50 (DTPA) violations
   
   Damages:
   • Actual: $$1,000.00
   • Treble (DTPA, if knowing): $[AMOUNT × 3]
   • Minimum statutory: $100
   • Attorney fees: MANDATORY
   • Costs: All court costs
   • Injunctive relief
   
   TOTAL STATE CLAIM: $[CALCULATION]

B. FEDERAL COURT LAWSUIT (FDCPA + FCRA)
   Court: U.S. District Court, [District] District of Texas
   Claims: 15 U.S.C. §§ 1692, 1681
   
   Damages: Up to $1,000 + actual + attorney fees

C. CUMULATIVE RECOVERY
   Can pursue BOTH Texas state AND federal claims simultaneously.
   
   Texas courts allow supplemental federal claims.
   Federal courts allow supplemental state claims.
   
   Total recovery = Texas damages + Federal damages

D. REGULATORY COMPLAINTS
   ☐ Texas Attorney General—Consumer Protection Division
   ☐ Texas Office of Consumer Credit Commissioner (OCCC)
   ☐ Texas Department of Banking
   ☐ Consumer Financial Protection Bureau (CFPB)
   ☐ Federal Trade Commission (FTC)

E. CRIMINAL COMPLAINTS (if applicable)
   ☐ Texas Attorney General—Criminal Investigations Division
   ☐ [COUNTY] District Attorney's Office

X. STATUTE CITATION SUMMARY

PRIMARY TEXAS STATUTES:

Texas Finance Code Chapter 392 (Debt Collection):
• § 392.301: Threats or coercion prohibited
• § 392.302: Harassment prohibited
• § 392.303: Unfair or unconscionable means prohibited
• § 392.304: Fraudulent or misleading representations prohibited
• § 392.305: Unconscionable conduct prohibited
• § 392.307: Criminal penalties (Class B misdemeanor)
• § 392.403: Civil remedies (actual + $100 min + attorney fees)

Texas Deceptive Trade Practices Act:
• Tex. Bus. & Com. Code § 17.46: Deceptive trade practices
• Tex. Bus. & Com. Code § 17.50: Damages (treble if knowing)

Texas Statute of Limitations:
• Tex. Civ. Prac. & Rem. Code § 16.004: 4-year SOL for debts

FEDERAL STATUTES (cumulative):
• 15 U.S.C. § 1692 et seq.: Fair Debt Collection Practices Act
• 15 U.S.C. § 1681 et seq.: Fair Credit Reporting Act

XI. CERTIFICATION

I certify under penalty of perjury under the laws of the State of 
Texas and the United States that the foregoing is true and correct.

Executed this [DAY] day of [MONTH], [YEAR] at [CITY], Texas.

_________________________________
${data.clientName}
${data.clientName}

CONTACT INFORMATION:
Texas Address: ${data.clientAddress}
Phone: ${data.clientPhone || ''}
Email: ${data.clientEmail || ''}

ENCLOSURES: Exhibits A-Z

───────────────────────────────────────────────────────────────

NOTICE TO DEBT COLLECTOR:

Texas provides STRONGER debt collection protections than federal law:

✓ Specific prohibited practices beyond FDCPA
✓ TREBLE damages available under DTPA (3× actual damages)
✓ Mandatory attorney fees (not discretionary)
✓ Criminal penalties for certain violations (180 days jail)
✓ 4-year statute of limitations (shorter than most states)
✓ Limited wage garnishment (cannot threaten in most cases)
✓ License revocation risk

You face significantly HIGHER damages exposure in Texas than under 
federal FDCPA alone.

Total potential liability: $[CALCULATION] + criminal penalties

Cease all violations immediately or face litigation.

───────────────────────────────────────────────────────────────
\`\`\`

---

### **`;
}


// ===============================================================
// generateNewYorkGbl349Enhanced
// ===============================================================
export function generateNewYorkGbl349Enhanced(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `9.4 – NEW YORK GBL § 349 ENHANCED LETTER**

\`\`\`
${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
${data.clientPhone || ''}
${data.clientEmail || ''}

${data.today}

CERTIFIED MAIL #: ${data.reportId || '7020 1810 0001 XXXX XXXX'}

${data.creditorName || 'CREDITOR'}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}

RE: NEW YORK GENERAL BUSINESS LAW § 349 VIOLATIONS
    CONSUMER: ${data.clientName}
    ACCOUNT: ${data.accountNumber || 'XXXX-XXXX-XXXX'}
    NEW YORK RESIDENT - STATE LAW PROTECTIONS APPLY

Dear Sir/Madam:

I. JURISDICTIONAL STATEMENT

I am a resident of the State of New York. Your conduct is governed by:

• New York General Business Law § 349 (Deceptive Acts and Practices)
• New York General Business Law § 601 et seq. (Collection Agency Licensing)
• Fair Debt Collection Practices Act (FDCPA), 15 U.S.C. § 1692 et seq.
• Fair Credit Reporting Act (FCRA), 15 U.S.C. § 1681 et seq.

New York law provides STRONGER consumer protections than federal law.

II. NEW YORK GBL § 349 - DECEPTIVE ACTS AND PRACTICES

New York General Business Law § 349 states:

"Deceptive acts or practices in the conduct of any business, trade or 
 commerce or in the furnishing of any service in this state are hereby 
 declared unlawful."

SCOPE: § 349 applies to:
• Consumer transactions
• Conduct affecting consumers at large
• ANY deceptive practice (not limited to enumerated list)

BROAD PROTECTION: New York courts interpret § 349 EXPANSIVELY to protect 
consumers from ANY misleading business practice.

A. YOUR DECEPTIVE PRACTICES UNDER § 349

☐ (1) MISREPRESENTING DEBT AMOUNT OR STATUS
    Your Representation: [QUOTE]
    Actual Amount/Status: [TRUTH]
    
    Examples:
    • Claiming amount including unauthorized fees
    • Representing time-barred debt as enforceable
    • Stating debt is guaranteed when it's not
    • Claiming court judgment when none exists
    
    ✅ VIOLATION: NY GBL § 349

☐ (2) FALSE THREATS OF LEGAL ACTION
    Your Threat: [QUOTE]
    Date: ${data.today}
    
    Reality:
    ☐ You have not filed lawsuit
    ☐ Debt is time-barred (cannot sue)
    ☐ You have no intention to sue
    
    New York Courts: False litigation threats = § 349 violation
    Case Law: Gaidon v. Guardian Life Ins. Co., 94 N.Y.2d 330 (1999)
    
    ✅ VIOLATION: NY GBL § 349

☐ (3) SIMULATING LEGAL PROCESS
    Your Document: Detailed report inaccuracy and incorrect reporting status.
    
    Deceptive Elements:
    ☐ Made to look like court document
    ☐ "LEGAL NOTICE" header
    ☐ Fake case number
    ☐ Official-looking seal
    ☐ Language suggesting legal proceeding
    
    ✅ VIOLATION: NY GBL § 349

☐ (4) MISREPRESENTING IDENTITY OR AUTHORITY
    Your Representation: [QUOTE]
    
    Examples:
    • Claiming to be attorney (when not)
    • Claiming government affiliation
    • Implying special legal authority
    • Using misleading business name
    
    ✅ VIOLATION: NY GBL § 349

☐ (5) FALSE CREDIT REPORTING THREATS
    Your Threat: "We will ruin your credit"
    
    Deceptive Aspect:
    ☐ Overstating credit impact
    ☐ Claiming reporting when not actually reporting
    ☐ Threatening to report inaccurate information
    
    ✅ VIOLATION: NY GBL § 349

☐ (6) DECEPTIVE COLLECTION PRACTICES
    Your Practice: Detailed report inaccuracy and incorrect reporting status.
    
    Examples:
    • Repeated calls designed to harass
    • Contacting after cease-and-desist
    • Disclosing debt to third parties
    • Using false urgency ("Final notice" when not)
    
    New York Courts: Harassing collection tactics = § 349 violation
    
    ✅ VIOLATION: NY GBL § 349

☐ (7) COLLECTING UNAUTHORIZED AMOUNTS
    Amount Claimed: $$1,000.00
    Authorized Amount: $$1,000.00
    Unauthorized Fees: $[DIFFERENCE]
    
    Breakdown:
    Principal: $$1,000.00
    Contract Interest: $$1,000.00
    UNAUTHORIZED Collection Fees: $$1,000.00
    UNAUTHORIZED "Processing Fees": $$1,000.00
    
    ✅ VIOLATION: NY GBL § 349

☐ (8) TIME-BARRED DEBT COLLECTION
    New York Statute of Limitations:
    • Credit card: 6 years (NY CPLR § 213(2))
    • Written contract: 6 years (NY CPLR § 213(2))
    • Oral contract: 6 years (NY CPLR § 213(2))
    
    This Debt:
    DOFD: ${data.today}
    SOL Expiration: [DOFD + 6 years]
    Today: ${data.today}
    Status: TIME-BARRED
    
    Your Actions:
    ☐ Threatening lawsuit on time-barred debt
    ☐ Implying legal obligation when none exists
    ☐ Failing to disclose time-barred status
    
    New York Law: Collecting time-barred debt without disclosure 
                  of SOL expiration = DECEPTIVE PRACTICE
    
    ✅ VIOLATION: NY GBL § 349
    Case Law: Huertas v. Galaxy Asset Mgmt., 2014 WL 4792161 (S.D.N.Y.)

☐ (9) FALSE REPRESENTATIONS IN CREDIT REPORTING
    Your Credit Reporting: [DETAILS]
    
    Deceptive Elements:
    ☐ Reporting inaccurate balance
    ☐ Reporting time-barred debt
    ☐ Reporting unverified debt
    ☐ Failing to mark disputed debt
    
    ✅ VIOLATION: NY GBL § 349

☐ (10) CONSUMER-ORIENTED CONDUCT
     § 349 requires conduct to be "consumer-oriented" (affect public)
     
     Your Conduct: Detailed report inaccuracy and incorrect reporting status.
     
     Evidence of Consumer-Oriented Nature:
     ☐ Form letters sent to multiple consumers
     ☐ Standard company policy/practice
     ☐ Affects consumers generally, not just me
     
     ✅ MEETS § 349 "CONSUMER-ORIENTED" REQUIREMENT

B. NEW YORK § 349 DAMAGES - SIGNIFICANTLY ENHANCED

┌──────────────────────────────────────────────────────────────┐
│ NY GBL § 349 DAMAGES vs. FEDERAL DAMAGES                     │
├──────────────────────────────────────────────────────────────┤
│ FDCPA (Federal):                                             │
│ • Up to $1,000 (not per violation)                           │
│ • Actual damages                                             │
│ • Attorney fees (discretionary)                              │
│                                                              │
│ NY GBL § 349:                                                │
│ • Up to $50 per violation (if no actual damages)             │
│ • Up to $1,000 maximum statutory if no actual damages        │
│ • Actual damages (unlimited)                                 │
│ • TREBLE DAMAGES (3× actual damages) - MANDATORY             │
│ • Attorney fees (mandatory if consumer prevails)             │
│ • Punitive damages (in egregious cases)                      │
│ • Injunctive relief                                          │
└──────────────────────────────────────────────────────────────┘

CRITICAL ADVANTAGE: TREBLE DAMAGES ARE MANDATORY in § 349 cases

NY GBL § 349(h):
"In any action under this section in which the plaintiff prevails, the 
 court shall award THREE TIMES the actual damages..."

This means: Actual damages × 3 = Recovery (not discretionary)

DAMAGES CALCULATION FOR THIS CASE:

A. ACTUAL DAMAGES
   Financial Harm:
   • Credit denials: $$1,000.00
   • Higher interest rates paid: $$1,000.00
   • Lost employment opportunity: $$1,000.00
   • Security deposits: $$1,000.00
   • Time spent disputing: [HOURS] × $[RATE] = $$1,000.00
   
   Emotional Distress:
   • Anxiety from harassment: $$1,000.00
   • Stress from false threats: $$1,000.00
   • Humiliation from disclosure: $$1,000.00
   
   Out-of-Pocket:
   • Certified mail: $$1,000.00
   • Credit monitoring: $$1,000.00
   • Phone records: $$1,000.00
   
   TOTAL ACTUAL DAMAGES: $[CALCULATION]

B. TREBLE DAMAGES (MANDATORY)
   NY GBL § 349(h): "THREE TIMES the actual damages"
   
   Actual Damages: $$1,000.00
   × 3 (Mandatory Treble)
   ──────────────────────────
   TREBLE DAMAGES: $[AMOUNT × 3]

C. STATUTORY DAMAGES (if no actual damages)
   IF (Actual damages = $0 or minimal):
       Up to $50 per violation
       Maximum: $1,000
   
   Number of § 349 Violations: [COUNT]
   Statutory: [COUNT] × $50 = $$1,000.00 (capped at $1,000)

D. ATTORNEY FEES
   NY GBL § 349(h): "reasonable attorney's fees"
   MANDATORY if I prevail (not discretionary)
   
   Estimated Fees: $[AMOUNT based on case complexity]

E. PUNITIVE DAMAGES (if egregious conduct)
   Available in cases of:
   • Willful/wanton misconduct
   • Malicious conduct
   • Reckless disregard of consumer rights
   
   IF (Egregious conduct):
       Punitive Damages: $[ESTIMATED]

F. TOTAL NEW YORK § 349 RECOVERY
   
   Route 1 (With Actual Damages):
   Treble Damages: $[AMOUNT × 3]
   Attorney Fees: $$1,000.00
   Costs: $$1,000.00
   ──────────────────────────
   TOTAL: $[SUM]
   
   Route 2 (Without Actual Damages):
   Statutory: Up to $1,000
   Attorney Fees: $$1,000.00
   Costs: $$1,000.00
   ──────────────────────────
   TOTAL: $[SUM]
   
   PLUS Federal FDCPA (cumulative):
   Up to $1,000 + Actual + Attorney Fees
   
   GRAND TOTAL EXPOSURE: $[MAXIMUM CALCULATION]

III. NEW YORK COLLECTION AGENCY LICENSING (GBL § 600)

New York General Business Law Article 29-H requires collection agencies 
to be licensed by the New York Department of Financial Services (NYDFS).

Your License Status:
Company Name: [NAME]
License Number: [NUMBER if known]
License Status: [ACTIVE / UNKNOWN / UNLICENSED]

Verification: www.dfs.ny.gov (Regulated Entities Search)

UNLICENSED COLLECTION = ADDITIONAL VIOLATIONS:
☐ Operating without license: NY GBL § 601
☐ Penalty: Up to $500 per violation
☐ Subject to cease-and-desist order
☐ Criminal misdemeanor

Complaints Filed With:
New York Department of Financial Services
Consumer Assistance Unit
One Commerce Plaza
Albany, NY 12257
Phone: 1-800-342-3736
Email: consumers@dfs.ny.gov

IV. NEW YORK-SPECIFIC DEBT COLLECTION RULES

A. VALIDATION NOTICE REQUIREMENTS (GBL § 601)

In addition to FDCPA validation notice, New York requires:

☐ Statement of debt amount
☐ Statement that debt will be assumed valid unless disputed
☐ Statement of 30-day dispute right
☐ Statement that verification will be provided if disputed

Your Notice: [COMPLIANT / NON-COMPLIANT]

IF (Notice deficient):
    ✅ VIOLATION: NY GBL § 601

B. PROHIBITED COLLECTION PRACTICES (NYDFS Regulations)

☐ Threatening arrest or legal action without intent
☐ Claiming to be attorney when not
☐ Misrepresenting amount owed
☐ Contacting consumer at work after being asked not to
☐ Contacting consumer after attorney notification
☐ Disclosing debt to third parties (except as allowed)
☐ Using obscene or abusive language
☐ Calling before 8 AM or after 9 PM (consumer's local time)

Violations of NYDFS regulations = § 349 violations + licensing violations

C. TIME-BARRED DEBT DISCLOSURE REQUIREMENT

New York requires disclosure when collecting time-barred debt:

REQUIRED DISCLOSURE:
"This debt is beyond the statute of limitations. You cannot be sued 
 for this debt. If you make a payment, the statute of limitations 
 may be revived and you may be sued."

Your Disclosure: ☐ PROVIDED ☐ NOT PROVIDED

IF (Time-barred debt + No disclosure):
    ✅ VIOLATION: NY GBL § 349 (deceptive practice)
    ✅ VIOLATION: NY GBL § 601 (collection agency violation)

V. NEW YORK CONSUMER PROTECTION ADVANTAGES

New York provides STRONGER protections than most states:

✓ MANDATORY TREBLE DAMAGES (not discretionary)
✓ Actual damages × 3 = Automatic recovery
✓ Mandatory attorney fees (not discretionary)
✓ Broad definition of "deceptive practice"
✓ "Consumer-oriented" standard easy to meet
✓ No exhaustion of administrative remedies required
✓ Can sue in state court (Supreme Court, Civil Court)
✓ Strong appellate precedent favoring consumers
✓ Punitive damages available for egregious conduct
✓ Class actions encouraged (CPLR § 901)

VI. HARM SUFFERED (New York Context)

Financial Harm (recoverable × 3):
• Credit denials in expensive NY market: $$1,000.00
• Higher interest rates: $$1,000.00
• Lost employment (stringent NY background checks): $$1,000.00
• Security deposits (NYC rental market): $$1,000.00
• Increased insurance premiums: $$1,000.00

New York-Specific Harms:
☐ Unable to rent apartment in NYC (credit check required)
☐ Employment denial (financial sector background check)
☐ Denial of professional license
☐ Impact on security clearance

Credit Score Impact:
• Score with violations: [SCORE]
• Estimated correct score: [SCORE]
• Point difference: ${data.accountNumber || 'XXXX-XXXX-XXXX'}
• Impact: Denial of credit/employment in competitive NY market

Emotional Distress (recoverable × 3):
• Anxiety from false threats
• Stress from harassment
• Humiliation from third-party disclosure
• Mental anguish
• Sleep disturbance

New York recognizes emotional distress damages WITHOUT requirement of 
physical manifestation.

Out-of-Pocket Costs (recoverable × 3):
• Credit monitoring: $$1,000.00
• Certified mail: $$1,000.00
• Time spent: [HOURS] × $[NY MIN WAGE $16.50/hr] = $$1,000.00
• Phone records: $$1,000.00

TOTAL ACTUAL DAMAGES: $[CALCULATION]
× 3 (MANDATORY TREBLE)
──────────────────────────────
TREBLE RECOVERY: $[AMOUNT × 3]

VII. LEGAL NOTICE

Your failure to comply will result in:

A. NEW YORK STATE COURT LAWSUIT
   Court: New York Supreme Court, [COUNTY] County
          OR County Civil Court (if damages < $25,000)
   
   Claims:
   • NY GBL § 349: Deceptive acts and practices
   • NY GBL § 601: Collection agency violations
   • Common law fraud (if applicable)
   
   Damages:
   • Actual: $$1,000.00
   • Treble (MANDATORY): $[AMOUNT × 3]
   • Attorney fees: MANDATORY
   • Costs: All court costs
   • Punitive: $[AMOUNT if egregious]
   • Injunctive relief
   
   TOTAL STATE CLAIM: $[CALCULATION]

B. FEDERAL COURT LAWSUIT (FDCPA + FCRA)
   Court: U.S. District Court, [District] of New York
   Claims: 15 U.S.C. §§ 1692, 1681
   
   Damages: Up to $1,000 + actual + attorney fees

C. CUMULATIVE RECOVERY
   Can pursue BOTH New York § 349 AND federal claims.
   
   Many federal courts allow supplemental § 349 claims.
   State courts allow supplemental federal claims.
   
   Total: NY treble damages + Federal damages

D. CLASS ACTION POTENTIAL
   NY CPLR § 901 encourages class actions.
   
   § 349 violations affecting multiple consumers = Class action candidate
   
   Class Damages:
   • Actual damages for each class member
   • × 3 (Treble) for each class member
   • Attorney fees (substantial for class counsel)
   • Potential recovery: $[MILLIONS depending on class size]

E. REGULATORY COMPLAINTS
   ☐ New York Attorney General—Consumer Frauds Bureau
   ☐ New York Department of Financial Services (NYDFS)
   ☐ Consumer Financial Protection Bureau (CFPB)
   ☐ Federal Trade Commission (FTC)

F. LICENSING ACTION
   NYDFS can:
   ☐ Suspend collection agency license
   ☐ Revoke license
   ☐ Impose fines up to $500 per violation
   ☐ Issue cease-and-desist order

VIII. REQUIRED ACTIONS

You must IMMEDIATELY:

1. CEASE all deceptive practices:
   ☐ Stop false threats
   ☐ Stop misrepresenting debt amount/status
   ☐ Stop unauthorized collection activities
   ☐ Stop inaccurate credit reporting

2. PROVIDE FULL DISCLOSURE:
   ☐ IF (Time-barred): Disclose SOL expiration
   ☐ IF (Debt disputed): Mark as disputed
   ☐ Provide complete validation

3. CORRECT credit reporting:
   ☐ Delete if inaccurate
   ☐ Update if obsolete
   ☐ Mark if disputed

4. SEND WRITTEN CONFIRMATION of above within 15 days

5. PAY DAMAGES (if settlement desired):
   Settlement Demand: $$1,000.00
   (Significantly less than treble damages exposure)
   Deadline: [DATE - 30 days]

IX. STATUTE CITATION SUMMARY

PRIMARY NEW YORK STATUTES:

• NY GBL § 349: Deceptive acts and practices (treble damages mandatory)
• NY GBL § 349(h): Remedies (treble + attorney fees + costs)
• NY GBL § 601 et seq.: Collection agency licensing and regulation
• NY CPLR § 213: 6-year statute of limitations for debts
• NY CPLR § 901: Class actions

FEDERAL STATUTES (cumulative):

• 15 U.S.C. § 1692 et seq.: Fair Debt Collection Practices Act
• 15 U.S.C. § 1681 et seq.: Fair Credit Reporting Act

CASE LAW:

• Oswego Laborers' Local 214 Pension Fund v. Marine Midland Bank,
  85 N.Y.2d 20 (1995): § 349 interpretation
• Gaidon v. Guardian Life Ins. Co., 94 N.Y.2d 330 (1999):
  Materiality standard for § 349
• Stutman v. Chemical Bank, 95 N.Y.2d 24 (2000):
  Consumer-oriented conduct requirement

X. NEW YORK ATTORNEY GENERAL NOTIFICATION

Complaint filed with:

New York Attorney General
Consumer Frauds Bureau
28 Liberty Street
New York, NY 10005
Phone: 1-800-771-7755
Email: consumer.frauds@ag.ny.gov

XI. CERTIFICATION

I certify under penalty of perjury under the laws of the State of 
New York and the United States that the foregoing is true and correct.

Executed this [DAY] day of [MONTH], [YEAR] at [CITY], New York.

_________________________________
${data.clientName}
${data.clientName}

CONTACT INFORMATION:
New York Address: ${data.clientAddress}
Phone: ${data.clientPhone || ''}
Email: ${data.clientEmail || ''}

ENCLOSURES: Exhibits A-Z

───────────────────────────────────────────────────────────────

NOTICE TO DEBT COLLECTOR:

New York GBL § 349 provides STRONGER protections than federal FDCPA:

✓ MANDATORY TREBLE DAMAGES (actual × 3, not discretionary)
✓ Mandatory attorney fees (not discretionary)
✓ Broad "deceptive practice" definition
✓ No damage minimum (statutory $50-$1,000 if no actuals)
✓ Punitive damages available
✓ Strong pro-consumer case law
✓ Class action friendly

Your Total Exposure:
• Treble damages: $[AMOUNT × 3]
• Attorney fees: $$1,000.00
• Costs: $$1,000.00
• Potential punitive: $$1,000.00
• PLUS FDCPA: $1,000
• PLUS licensing penalties: $500 per violation
────────────────────────────
TOTAL: $[CALCULATION]

Cease violations immediately or face litigation with TREBLED damages.

───────────────────────────────────────────────────────────────
\`\`\`

-`;
}


// ===============================================================
// generateIllinoisCollectionAgencyActEnhanced
// ===============================================================
export function generateIllinoisCollectionAgencyActEnhanced(data: DocumentData): string {
  const bureau = (data.bureau || 'equifax').toLowerCase();
  const address = BUREAU_ADDRESSES[bureau] || BUREAU_ADDRESSES.equifax;

  return `SECTION 9.5 – ILLINOIS COLLECTION AGENCY ACT ENHANCED DISPUTE LETTER
${data.clientName}
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}
${data.clientPhone || ''}
${data.clientEmail || ''}

Date: ${data.today}

SENT VIA CERTIFIED MAIL: ${data.reportId || '7020 1810 0001 XXXX XXXX'}

To:
[DEBT COLLECTOR/CREDITOR NAME]
${data.clientAddress}
${data.clientCity}, ${data.clientState} ${data.clientZip}

Re: Violations of Illinois Collection Agency Act (225 ILCS 425) and Federal Law
Account: [ACCOUNT NUMBER (last 4 digits only)]
Consumer: ${data.clientName}

I. JURISDICTION AND APPLICABLE LAW
This letter is sent pursuant to:

Illinois Collection Agency Act – 225 ILCS 425/1 et seq.
Illinois Consumer Fraud and Deceptive Business Practices Act – 815 ILCS 505/1 et seq.
Fair Debt Collection Practices Act – 15 U.S.C. § 1692 et seq.
Fair Credit Reporting Act – 15 U.S.C. § 1681 et seq.
II. ALLEGED VIOLATIONS OF ILLINOIS COLLECTION AGENCY ACT
§ 225 ILCS 425/8 – PROHIBITED PRACTICES:

☐ Use of force, violence, or threat thereof (§ 8(1))
☐ Arrest threats (§ 8(2))
☐ Criminal prosecution threats (§ 8(3))
☐ Wage garnishment without judgment (§ 8(4))
☐ Property seizure threats without legal right (§ 8(5))
☐ Communication with employer (except for judgment enforcement) (§ 8(6))
☐ Disclosure to third parties (§ 8(7))
☐ Harassing/abusive language (§ 8(8))
☐ False/misleading representations (§ 8(9))
☐ Simulated legal process (§ 8(10))
☐ Inconvenient time/place contact (§ 8(11))
☐ Contact after written refusal (§ 8(12))
☐ Collect unauthorized amounts (§ 8(13))
☐ Postdated check solicitation (>5 days) (§ 8(14))
☐ Postcard communications (§ 8(15))
☐ Envelope markings indicating debt (§ 8(16))
☐ False urgency representations (§ 8(17))
☐ Continued collection during dispute (§ 8(18))

III. SPECIFIC VIOLATIONS IDENTIFIED
Violation 1: [DETAILED DESCRIPTION]
Date(s): [DATE(S)]
Statute Violated: 225 ILCS 425/8([subsection])
Evidence: Exhibit [LETTER]

Violation 2: [DETAILED DESCRIPTION]
Date(s): [DATE(S)]
Statute Violated: 225 ILCS 425/8([subsection])
Evidence: Exhibit [LETTER]

[Continue for all violations]

IV. ILLINOIS STATUTE OF LIMITATIONS
Illinois Debt Collection SOL (735 ILCS 5/13-205, 5/13-206):

Written contracts: 10 years
Oral contracts: 5 years
Open accounts (credit cards): 5 years
Promissory notes: 6 years (domestic), 10 years (UCC Article 3)
This debt: [TYPE] with SOL of [X] years
DOFD/Last Payment: ${data.today}
SOL Expiration: ${data.today}
Status: ☐ Within SOL ☐ TIME-BARRED (collection unlawful)

V. LICENSING REQUIREMENTS (225 ILCS 425/3)
All collection agencies operating in Illinois must be licensed by the Illinois Department of Financial and Professional Regulation (IDFPR).

Your License Status: ☐ Unknown ☐ Verified ☐ UNLICENSED (violation of § 425/3)

If unlicensed: All collection activity is VOID and constitutes a Class A misdemeanor (§ 425/14).

VI. HARM SUFFERED
A. Financial Harm:

Credit denial: $$1,000.00
Higher interest rates: $$1,000.00 over [TIME PERIOD]
Lost employment opportunity: $$1,000.00
Security deposits required: $$1,000.00
Increased insurance premiums: $$1,000.00
Out-of-pocket expenses (postage, copies, legal research): $$1,000.00
Subtotal Financial Harm: $[TOTAL]

B. Credit Score Impact:

Score before violations: [SCORE]
Score after violations: [SCORE]
Drop: [POINTS] points
Tier change: [FROM] → [TO]
C. Emotional Distress:

Anxiety and stress
Sleep disturbance
Embarrassment and humiliation
Family relationship strain
[Other specific impacts]
D. Time Investment:

Hours spent: ${data.accountNumber || 'XXXX-XXXX-XXXX'} hours at $[RATE]/hour = $$1,000.00
TOTAL ACTUAL DAMAGES: $[TOTAL]

VII. DAMAGES CALCULATION – ILLINOIS LAW
225 ILCS 425/9 – CIVIL REMEDIES:

Statutory Damages: $500 - $2,000 PER VIOLATION
Actual Damages: Unlimited
Attorney Fees: Mandatory (reasonable attorney fees)
Court Costs: Recoverable
Punitive Damages: Available for willful/reckless conduct
815 ILCS 505/10a(a) – CONSUMER FRAUD ACT:

Actual Damages
Attorney Fees
Court Costs
COMBINED RECOVERY CALCULATION:

Violation Type	Count	Statutory Range	Calculation
ICAA § 8 violations	[X]	$500-$2,000 each	[X] × $1,000 avg = $$1,000.00
Actual damages	-	Unlimited	$$1,000.00
Attorney fees	-	Reasonable	$[ESTIMATE]
Costs	-	Actual	$$1,000.00
TOTAL ILLINOIS CLAIM			$[TOTAL]
FDCPA DAMAGES (15 U.S.C. § 1692k):

Statutory: Up to $1,000 (total, not per violation)
Actual: $$1,000.00
Attorney fees: Mandatory
FCRA DAMAGES (15 U.S.C. § 1681n/o):

Willful: $100-$1,000 per violation + punitive
Negligent: Actual damages
Attorney fees: Mandatory
MAXIMUM TOTAL RECOVERY POTENTIAL: $[GRAND TOTAL]

VIII. REQUIRED CORRECTIVE ACTIONS
You must take the following actions within 15 calendar days of receipt:

CEASE all collection activity on this account immediately
PROVIDE written confirmation that collection has ceased
DELETE all adverse credit reporting related to this account from Equifax, Experian, and TransUnion
PROVIDE proof of deletion (confirmation letters from all three bureaus)
PROVIDE complete debt validation including:
Original signed contract/agreement
Complete payment history from inception
Chain of title documentation (if debt purchased/assigned)
Calculation showing how current amount was determined
License verification (IDFPR number and status)
SETTLEMENT OFFER (if applicable): $$1,000.00 in full satisfaction, conditioned upon:
Immediate deletion of all credit reporting
Written agreement to never re-sell or re-report this debt
Dismissal with prejudice of any pending legal action
Mutual release of all claims
IX. LEGAL NOTICE
ILLINOIS STATE COURT CLAIM:

Pursuant to 225 ILCS 425/9, I am entitled to bring a civil action in the Circuit Court of [COUNTY], Illinois for:

Statutory damages: $500-$2,000 per violation
Actual damages
Reasonable attorney fees
Court costs
Injunctive relief
FEDERAL COURT CLAIM:

I may also file suit in U.S. District Court for the Northern/Central/Southern District of Illinois under:

FDCPA (15 U.S.C. § 1692k) – 1-year SOL from violation
FCRA (15 U.S.C. § 1681n/o) – 2-year SOL (negligent), 5-year SOL (willful)
CLASS ACTION POTENTIAL:

If your company has engaged in systematic violations affecting other Illinois consumers, I will explore class certification under Illinois Supreme Court Rule 23.

ILLINOIS STATUTE OF LIMITATIONS FOR FILING SUIT:

ICAA violations: 5 years (735 ILCS 5/13-205)
Consumer Fraud Act: 3 years (815 ILCS 505/10a(e))
X. REGULATORY AND CRIMINAL COMPLAINTS
Copies of this letter and supporting evidence will be filed with:

State Agencies:

Illinois Department of Financial and Professional Regulation (IDFPR)
Division of Professional Regulation
320 W. Washington Street, 3rd Floor
Springfield, IL 62786
Phone: (888) 473-4858
Website: www.idfpr.com

Illinois Attorney General's Consumer Fraud Bureau
100 W. Randolph Street, 12th Floor
Chicago, IL 60601
Phone: (800) 386-5438
Website: www.illinoisattorneygeneral.gov

Federal Agencies: 3. Consumer Financial Protection Bureau (CFPB)
4. Federal Trade Commission (FTC)

Criminal Referral:

Violations of 225 ILCS 425/14 constitute a Class A misdemeanor punishable by:

Up to 364 days in jail
Fines up to $2,500
I will refer this matter to the [COUNTY] State's Attorney's Office for criminal investigation if violations are not remedied.

XI. EVIDENCE ENCLOSED
The following exhibits are attached and incorporated by reference:

Exhibit A: Copy of this letter
Exhibit B: Collection letters/communications from your company
Exhibit C: Credit reports showing adverse reporting
Exhibit D: Timeline of collection activity
Exhibit E: Documentation of harm (denial letters, rate increase notices, etc.)
Exhibit F: Illinois Collection Agency Act (225 ILCS 425) – relevant sections
Exhibit G: IDFPR license verification results
Exhibit H: Debt validation requests and responses (or lack thereof)
Exhibit I: [Additional evidence]
XII. PRESERVATION OF EVIDENCE
You are hereby directed to preserve ALL documents, recordings, electronic communications, and other evidence related to:

This account and alleged debt
Your collection attempts and communications
Credit reporting decisions and transmissions
Internal policies and training materials
Similar complaints from other consumers
Failure to preserve evidence may result in spoliation sanctions.

XIII. RESPONSE DEADLINE
I require your written response within 15 calendar days of your receipt of this letter (postmarked by ${data.today}).

If I do not receive satisfactory resolution by that date, I will proceed with:

Filing formal complaints with IDFPR, Illinois AG, CFPB, and FTC
Filing a civil lawsuit in state or federal court
Requesting criminal investigation by the State's Attorney
Exploring class action certification
XIV. CERTIFICATION
I certify under penalty of perjury under the laws of the State of Illinois that the foregoing is true and correct to the best of my knowledge.

Signature: ___________________________
Printed Name: ${data.clientName}
Date: ${data.today}

CC (via certified mail):

Illinois Department of Financial and Professional Regulation
Illinois Attorney General – Consumer Fraud Bureau
Consumer Financial Protection Bureau
Federal Trade Commission
[Credit Reporting Agencies, if applicable]`;
}


// DOCUMENT TYPE REGISTRY
// ===============================================================
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
  'fed-complaint': {
    name: 'Federal Court Complaint (FCRA Lawsuit)',
    fn: generateFederalCourtComplaint,
    category: 'Court & Litigation filings',
    description: 'Detailed formal complaint for filing in US District Court under 15 U.S.C. § 1681',
  },
  'fed-affidavit': {
    name: "Plaintiff's Federal Affidavit of Facts",
    fn: generatePlaintiffAffidavitOfFacts,
    category: 'Court & Litigation filings',
    description: 'Plaintiff notarized affidavit detailing dispute history, denials, and emotional damages',
  },
  'state-complaint': {
    name: 'State Court / Small Claims Complaint',
    fn: generateStateCourtComplaint,
    category: 'Court & Litigation filings',
    description: 'Versatile state civil court statement of claim for FCRA/FDCPA violations',
  },
  'civil-coversheet': {
    name: 'Federal Court Civil Cover Sheet Statement',
    fn: generateCivilCoverSheetStatement,
    category: 'Court & Litigation filings',
    description: 'Form JS 44 explanatory backing statement describing jurisdiction, citizenship, and codes',
  },
  'motion-summary-judg': {
    name: "Plaintiff's Motion for Summary Judgment Outline",
    fn: generateMotionSummaryJudgmentOutline,
    category: 'Court & Litigation filings',
    description: "Plaintiff's Memorandum of Law moving for summary judgment on liability as a matter of law",
  },

  '609-unverifiable-dispute': {
    name: 'Section 609 Unverifiable Information Dispute',
    fn: generateSection609UnverifiableInformationDispute,
    category: 'Dispute Letters',
    description: 'FCRA § 609 dispute demanding reinvestigation or deletion under § 1681i',
  },
  '611-max-accuracy': {
    name: 'Section 611 Maximum Accuracy Demand',
    fn: generateSection611MaximumAccuracyDemand,
    category: 'Dispute Letters',
    description: 'Formal demand for compliance with § 1681e(b) procedures and Philbin v. TransUnion',
  },
  '623-direct-furnisher': {
    name: 'Section 623 Direct Furnisher Dispute',
    fn: generateSection623DirectFurnisherDispute,
    category: 'Dispute Letters',
    description: 'Direct dispute to the information furnisher under 15 U.S.C. § 1681s-2(a)(8)',
  },
  'obsolete-deletion': {
    name: 'Obsolete Information Deletion Demand',
    fn: generateObsoleteInformationDeletionDemand,
    category: 'Dispute Letters',
    description: 'Immediate deletion of obsolete accounts past the 7-year reporting limit under § 1681c',
  },
  'unauthorized-inquiry': {
    name: 'Unauthorized Inquiry Removal Letter',
    fn: generateUnauthorizedInquiryRemovalLetter,
    category: 'Dispute Letters',
    description: 'Demand removal of hard inquiries without permissible purpose under § 1681b',
  },
  'post-bankruptcy-discharge': {
    name: 'Post-Bankruptcy Discharge Dispute',
    fn: generatePostBankruptcyDischargeDispute,
    category: 'Dispute Letters',
    description: 'Challenge reporting of discharged debts with balances under 11 U.S.C. § 524 and § 1681c',
  },
  'medical-debt-violation': {
    name: 'Medical Debt Violation Dispute (Legacy)',
    fn: generateMedicalDebtViolationDispute,
    category: 'Dispute Letters',
    description: 'Pre-2024 rules and veteran medical debt protections',
  },
  're-aging-violation': {
    name: 'Re-Aging Violation Dispute',
    fn: generateReAgingViolationDispute,
    category: 'Dispute Letters',
    description: 'Dispute illegal alteration of Date of First Delinquency (DOFD)',
  },
  'pre-litigation-settlement': {
    name: 'Pre-Litigation Settlement Demand',
    fn: generatePreLitigationSettlementDemandFcra,
    category: 'Court & Litigation filings',
    description: 'Massive pre-suit demand letter outlining specific violations and statutory/actual damages',
  },
  'intent-to-sue-fcra': {
    name: 'Intent to Sue Letter',
    fn: generateIntentToSueLetterFcra,
    category: 'Court & Litigation filings',
    description: 'Formal notice of intent to file a lawsuit in US District Court within 15 days unless cured',
  },
  'identity-theft-block': {
    name: 'Identity Theft Comprehensive Dispute',
    fn: generateIdentityTheftComprehensiveDispute,
    category: 'Dispute Letters',
    description: "Identity theft block under 15 U.S.C. § 1681c-2, 90-day alert, freeze, and victim's statement",
  },
  'mixed-file-correction': {
    name: 'Mixed File Correction Demand',
    fn: generateMixedFileCorrectionDemand,
    category: 'Dispute Letters',
    description: 'Challenge mixed file mergers under 15 U.S.C. § 1681e(b) with residence/employment proof',
  },
  'student-loan-violation': {
    name: 'Student Loan Reporting Violation Dispute',
    fn: generateStudentLoanReportingViolationDispute,
    category: 'Dispute Letters',
    description: 'Challenge student loan defaults and rehabilitations under 34 CFR § 685.209(f) and IDR plans',
  },
  'scra-violation': {
    name: 'SCRA Violation Dispute',
    fn: generateScraViolationDispute,
    category: 'Dispute Letters',
    description: 'Notice of SCRA interest cap (6%) violations under 50 U.S.C. § 3937 and void judgments',
  },
  'medical-debt-cfpb-2024': {
    name: 'Medical Debt Violation Dispute (CFPB 2024 Rules)',
    fn: generateMedicalDebtViolationDisputeCfpb2024,
    category: 'Dispute Letters',
    description: 'CFPB 2024 regulations (12 CFR § 1022.30(b)) prohibiting medical collection reporting',
  },
  'texas-finance-code-392': {
    name: 'Texas Finance Code Chapter 392 Enhanced Letter',
    fn: generateTexasFinanceCode392Enhanced,
    category: 'Dispute Letters',
    description: 'Texas Resident state law protections under Chapter 392 and DTPA treble damages',
  },
  'new-york-gbl-349': {
    name: 'New York GBL § 349 Enhanced Letter',
    fn: generateNewYorkGbl349Enhanced,
    category: 'Dispute Letters',
    description: 'New York Resident state law protections under GBL § 349 with mandatory treble damages',
  },
  'illinois-collection-agency-act': {
    name: 'Illinois Collection Agency Act Enhanced Letter',
    fn: generateIllinoisCollectionAgencyActEnhanced,
    category: 'Dispute Letters',
    description: 'Illinois Resident state law protections under ICAA (225 ILCS 425) with $500-$2,000 per violation',
  },
};

