/**
 * Data classification + minimization for integration payloads.
 */
export type { DataClass } from './integration-sync-rules';
export { INTEGRATION_ALLOWED_CLASSES, canSyncFieldToIntegration } from './integration-sync-rules';

export const DATA_CLASS_LABELS: Record<string, string> = {
  public: 'Public',
  internal: 'Internal',
  confidential: 'Confidential',
  pii: 'PII',
  sensitive_pii: 'Sensitive PII',
  credit_data: 'Credit Data',
  legal_compliance: 'Legal/Compliance',
  payment: 'Payment',
};

export const MINIMIZATION_RULES = [
  { rule: 'Never sync full credit reports to GHL or marketing CRMs', class: 'credit_data', blockedIntegrations: ['ghl', 'sendgrid', 'twilio'] },
  { rule: 'Never sync SSN/full DOB to external marketing platforms', class: 'sensitive_pii', blockedIntegrations: ['ghl', 'webhook'] },
  { rule: 'Litigation review stays in Smart FCRA only', class: 'legal_compliance', blockedIntegrations: ['ghl'] },
  { rule: 'Marketing opt-out propagates to all marketing channels', class: 'legal_compliance', propagate: ['ghl', 'twilio', 'sendgrid'] },
];

export function classifyClientField(field: string): string {
  const map: Record<string, string> = {
    email: 'pii', phone: 'pii', first_name: 'pii', last_name: 'pii',
    ssn_enc: 'sensitive_pii', date_of_birth_enc: 'sensitive_pii',
    parsed_report: 'credit_data', violations: 'credit_data',
    marketing_email_consent: 'legal_compliance',
  };
  return map[field] || 'internal';
}

export function minimizationPayload(): Record<string, unknown> {
  return {
    version: '1.0',
    classes: DATA_CLASS_LABELS,
    rules: MINIMIZATION_RULES,
  };
}
