/**
 * Versioned legal contract templates — CROA, Limited POA, ESIGN/UETA consent.
 * Content is deterministic. Version hashes gate “what the client actually signed.”
 */
export type ContractType = 'croa_service' | 'limited_poa' | 'esign_consent' | 'representation_auth';

export type ContractParty = {
  clientName: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  clientEmail?: string;
  clientPhone?: string;
  orgName: string;
  orgAddress?: string;
  orgEmail?: string;
  planName?: string;
  monthlyFee?: string;
  effectiveDate?: string;
};

export const ESIGN_DISCLOSURE_VERSION = 'esign-ueta-v1.0-2026-07';
export const CROA_TEMPLATE_VERSION = 'croa-service-v1.1-2026-08';
export const LPOA_TEMPLATE_VERSION = 'lpoa-limited-v1.0-2026-07';
export const REP_AUTH_TEMPLATE_VERSION = 'rep-auth-v1.0-2026-07';

export const ESIGN_DISCLOSURE_TEXT = `ELECTRONIC SIGNATURES AND RECORDS DISCLOSURE (E-SIGN Act / UETA)

By checking “I Agree” and applying your electronic signature, you consent to conduct this transaction electronically under the federal Electronic Signatures in Global and National Commerce Act (15 U.S.C. § 7001 et seq.) and the Uniform Electronic Transactions Act (UETA) as adopted in your governing state.

You acknowledge that:
1. You can access and retain electronic records (PDF/download in your portal vault).
2. You may request a paper copy; fees, if any, will be disclosed before charging.
3. You may withdraw consent to electronic dealings by written notice, which may delay services that require electronic execution.
4. Your electronic signature is intended to have the same legal effect as a handwritten (“wet”) signature.
5. Hardware/software requirements: modern browser with TLS, ability to view PDF or plain text, and internet access.
6. You are signing freely, without duress, and have had an opportunity to read the full agreement.

This disclosure version: ${ESIGN_DISCLOSURE_VERSION}.`;

function addr(p: ContractParty): string {
  const line = [p.clientAddress, [p.clientCity, p.clientState, p.clientZip].filter(Boolean).join(', ')].filter(Boolean).join('\n');
  return line || 'Address on file';
}

export function renderEsignConsent(p: ContractParty): string {
  return `${ESIGN_DISCLOSURE_TEXT}

Principal: ${p.clientName}
Email: ${p.clientEmail || 'on file'}
Governing state: ${p.clientState || 'as provided'}
Company: ${p.orgName}
Date: ${p.effectiveDate || new Date().toISOString().slice(0, 10)}
`;
}

export function renderCroaServiceAgreement(p: ContractParty): string {
  const fee = p.monthlyFee || 'as stated in the selected plan';
  const plan = p.planName || 'Professional Credit Restoration / Dispute Services';
  const state = (p.clientState || 'NM').toUpperCase();
  return `CREDIT REPAIR ORGANIZATIONS ACT (CROA) SERVICE AGREEMENT
15 U.S.C. § 1679 et seq. — Consumer Contract

Template: ${CROA_TEMPLATE_VERSION}
Governing Law: State of ${state} (and applicable federal law)

This Agreement is entered into as of ${p.effectiveDate || new Date().toISOString().slice(0, 10)} by and between:

SERVICE PROVIDER (“Company”):
${p.orgName}
${p.orgAddress || ''}
${p.orgEmail || ''}

CONSUMER (“You” / “Client”):
${p.clientName}
${addr(p)}
Email: ${p.clientEmail || 'on file'} | Phone: ${p.clientPhone || 'on file'}

═══════════════════════════════════════════════════════════════════
1. SERVICES
Company will provide credit education, credit-report analysis, accuracy dispute preparation assistance, document generation support, and related portal tools under plan: ${plan}.
Company is NOT a law firm unless separately disclosed in writing. Litigation advice, if any, is provided only by licensed counsel engaged under a separate retainer.

2. FEES (CROA § 1679b / § 1679c)
Monthly / program fee: ${fee}.
IMPORTANT — ADVANCE FEE RESTRICTIONS: Under the Telemarketing Sales Rule (16 C.F.R. § 310.4(a)(2)) and CROA, Company does not charge or collect fees for credit repair services before those services are fully performed, except as expressly permitted by law. Any subscription for software/portal access is disclosed separately from credit-repair performance fees.

2A. VOLUNTARY SIX-MONTH BILLING HOLD (Company Policy — Stricter Than Law Requires)
In addition to, and independent of, the statutory advance-fee restrictions above, Company will NOT invoice, charge, or collect any fee for covered credit-repair services until at least six (6) months (180 days) have elapsed after the specific service is recorded in Company's system as fully performed and completed. This billing hold applies per-service (each dispute round, analysis, or deliverable has its own completion date and its own six-month hold) and is enforced automatically by Company's billing system — not merely a manual promise. This provision may be more protective of You than CROA/TSR require and does not reduce or waive any right You have under CROA, TSR, or applicable state law; it only adds an additional delay before any billing event may occur. This section survives even if a portion of Section 2's statutory advance-fee language is judicially narrowed or superseded.

3. CONSUMER RIGHTS NOTICE (CROA § 1679c — REQUIRED)
You have a right to dispute inaccurate information in your credit report by contacting the consumer reporting agency directly. You do not need a credit repair company to do this. You may cancel this contract without penalty anytime before midnight of the third business day after signing. See cancellation form below.

4. CANCELLATION (CROA § 1679e)
To cancel, deliver written notice to Company by mail, portal message, or email before midnight of the third business day after you sign. A model cancellation notice is attached as Exhibit A.

5. DISCLOSURES & ACCURACY
You represent information you provide is true. Company will not counsel you to make untrue statements to CRAs, creditors, or courts.

6. RESULTS NOT GUARANTEED
Credit scores and outcomes depend on third-party CRA/furnisher decisions. Company does not guarantee score increases, loan approval, or deletion of accurate negative information.

7. PRIVACY & DATA SECURITY
Company protects your data with encryption, access controls, audit logging, and zero-trust portal isolation as described in the Trust Center. You authorize Company to obtain consumer reports for a permissible purpose under FCRA § 1681b in connection with this engagement.

8. LIMITED POWER / AUTHORIZATION
Where you execute a separate Limited Power of Attorney or Representation Authorization, Company (or retained counsel) may communicate with CRAs/furnishers as specified therein. That instrument controls over this section if conflict arises.

9. GOVERNING LAW; VENUE
This Agreement is governed by the laws of ${state} and federal law (CROA, FCRA, TSR, E-SIGN). Exclusive venue for disputes arising from this Agreement (except where prohibited) lies in courts competent in ${state}, unless parties agree in writing to arbitration under the Federal Arbitration Act.

10. ENTIRE AGREEMENT; SEVERABILITY
This writing (plus exhibits and separately signed LPOA/ESIGN consents) is the entire agreement for these services. If any clause is unenforceable, the remainder stays in force. Amendments must be in a signed writing (electronic signatures permitted).

11. ELECTRONIC SIGNATURES
You agree this Agreement may be signed electronically under E-SIGN/UETA. The portal will record disclosure version, content hash, IP, timestamp, and signature artifact.

═══════════════════════════════════════════════════════════════════
EXHIBIT A — NOTICE OF CANCELLATION (CROA)

You may cancel this contract, without any penalty or obligation, within three (3) business days from the date the contract is signed.

If you cancel, any payment made by you under this contract will be returned within ten (10) days of receipt of your cancellation notice.

To cancel, mail/deliver a signed dated copy of this cancellation notice (or equivalent written notice) to:
${p.orgName}
${p.orgAddress || '[Company address]'}
${p.orgEmail || '[Company email]'}

I HEREBY CANCEL THIS TRANSACTION.

_______________________________     Date: _______________
Consumer Signature

═══════════════════════════════════════════════════════════════════
SIGNATURE BLOCK

I have read this CROA Service Agreement, the Consumer Rights Notice, and the Cancellation Notice. I understand my rights.

Consumer: _______________________________     Date: _______________
Printed name: ${p.clientName}

Company authorized signer: _______________________________     Date: _______________
${p.orgName}
`;
}

export function renderLimitedPoa(p: ContractParty): string {
  const state = (p.clientState || 'NM').toUpperCase();
  return `LIMITED POWER OF ATTORNEY — CREDIT DISPUTE / CONSUMER REPORT MATTERS
Template: ${LPOA_TEMPLATE_VERSION}
Governing Law: ${state}

I, ${p.clientName} (“Principal”), residing at:
${addr(p)}

hereby appoint ${p.orgName} (“Agent”), and its designated employees and retained licensed counsel (if any), as my true and lawful attorney-in-fact for the LIMITED purposes below.

1. POWERS GRANTED (LIMITED)
Agent may, on my behalf and only regarding my consumer reports and related disputes:
(a) Obtain consumer reports and file disclosures for a permissible purpose under 15 U.S.C. § 1681b;
(b) Prepare and transmit disputes under 15 U.S.C. § 1681i and furnisher disputes under § 1681s-2;
(c) Communicate with Equifax, Experian, TransUnion, and furnishers regarding accuracy/completeness;
(d) Receive responses, investigation results, and updated reports;
(e) Execute dispute forms, CFPB complaints, and related administrative filings that do not commence litigation unless separately authorized in writing by Principal.

2. POWERS NOT GRANTED
Agent may NOT: sell my property; open credit in my name; settle lawsuits without written approval; waive my rights under CROA; or act beyond this limited scope.

3. DURATION
This LPOA is effective on the date of electronic signature (and notarization if required by Agent or applicable law) and continues until revoked in writing, case closure, or 24 months, whichever occurs first.

4. RATIFICATION; THIRD PARTIES
I ratify acts Agent takes in good faith within this scope. Third parties may rely on a portal-issued copy bearing content hash and (if applicable) notarial certificate.

5. REVOCATION
I may revoke by written notice through the portal or certified mail to Agent. Revocation is effective upon receipt.

6. NOTARIZATION
Where state law or a third party requires notarization of this LPOA, Principal agrees to complete Remote Online Notarization (RON) through Company’s approved RON workflow. Until notarized (when required), this instrument may still evidence intent for portal services but may not be accepted by all third parties.

7. ELECTRONIC EXECUTION
Signed under E-SIGN/UETA. Content hash and audit trail are part of the record.

Principal Signature: _______________________________     Date: _______________
Printed Name: ${p.clientName}
State of residence: ${state}
`;
}

export function renderRepresentationAuth(p: ContractParty): string {
  const state = (p.clientState || 'NM').toUpperCase();
  return `REPRESENTATION / AUTHORIZATION TO COMMUNICATE
Template: ${REP_AUTH_TEMPLATE_VERSION}
Governing Law: ${state}

I, ${p.clientName}, authorize ${p.orgName} and its agents to communicate with consumer reporting agencies, furnishers, collectors, and regulators regarding my consumer file for dispute and accuracy purposes.

This authorization is not a general power of attorney. It does not authorize litigation filing unless I separately retain counsel.

I may revoke this authorization in writing at any time.

Signed electronically under E-SIGN/UETA.
Principal: ${p.clientName}
Date: ${p.effectiveDate || new Date().toISOString().slice(0, 10)}
`;
}

export function renderContract(type: ContractType, party: ContractParty): { content: string; templateVersion: string; requiresNotarization: boolean } {
  switch (type) {
    case 'croa_service':
      return { content: renderCroaServiceAgreement(party), templateVersion: CROA_TEMPLATE_VERSION, requiresNotarization: false };
    case 'limited_poa':
      return { content: renderLimitedPoa(party), templateVersion: LPOA_TEMPLATE_VERSION, requiresNotarization: true };
    case 'esign_consent':
      return { content: renderEsignConsent(party), templateVersion: ESIGN_DISCLOSURE_VERSION, requiresNotarization: false };
    case 'representation_auth':
      return { content: renderRepresentationAuth(party), templateVersion: REP_AUTH_TEMPLATE_VERSION, requiresNotarization: false };
    default:
      throw new Error(`Unknown contract type: ${type}`);
  }
}

export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Documents that typically need notarization before third-party reliance */
export function documentRequiresNotarization(docType: string): boolean {
  const t = String(docType || '').toLowerCase();
  return (
    t.includes('poa') ||
    t.includes('power-of-attorney') ||
    t.includes('affidavit') ||
    t === 'limited_poa' ||
    t === 'fed-affidavit'
  );
}
