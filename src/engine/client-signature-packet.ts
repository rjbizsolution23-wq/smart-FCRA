/**
 * CRO Compliance OS — full federal client signature packet + workflow gates.
 * Statutory CROA disclosure text is locked; counsel must approve state riders.
 */

export type PacketDocStatus = 'signed' | 'delivered' | 'required' | 'not_required' | 'n/a';

export type PacketDocumentDef = {
  id: string;
  label: string;
  category: 'federal' | 'state' | 'authorization' | 'consent' | 'billing' | 'internal' | 'privacy';
  requiredBefore: Array<'contract' | 'service' | 'dispute' | 'identity_theft' | 'billing' | 'payment'>;
  lockedStatutory?: boolean;
  contractType?: string;
  description: string;
};

/** Verbatim federal disclosure — do not paraphrase in product UI. Counsel verifies current edition. */
export const CROA_STATUTORY_DISCLOSURE_1679c = `Consumer Credit File Rights Under State and Federal Law

You have a right to dispute inaccurate information in your credit report by contacting the credit bureau directly. However, neither you nor any credit repair company or credit repair organization has the right to have accurate, current, and verifiable information removed from your credit report. The credit bureau must remove accurate, negative information from your credit report only if it is over 7 years old. Bankruptcy information can be reported for 10 years.

You have a right to obtain a copy of your credit report from a credit bureau. You may be charged a reasonable fee. There is no fee, however, if you have been turned down for credit, employment, insurance, or a rental dwelling because of information in your credit report within the preceding 60 days. The credit bureau must provide someone to help you interpret the information in your credit file. You are entitled to receive a free copy of your credit report if you are unemployed and intend to apply for employment in the next 60 days, if you are on public welfare assistance, or if you have reason to believe that there is inaccurate information in your credit report due to fraud.

You have a right to sue a credit repair organization that violates the Credit Repair Organizations Act. This law prohibits deceptive practices by credit repair organizations.

You have the right to cancel your contract with any credit repair organization for any reason within 3 business days from the date you signed it.

Credit bureaus are required to follow reasonable procedures to ensure that the information they report is accurate. However, mistakes may occur.

You may, on your own, notify a credit bureau in writing that you dispute the accuracy of information in your credit report. This must be done directly with the credit bureau, not through any third party, and the credit bureau must then investigate unless your dispute is frivolous. See www.consumerfinance.gov/learnmore for an explanation of dispute procedures.

Credit repair organizations may not charge you until they have fully performed the services they promised you.

Credit repair organizations may not perform any services until they have your written authorization and have completed a three-day waiting period. During this waiting period, you may cancel the contract without paying any fees.

Credit repair organizations must give you a copy of the "Consumer Credit File Rights Under State and Federal Law" before you sign a contract.

Credit repair organizations must give you a written contract, and the contract must include certain information required by law.

You should read the contract carefully before signing it.

Source: 15 U.S.C. § 1679c (Consumer Credit File Rights disclosure).`;

export const CLIENT_SIGNATURE_PACKET: PacketDocumentDef[] = [
  { id: 'croa_disclosure', label: 'Federal CROA Consumer Credit File Rights Disclosure', category: 'federal', requiredBefore: ['contract'], lockedStatutory: true, description: 'Delivered before service contract; retain acknowledgment 2+ years.' },
  { id: 'croa_contract', label: 'Credit Repair Services Agreement (CROA contract)', category: 'federal', requiredBefore: ['service', 'billing'], contractType: 'croa_service', description: 'Exact services, price, payment terms, performance period, cancellation statement near signature.' },
  { id: 'federal_cancellation', label: 'Federal Notice of Cancellation', category: 'federal', requiredBefore: ['service'], description: 'Detachable/electronic cancellation form — third business day federal right.' },
  { id: 'state_rider', label: 'State Disclosure / Rider / Cancellation Form', category: 'state', requiredBefore: ['service'], description: 'Generated from consumer residence state — not one-size-fits-all.' },
  { id: 'limited_poa', label: 'Limited Authorization / Limited Power of Attorney', category: 'authorization', requiredBefore: ['service', 'dispute'], contractType: 'limited_poa', description: 'Narrow credit-admin scope only — not general financial POA.' },
  { id: 'report_authorization', label: 'Consumer Report Authorization', category: 'authorization', requiredBefore: ['service'], description: 'Separate FCRA-permissible-purpose authorization for obtaining/reviewing reports.' },
  { id: 'dispute_attestation', label: 'Consumer Dispute Factual-Basis Attestation', category: 'authorization', requiredBefore: ['dispute'], description: 'Consumer — not staff/AI — attests what is inaccurate and why, per dispute.' },
  { id: 'identity_theft_attestation', label: 'Identity Theft Consumer Attestation', category: 'authorization', requiredBefore: ['identity_theft'], description: 'Required only when consumer alleges identity theft — separate from normal disputes.' },
  { id: 'electronic_comms_consent', label: 'Electronic Communications Consent', category: 'consent', requiredBefore: ['service'], contractType: 'esign_consent', description: 'Email/SMS/portal delivery consent where applicable.' },
  { id: 'marketing_telephone_consent', label: 'Marketing / Telephone Consent', category: 'consent', requiredBefore: [], description: 'Separate from service agreement — not buried in unrelated acceptance.' },
  { id: 'payment_authorization', label: 'Payment Method Authorization (Reg E)', category: 'billing', requiredBefore: ['payment'], description: 'Separate signed/authenticated authorization for preauthorized EFTs.' },
  { id: 'service_completion', label: 'Service Completion Acknowledgment', category: 'internal', requiredBefore: ['billing'], description: 'Internal + consumer acknowledgment where appropriate — CROA billing eligibility.' },
  { id: 'cancellation_form', label: 'Cancellation / Termination Request Form', category: 'federal', requiredBefore: [], description: 'Consumer can cancel without hunting for a salesperson.' },
  { id: 'privacy_notice', label: 'Privacy Notice / Data Authorization', category: 'privacy', requiredBefore: ['service'], description: 'Data collected, vendors, retention, privacy rights.' },
  { id: 'dispute_auth_history', label: 'Complaint / Dispute Authorization History', category: 'internal', requiredBefore: [], description: 'Evidence record of what the consumer authorized.' },
];

export const WORKFLOW_GATE_RULES: Record<string, { missing: string[]; message: string }> = {
  contract: { missing: ['croa_disclosure'], message: 'NO CROA DISCLOSURE → CONTRACT BLOCKED' },
  service: { missing: ['croa_disclosure', 'croa_contract'], message: 'NO CONTRACT → SERVICE BLOCKED' },
  dispute: { missing: ['dispute_attestation'], message: 'NO CONSUMER DISPUTE ATTESTATION → DISPUTE BLOCKED' },
  identity_theft: { missing: ['identity_theft_attestation'], message: 'NO IDENTITY-THEFT ATTESTATION → IDENTITY-THEFT SUBMISSION BLOCKED' },
  payment: { missing: ['payment_authorization'], message: 'NO BILLING AUTHORIZATION → PAYMENT BLOCKED' },
};

export type ClientPacketStatus = Record<string, PacketDocStatus>;

export function defaultPacketStatus(): ClientPacketStatus {
  const s: ClientPacketStatus = {};
  for (const d of CLIENT_SIGNATURE_PACKET) {
    if (d.id === 'identity_theft_attestation' || d.id === 'payment_authorization') s[d.id] = 'not_required';
    else if (d.id === 'dispute_auth_history' || d.id === 'service_completion') s[d.id] = 'n/a';
    else s[d.id] = 'required';
  }
  return s;
}

export function evaluateWorkflowGate(action: keyof typeof WORKFLOW_GATE_RULES, status: ClientPacketStatus): {
  blocked: boolean;
  missing: string[];
  message: string;
} {
  const rule = WORKFLOW_GATE_RULES[action];
  if (!rule) return { blocked: false, missing: [], message: '' };
  const missing = rule.missing.filter((id) => {
    const st = status[id];
    return st !== 'signed' && st !== 'delivered';
  });
  return { blocked: missing.length > 0, missing, message: missing.length ? rule.message : '' };
}

export function buildSignatureChecklist(status: ClientPacketStatus) {
  return CLIENT_SIGNATURE_PACKET.map((doc) => ({
    ...doc,
    status: status[doc.id] || 'required',
    displayStatus: formatStatus(status[doc.id] || 'required'),
  }));
}

function formatStatus(st: PacketDocStatus): string {
  switch (st) {
    case 'signed': return 'SIGNED';
    case 'delivered': return 'DELIVERED';
    case 'not_required': return 'NOT YET REQUIRED';
    case 'n/a': return 'N/A';
    default: return 'REQUIRED';
  }
}

export const LIMITED_POA_TEMPLATE_BODY = `LIMITED CREDIT SERVICES AUTHORIZATION AND LIMITED POWER OF ATTORNEY

I, {{client_name}}, residing at {{client_address}}, appoint {{org_name}}, solely for the limited purposes described below.

I authorize the Company, subject to applicable federal and state law, to assist me with administrative matters concerning information appearing in my consumer credit files, including reviewing consumer reports I lawfully obtain or authorize; organizing information I identify as inaccurate, incomplete, duplicated, unauthorized, or disputed; preparing correspondence based solely on facts and instructions I provide; transmitting correspondence when I specifically authorize; receiving and organizing responses where permitted; and communicating with me regarding authorized matters.

This authorization does NOT permit the Company to: borrow money in my name; open or close financial accounts; sign loan applications; endorse checks; withdraw or transfer money; settle debts without separate authority; admit liability; initiate or settle litigation; sign affidavits containing facts I have not approved; impersonate me; obtain reports for impermissible purposes; or dispute information I have stated is accurate merely because it is unfavorable.

I retain the right to communicate directly with consumer reporting agencies, furnishers, creditors, collectors, regulators, and other parties.

This authorization begins on {{effective_date}} and ends upon my written revocation, termination of my services agreement, {{max_duration}}, or as required by law.

Consumer: ______________________  Date: ______________________
Company representative: ______________________  Date: ______________________`;

export const DISPUTE_FACTUAL_BASIS_TEMPLATE = `CONSUMER CREDIT DISPUTE FACTUAL-BASIS ATTESTATION

Consumer: {{client_name}}
Bureau/report: __________
Account/item: __________

I believe the following information is inaccurate or incomplete (check all that apply):
[ ] Account is not mine  [ ] Balance incorrect  [ ] Status incorrect  [ ] Payment history incorrect
[ ] Date incorrect  [ ] Duplicate  [ ] Paid but not updated  [ ] Unauthorized  [ ] Personal info error  [ ] Other

What specifically is wrong?
_________________________________________________________________

What should the correct information be?
_________________________________________________________________

I certify these statements are based on my own knowledge and are true to the best of my knowledge.

Signature: ______________________  Date: ______________________`;
