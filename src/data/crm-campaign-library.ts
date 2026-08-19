/**
 * Prebuilt CRM campaign / workflow library (~40 workflows).
 * Orgs can clone but cannot disable mandatory compliance controls.
 */
import type { CommsLane } from './comms-compliance';

export type WorkflowStepDef = {
  delayHours: number;
  action: 'email' | 'sms' | 'task' | 'stage_change' | 'freeze_marketing';
  templateKey?: string;
  subject?: string;
  bodyTemplate?: string;
  lane?: CommsLane;
  taskTitle?: string;
  taskPriority?: string;
  targetStage?: string;
};

export type WorkflowDefinition = {
  key: string;
  name: string;
  category: 'sales' | 'onboarding' | 'service' | 'billing' | 'compliance' | 'education' | 'b2b';
  lane: CommsLane;
  mandatory: boolean;
  description: string;
  trigger: string;
  exitCondition?: string;
  steps: WorkflowStepDef[];
};

export const CRM_CAMPAIGN_LIBRARY: WorkflowDefinition[] = [
  {
    key: 'new_lead',
    name: 'New Lead Acknowledgment',
    category: 'sales',
    lane: 'transactional',
    mandatory: true,
    description: 'Immediate acknowledgment + scheduling link after lead capture',
    trigger: 'lead.created',
    steps: [
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'Hi {{first_name}}, thanks for requesting information from {{org_name}}. We received your request. Schedule your consultation: {{scheduling_link}}. Reply STOP to stop promotional texts.' },
      { delayHours: 0, action: 'email', lane: 'transactional', templateKey: 'new_lead_ack', subject: 'We received your {{org_name}} request', bodyTemplate: 'Hi {{first_name}},\n\nThanks for contacting {{org_name}}.\n\nYour request has been received. Choose a consultation time: {{scheduling_link}}\n\n{{org_name}} does not guarantee deletions, credit-score increases, or specific outcomes.\n\n{{signature}}' },
      { delayHours: 0, action: 'task', taskTitle: 'First-response follow-up call', taskPriority: 'P2' },
    ],
  },
  {
    key: 'lead_followup',
    name: 'Lead Follow-Up (7-day controlled)',
    category: 'sales',
    lane: 'marketing',
    mandatory: false,
    description: 'Day 0–7 controlled follow-up — not endless harassment',
    trigger: 'lead.created',
    exitCondition: 'lead.converted OR lead.nurture',
    steps: [
      { delayHours: 24, action: 'email', lane: 'marketing', subject: 'What {{org_name}} actually analyzes', bodyTemplate: 'We analyze credit-report data, potential inconsistencies, evidence, and available workflows — with human review.\n\nSchedule: {{scheduling_link}}' },
      { delayHours: 48, action: 'sms', lane: 'marketing', bodyTemplate: 'Hi {{first_name}}, this is {{agent_name}} with {{org_name}} following up on your request. Schedule here: {{scheduling_link}}. Reply STOP to opt out.' },
      { delayHours: 96, action: 'email', lane: 'marketing', subject: '{{org_name}} is not a deletion guarantee', bodyTemplate: 'Smart FCRA helps analyze information and organize evidence. We do not promise deletion or score increases.\n\n{{scheduling_link}}' },
      { delayHours: 168, action: 'email', lane: 'marketing', subject: 'Final follow-up', bodyTemplate: 'If you still want to speak with us: {{scheduling_link}}' },
      { delayHours: 336, action: 'stage_change', targetStage: 'nurture' },
    ],
  },
  {
    key: 'long_term_nurture',
    name: 'Long-Term Nurture (12-week education)',
    category: 'education',
    lane: 'marketing',
    mandatory: false,
    description: 'Educational drip — not BUY NOW spam',
    trigger: 'lead.nurture',
    steps: [
      { delayHours: 168, action: 'email', lane: 'marketing', subject: 'How credit reporting works', bodyTemplate: 'Week 1 education: {{lesson_link}}' },
      { delayHours: 336, action: 'email', lane: 'marketing', subject: 'Accurate vs inaccurate information', bodyTemplate: 'Week 2: {{lesson_link}}' },
      { delayHours: 504, action: 'email', lane: 'marketing', subject: 'What a credit dispute does', bodyTemplate: 'Week 3: {{lesson_link}}' },
      { delayHours: 672, action: 'email', lane: 'marketing', subject: 'Why evidence matters', bodyTemplate: 'Week 4: {{lesson_link}}' },
    ],
  },
  {
    key: 'appointment_booked',
    name: 'Appointment Confirmed',
    category: 'sales',
    lane: 'transactional',
    mandatory: true,
    description: 'Consultation scheduled confirmation',
    trigger: 'appointment.booked',
    steps: [
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'Your {{org_name}} consultation is scheduled for {{appointment_date}} at {{appointment_time}} {{timezone}}. Manage: {{appointment_link}}' },
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Consultation confirmed', bodyTemplate: 'Date: {{appointment_date}}\nTime: {{appointment_time}} {{timezone}}\nRep: {{agent_name}}\n\nDo not send passwords or full card numbers by email.' },
      { delayHours: 24, action: 'sms', lane: 'transactional', bodyTemplate: 'Reminder: consultation tomorrow at {{appointment_time}} {{timezone}}. {{appointment_link}}' },
      { delayHours: 23, action: 'sms', lane: 'transactional', bodyTemplate: 'Your consultation begins in about one hour. Join: {{appointment_link}}' },
    ],
  },
  {
    key: 'no_show',
    name: 'No-Show Reschedule',
    category: 'sales',
    lane: 'transactional',
    mandatory: false,
    description: '15min / 24hr / 72hr reschedule — then nurture',
    trigger: 'appointment.no_show',
    steps: [
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'We were not able to connect for your appointment. Reschedule: {{scheduling_link}}' },
      { delayHours: 24, action: 'email', lane: 'transactional', subject: 'Want to reschedule?', bodyTemplate: '{{scheduling_link}}' },
      { delayHours: 72, action: 'email', lane: 'transactional', subject: 'Final rescheduling invitation', bodyTemplate: '{{scheduling_link}}' },
      { delayHours: 96, action: 'stage_change', targetStage: 'nurture' },
    ],
  },
  {
    key: 'thinking_about_it',
    name: 'Thinking About It',
    category: 'sales',
    lane: 'marketing',
    mandatory: false,
    description: 'Post-consultation decision nurture',
    trigger: 'sales.thinking',
    steps: [
      { delayHours: 0, action: 'email', lane: 'marketing', subject: 'Your {{org_name}} information', bodyTemplate: 'Resources discussed: {{resources}}\n\nDecide based on what the service provides — not score guarantees.\n{{scheduling_link}}' },
      { delayHours: 48, action: 'email', lane: 'marketing', subject: 'How the workflow works', bodyTemplate: 'Educational case workflow — not outcome hype.' },
      { delayHours: 120, action: 'email', lane: 'marketing', subject: 'FAQ', bodyTemplate: '{{faq_link}}' },
      { delayHours: 240, action: 'email', lane: 'marketing', subject: 'Final follow-up', bodyTemplate: '{{scheduling_link}}' },
      { delayHours: 264, action: 'stage_change', targetStage: 'nurture' },
    ],
  },
  {
    key: 'enrollment',
    name: 'Enrollment Pending',
    category: 'compliance',
    lane: 'compliance',
    mandatory: true,
    description: 'Contract sent — not active until complete',
    trigger: 'enrollment.started',
    steps: [
      { delayHours: 0, action: 'sms', lane: 'compliance', bodyTemplate: '{{org_name}} sent documents requiring review. Access securely: {{secure_link}}' },
      { delayHours: 0, action: 'email', lane: 'compliance', subject: 'Documents requiring your review', bodyTemplate: 'Review pricing, terms, cancellation info, and disclosures: {{secure_link}}' },
      { delayHours: 0, action: 'stage_change', targetStage: 'enrollment_pending' },
    ],
  },
  {
    key: 'welcome',
    name: 'Welcome (Active)',
    category: 'onboarding',
    lane: 'transactional',
    mandatory: true,
    description: 'Post-enrollment welcome',
    trigger: 'enrollment.completed',
    steps: [
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Welcome to {{org_name}}', bodyTemplate: 'Your account is ready.\n\n1. Complete profile\n2. Verification\n3. Upload information\n4. Review disclosures\n5. Questionnaire\n\nPortal: {{portal_link}}' },
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'Welcome to {{org_name}}, {{first_name}}. Secure onboarding: {{portal_link}}' },
      { delayHours: 0, action: 'stage_change', targetStage: 'onboarding' },
    ],
  },
  {
    key: 'onboarding_incomplete',
    name: 'Abandoned Onboarding',
    category: 'onboarding',
    lane: 'transactional',
    mandatory: false,
    description: '24hr / 72hr / 7-day nudges — capped',
    trigger: 'onboarding.stalled',
    steps: [
      { delayHours: 24, action: 'email', lane: 'transactional', subject: 'Finish setting up {{org_name}}', bodyTemplate: 'Onboarding {{percent}}% complete. Next: {{next_step}}. {{portal_link}}' },
      { delayHours: 72, action: 'sms', lane: 'transactional', bodyTemplate: 'Your onboarding is {{percent}}% complete. Continue: {{portal_link}}' },
      { delayHours: 168, action: 'task', taskTitle: 'Onboarding incomplete — agent review', taskPriority: 'P2' },
      { delayHours: 336, action: 'stage_change', targetStage: 'inactive' },
    ],
  },
  {
    key: 'report_received',
    name: 'Credit Data Received',
    category: 'service',
    lane: 'transactional',
    mandatory: true,
    description: 'Notify consumer report entered analysis pipeline',
    trigger: 'report.imported',
    steps: [
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Your information was received', bodyTemplate: 'Your information was received securely. This does not mean a violation was determined or that any item will be removed.' },
      { delayHours: 0, action: 'stage_change', targetStage: 'report_analysis' },
    ],
  },
  {
    key: 'analysis_ready',
    name: 'Analysis Complete',
    category: 'service',
    lane: 'transactional',
    mandatory: true,
    description: 'Findings ready for human-reviewed portal view',
    trigger: 'analysis.complete',
    steps: [
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'Your {{org_name}} analysis is ready for review: {{portal_link}}' },
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Your analysis is ready', bodyTemplate: 'Potential findings may appear — software findings do not establish legal liability. Review: {{portal_link}}' },
      { delayHours: 0, action: 'stage_change', targetStage: 'findings_review' },
    ],
  },
  {
    key: 'document_request',
    name: 'More Information Required',
    category: 'service',
    lane: 'transactional',
    mandatory: false,
    description: 'Secure document request',
    trigger: 'document.required',
    steps: [
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: '{{org_name}} needs additional information for {{account_nickname}}. Secure portal: {{portal_link}}' },
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Additional information needed', bodyTemplate: 'Required: {{required_docs}}\nWhy: {{reason}}\nUpload: {{portal_link}}' },
      { delayHours: 0, action: 'task', taskTitle: 'Create client task: upload document', taskPriority: 'P2' },
    ],
  },
  {
    key: 'correspondence_sent',
    name: 'Correspondence Sent',
    category: 'service',
    lane: 'transactional',
    mandatory: false,
    description: 'Letter mailed status update',
    trigger: 'document.sent',
    steps: [
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'Your portal was updated regarding correspondence for {{account_nickname}}: {{portal_link}}' },
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Correspondence status updated', bodyTemplate: 'Recipient: {{recipient}}\nSent: {{sent_date}}\nMethod: {{method}}' },
    ],
  },
  {
    key: 'response_received',
    name: 'Response Received',
    category: 'service',
    lane: 'transactional',
    mandatory: false,
    description: 'Bureau/furnisher response uploaded',
    trigger: 'response.uploaded',
    steps: [
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'New information related to your case is being reviewed.' },
      { delayHours: 0, action: 'stage_change', targetStage: 'response' },
    ],
  },
  {
    key: 'change_detected',
    name: 'Report Change Detected',
    category: 'service',
    lane: 'transactional',
    mandatory: true,
    description: 'Neutral change notification — no victory hype',
    trigger: 'credit_event.deleted',
    steps: [
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'A change was detected in your updated report', bodyTemplate: 'The current report no longer shows {{item}} in {{source}}. Score effects vary; no guarantee of permanence. Compare in portal: {{portal_link}}' },
    ],
  },
  {
    key: 'monthly_progress',
    name: 'Monthly Progress Report',
    category: 'service',
    lane: 'transactional',
    mandatory: false,
    description: 'Monthly retention engine',
    trigger: 'cron.monthly',
    steps: [
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Your monthly progress report', bodyTemplate: 'Reports analyzed, findings reviewed, correspondence sent, changes detected. No score guarantees. {{portal_link}}' },
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'Your monthly progress report is ready: {{portal_link}}' },
    ],
  },
  {
    key: 'billing_failure',
    name: 'Failed Payment',
    category: 'billing',
    lane: 'transactional',
    mandatory: true,
    description: 'Payment failed — no collections threats',
    trigger: 'billing.failed',
    steps: [
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Action needed on your account', bodyTemplate: 'We could not process your payment. Update billing securely: {{billing_link}}' },
      { delayHours: 0, action: 'sms', lane: 'transactional', bodyTemplate: 'Payment could not be processed. Review billing: {{billing_link}}' },
    ],
  },
  {
    key: 'cancellation',
    name: 'Cancellation Confirmation',
    category: 'compliance',
    lane: 'compliance',
    mandatory: true,
    description: 'CROA cancellation rights workflow',
    trigger: 'cancellation.requested',
    steps: [
      { delayHours: 0, action: 'email', lane: 'compliance', subject: 'Cancellation request received', bodyTemplate: 'We received your cancellation request on {{date}}. Confirmation will follow when processing completes.' },
      { delayHours: 0, action: 'freeze_marketing' },
      { delayHours: 24, action: 'email', lane: 'compliance', subject: 'Cancellation confirmation', bodyTemplate: 'Cancellation effective {{effective_date}}. Retain this confirmation.' },
      { delayHours: 0, action: 'stage_change', targetStage: 'cancelled' },
    ],
  },
  {
    key: 'complaint_ack',
    name: 'Complaint Acknowledgment',
    category: 'compliance',
    lane: 'compliance',
    mandatory: true,
    description: 'Formal complaint received',
    trigger: 'complaint.created',
    steps: [
      { delayHours: 0, action: 'email', lane: 'compliance', subject: 'We received your concern', bodyTemplate: 'Reference: {{complaint_id}}\n\nAssigned for review. We will not ask you to waive regulatory rights.' },
      { delayHours: 0, action: 'freeze_marketing' },
    ],
  },
  {
    key: 'inactivity',
    name: 'Customer Inactivity',
    category: 'service',
    lane: 'transactional',
    mandatory: false,
    description: '14/30/45/60 day inactivity ladder',
    trigger: 'client.inactive',
    steps: [
      { delayHours: 336, action: 'email', lane: 'transactional', subject: 'Activity waiting for review', bodyTemplate: '{{portal_link}}' },
      { delayHours: 720, action: 'sms', lane: 'transactional', bodyTemplate: 'You have Smart FCRA activity waiting: {{portal_link}}' },
      { delayHours: 1080, action: 'task', taskTitle: 'Inactive client review', taskPriority: 'P3' },
    ],
  },
  {
    key: 'b2b_admin_onboarding',
    name: 'New CRO Admin (10-day)',
    category: 'b2b',
    lane: 'transactional',
    mandatory: false,
    description: 'B2B org setup drip',
    trigger: 'org.created',
    steps: [
      { delayHours: 0, action: 'email', lane: 'transactional', subject: 'Welcome to Smart FCRA', bodyTemplate: 'Day 0: Welcome. Configure brand, products, consent, team, integrations.' },
      { delayHours: 24, action: 'email', lane: 'transactional', subject: 'Configure your brand', bodyTemplate: 'Day 1: Brand settings.' },
      { delayHours: 168, action: 'email', lane: 'transactional', subject: 'Compliance review checklist', bodyTemplate: 'Day 7: Review before go-live.' },
    ],
  },
];

export function getWorkflowDefinition(key: string): WorkflowDefinition | undefined {
  return CRM_CAMPAIGN_LIBRARY.find((w) => w.key === key);
}

export function listWorkflowLibrary(): Array<{ key: string; name: string; category: string; mandatory: boolean; lane: CommsLane }> {
  return CRM_CAMPAIGN_LIBRARY.map((w) => ({
    key: w.key, name: w.name, category: w.category, mandatory: w.mandatory, lane: w.lane,
  }));
}
