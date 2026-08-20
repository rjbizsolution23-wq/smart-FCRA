/**
 * Pre-built branded email + SMS library for Compliance OS workflows and campaigns.
 */
export type CommsStarterChannel = 'email' | 'sms' | 'both';

export type CommsStarterTemplate = {
  id: string;
  name: string;
  channel: CommsStarterChannel;
  lane: 'transactional' | 'marketing' | 'compliance' | 'consumer_rights';
  category: 'onboarding' | 'dispute' | 'compliance' | 'billing' | 'engagement' | 'support';
  subject?: string;
  emailBody: string;
  smsBody: string;
  workflowKey?: string;
  description: string;
};

export const COMMS_STARTER_LIBRARY: CommsStarterTemplate[] = [
  {
    id: 'welcome-portal',
    name: 'Portal welcome',
    channel: 'both',
    lane: 'transactional',
    category: 'onboarding',
    subject: 'Welcome to your {{brandName}} client portal',
    emailBody: 'Hi {{clientName}},\n\nYour secure portal with {{brandName}} is ready. Sign in to review your credit file progress, confirm facts before disputes, and message your advisor.\n\nPortal: {{portalUrl}}\n\nWe are here to help you every step of the way.',
    smsBody: 'Hi {{clientName}} — your {{brandName}} portal is ready. Sign in: {{portalUrl}}',
    workflowKey: 'onboarding_welcome',
    description: 'First login / portal invite after intake',
  },
  {
    id: 'attestation-reminder',
    name: 'Confirm facts reminder',
    channel: 'both',
    lane: 'compliance',
    category: 'dispute',
    subject: 'Action needed: confirm facts on your credit file',
    emailBody: 'Hi {{clientName}},\n\nBefore we prepare dispute correspondence, please open Confirm Facts in your portal and verify the accounts you want challenged. Disputes start only after you approve the factual basis.\n\n{{portalUrl}}',
    smsBody: '{{brandName}}: Please confirm facts in your portal before we prepare disputes. {{portalUrl}}',
    workflowKey: 'attestation_nudge',
    description: 'Nudge consumer to complete factual-basis attestation',
  },
  {
    id: 'dispute-mailed',
    name: 'Dispute mailed confirmation',
    channel: 'both',
    lane: 'transactional',
    category: 'dispute',
    subject: 'Your dispute correspondence was mailed',
    emailBody: 'Hi {{clientName}},\n\nWe mailed your dispute package on {{mailDate}} via {{mailClass}}. Tracking: {{trackingNumber}}.\n\nWe will update your portal when the bureau responds. This is not a guarantee of deletion or score change.',
    smsBody: '{{brandName}}: Dispute mailed {{mailDate}}. Track: {{trackingNumber}}',
    workflowKey: 'dispute_mailed',
    description: 'After Click2Mail / certified send',
  },
  {
    id: 'bureau-response',
    name: 'Bureau response recorded',
    channel: 'email',
    lane: 'transactional',
    category: 'dispute',
    subject: 'Update on your credit dispute',
    emailBody: 'Hi {{clientName}},\n\nWe recorded a response from {{bureauName}} regarding your dispute. Open your portal to review next steps — we will explain what changed and what happens next.',
    smsBody: '{{brandName}}: Bureau response recorded. Check your portal for next steps.',
    workflowKey: 'bureau_response',
    description: 'When bureau reply is logged on the file',
  },
  {
    id: 'contract-ready',
    name: 'Contract pack ready to sign',
    channel: 'both',
    lane: 'compliance',
    category: 'compliance',
    subject: 'Your service agreement is ready to review and sign',
    emailBody: 'Hi {{clientName}},\n\nYour CROA disclosure, service agreement, and limited authorization are ready in the Legal section of your portal. Please review and sign electronically before services proceed.\n\n{{portalUrl}}',
    smsBody: '{{brandName}}: Your agreement pack is ready to sign in the portal. {{portalUrl}}',
    workflowKey: 'contract_ready',
    description: 'CROA / LPOA pack issued',
  },
  {
    id: 'journey-checkin',
    name: 'Weekly journey check-in',
    channel: 'sms',
    lane: 'marketing',
    category: 'engagement',
    emailBody: 'Hi {{clientName}},\n\nQuick check-in from {{brandName}} — open your journey tab and log today\'s progress. Small consistent steps compound.',
    smsBody: '{{brandName}}: Quick check-in — open your portal journey tab today. {{portalUrl}}',
    workflowKey: 'journey_checkin',
    description: 'Engagement nudge — respects marketing opt-out lanes',
  },
  {
    id: 'support-received',
    name: 'Support request received',
    channel: 'email',
    lane: 'transactional',
    category: 'support',
    subject: 'We received your message — Smart FCRA Support',
    emailBody: 'Hi {{clientName}},\n\nWe received your support request (ticket {{ticketNumber}}). Our team typically responds within one business day.\n\nFor urgent compliance matters reply to this email.',
    smsBody: '{{brandName}}: Support ticket {{ticketNumber}} received. We will respond soon.',
    workflowKey: 'support_ack',
    description: 'Auto-ack when client opens support ticket',
  },
  {
    id: 'payment-receipt',
    name: 'Payment receipt',
    channel: 'email',
    lane: 'transactional',
    category: 'billing',
    subject: 'Payment receipt — {{brandName}}',
    emailBody: 'Hi {{clientName}},\n\nWe received your payment of {{amount}} on {{paymentDate}}. This receipt is for your records only and is not a score or deletion guarantee.',
    smsBody: '{{brandName}}: Payment {{amount}} received {{paymentDate}}. Receipt in portal.',
    workflowKey: 'payment_receipt',
    description: 'After successful client billing charge',
  },
];

export function listCommsStarters(category?: string) {
  if (!category) return COMMS_STARTER_LIBRARY;
  return COMMS_STARTER_LIBRARY.filter((t) => t.category === category);
}
