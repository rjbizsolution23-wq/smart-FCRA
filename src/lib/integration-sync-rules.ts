/**
 * System of record + sync direction rules per field/integration.
 */
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional' | 'read_only' | 'no_sync';

export type DataClass =
  | 'public' | 'internal' | 'confidential' | 'pii' | 'sensitive_pii'
  | 'credit_data' | 'legal_compliance' | 'payment';

export const SYSTEM_OF_RECORD: Record<string, { owner: string; class: DataClass }> = {
  'case.findings': { owner: 'smart_fcra', class: 'credit_data' },
  'case.evidence': { owner: 'smart_fcra', class: 'credit_data' },
  'report.analysis': { owner: 'smart_fcra', class: 'credit_data' },
  'lead.source': { owner: 'origin', class: 'internal' },
  'marketing.consent': { owner: 'smart_fcra', class: 'legal_compliance' },
  'mfsn.monitoring_status': { owner: 'mfsn', class: 'credit_data' },
  'payment.transaction': { owner: 'processor', class: 'payment' },
  'contract.signed': { owner: 'esign', class: 'legal_compliance' },
  'mail.tracking': { owner: 'mailing_provider', class: 'internal' },
  'call.recording': { owner: 'telephony', class: 'legal_compliance' },
  'contact.name': { owner: 'bidirectional', class: 'pii' },
  'contact.email': { owner: 'bidirectional', class: 'pii' },
  'contact.phone': { owner: 'bidirectional', class: 'pii' },
  'lifecycle.stage': { owner: 'smart_fcra', class: 'internal' },
  'litigation.review': { owner: 'smart_fcra', class: 'legal_compliance' },
};

export const GHL_FIELD_SYNC_RULES: Record<string, { direction: SyncDirection; maxClass: DataClass; field: string }> = {
  firstName: { direction: 'bidirectional', maxClass: 'pii', field: 'contact.name' },
  lastName: { direction: 'bidirectional', maxClass: 'pii', field: 'contact.name' },
  email: { direction: 'bidirectional', maxClass: 'pii', field: 'contact.email' },
  phone: { direction: 'bidirectional', maxClass: 'pii', field: 'contact.phone' },
  tags: { direction: 'bidirectional', maxClass: 'internal', field: 'lifecycle.stage' },
  lifecycleStage: { direction: 'outbound', maxClass: 'internal', field: 'lifecycle.stage' },
  smartFcraCaseStatus: { direction: 'outbound', maxClass: 'internal', field: 'lifecycle.stage' },
  violationCount: { direction: 'outbound', maxClass: 'internal', field: 'case.findings' },
  ssn: { direction: 'no_sync', maxClass: 'sensitive_pii', field: 'ssn' },
  fullCreditReport: { direction: 'no_sync', maxClass: 'credit_data', field: 'report.analysis' },
  disputeEvidence: { direction: 'no_sync', maxClass: 'credit_data', field: 'case.evidence' },
  damagesModel: { direction: 'no_sync', maxClass: 'legal_compliance', field: 'litigation.review' },
};

export const INTEGRATION_ALLOWED_CLASSES: Record<string, DataClass[]> = {
  ghl: ['public', 'internal', 'pii'],
  mfsn: ['credit_data', 'pii', 'internal'],
  twilio: ['pii', 'internal'],
  sendgrid: ['pii', 'internal'],
  click2mail: ['pii', 'internal', 'legal_compliance'],
  stripe: ['payment', 'pii'],
  webhook: ['internal', 'pii'],
};

export function canSyncFieldToIntegration(
  integration: string,
  fieldKey: string,
  dataClass: DataClass,
): { allowed: boolean; direction: SyncDirection; reason?: string } {
  const rule = GHL_FIELD_SYNC_RULES[fieldKey];
  if (!rule) return { allowed: false, direction: 'no_sync', reason: 'Unknown field' };
  if (rule.direction === 'no_sync') return { allowed: false, direction: 'no_sync', reason: 'Field blocked by policy' };
  const allowed = INTEGRATION_ALLOWED_CLASSES[integration] || [];
  const classOrder: DataClass[] = ['public', 'internal', 'confidential', 'pii', 'sensitive_pii', 'credit_data', 'legal_compliance', 'payment'];
  const maxIdx = classOrder.indexOf(rule.maxClass);
  const dataIdx = classOrder.indexOf(dataClass);
  if (dataIdx > maxIdx) return { allowed: false, direction: rule.direction, reason: `Class ${dataClass} exceeds max ${rule.maxClass}` };
  if (!allowed.includes(dataClass) && dataClass !== 'internal') {
    return { allowed: false, direction: rule.direction, reason: `Integration ${integration} cannot receive ${dataClass}` };
  }
  return { allowed: true, direction: rule.direction };
}

export function filterOutboundPayloadForIntegration(
  integration: string,
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(payload)) {
    const rule = GHL_FIELD_SYNC_RULES[key];
    if (!rule) continue;
    const check = canSyncFieldToIntegration(integration, key, rule.maxClass);
    if (check.allowed && check.direction !== 'inbound') out[key] = val;
  }
  return out;
}
