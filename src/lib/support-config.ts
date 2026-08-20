/**
 * Platform support routing — all user-facing support flows to Smart FCRA ops.
 */
export const PLATFORM_SUPPORT_EMAIL = 'support@smartfcra.com';
export const PLATFORM_ESCALATION_EMAIL = 'rickyjefferson1006@gmail.com';

export function resolveSupportEmail(env?: { SUPPORT_EMAIL?: string; COMPANY_EMAIL?: string }): string {
  return env?.SUPPORT_EMAIL || env?.COMPANY_EMAIL || PLATFORM_SUPPORT_EMAIL;
}

export function resolveEscalationEmail(env?: { ESCALATION_EMAIL?: string; PRIMARY_OWNER_CONTACT?: string }): string {
  return env?.ESCALATION_EMAIL || env?.PRIMARY_OWNER_CONTACT || PLATFORM_ESCALATION_EMAIL;
}

/** Keywords that auto-escalate to platform owner in support intake worker. */
export const SUPPORT_ESCALATION_KEYWORDS = [
  'legal threat',
  'lawsuit',
  'attorney general',
  'cfpb complaint',
  'data breach',
  'security incident',
  'urgent',
  'emergency',
  'refund now',
  'chargeback',
  'attorney',
  'subpoena',
];

export function shouldEscalateSupport(text: string): boolean {
  const q = String(text || '').toLowerCase();
  return SUPPORT_ESCALATION_KEYWORDS.some((k) => q.includes(k));
}
