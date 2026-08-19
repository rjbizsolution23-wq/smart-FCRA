/**
 * Customer Service / CRM Compliance Playbook — structured reference for in-app agents.
 * Full prose: docs/CUSTOMER_SERVICE_COMPLIANCE_PLAYBOOK.md
 */

export const SUPPORT_GOLDEN_RULE =
  'NEVER PROMISE AN OUTCOME. Explain workflows, findings, documents, deadlines, and available actions — not guaranteed deletions, score increases, legal violations, or monetary recovery.';

export const CALL_OPENING_SCRIPT =
  'Thank you for calling Smart FCRA. My name is [AGENT NAME]. May I have your name and the email address or other approved identifier associated with your account?';

export const IDENTITY_VERIFIED_SCRIPT =
  "Thank you. I've verified your account. How can I help you today?";

export const IDENTITY_FAILED_SCRIPT =
  "I'm unable to complete the required verification, so I can't disclose account-specific information on this call. I can explain the available steps for completing verification or provide general information that doesn't disclose protected account information.";

export const SUPPORT_DISPOSITIONS = [
  'General Inquiry',
  'Account Verification',
  'Onboarding',
  'Report Import',
  'Report Analysis',
  'Finding Explanation',
  'Dispute Status',
  'Bureau Response',
  'Furnisher Response',
  'Collector Response',
  'Documentation Request',
  'Deadline Inquiry',
  'Billing',
  'Refund',
  'Cancellation',
  'Complaint',
  'Privacy Request',
  'Security Incident',
  'Identity Theft',
  'Technical Support',
  'Accessibility',
  'Legal Escalation',
  'Regulatory Escalation',
  'Attorney Contact',
  'AI Review',
  'Supervisor Escalation',
  'Expectation Management — Score',
  'Resolved',
  'Follow-Up Required',
] as const;

export const ESCALATION_LEVELS = [
  { level: 1, name: 'Customer Service', description: 'Routine account/service questions.' },
  { level: 2, name: 'Senior Support', description: 'Complex account issues, repeat complaints, exceptions.' },
  { level: 3, name: 'Operations / Specialist Review', description: 'Credit-file workflow and complex evidence questions.' },
  { level: 4, name: 'Compliance', description: 'Potential regulatory issues, systemic problems, material complaints.' },
  { level: 5, name: 'Legal', description: 'Litigation, subpoenas, government inquiries, attorney communications.' },
  { level: 6, name: 'Security / Privacy', description: 'Breaches, account takeover, unauthorized disclosure.' },
] as const;

export const RED_FLAG_TERMS = [
  'lawyer', 'attorney', 'sue', 'lawsuit', 'subpoena', 'ftc', 'cfpb', 'attorney general', 'regulator',
  'fraud', 'identity theft', 'data breach', 'hacked', 'unauthorized charge', 'chargeback', 'cancel',
  'refund', 'do not call', 'stop calling', 'recording', 'discrimination', 'legal violation', 'damages',
  'guaranteed', 'guarantee',
] as const;

export const COMPLAINT_CLASSIFICATIONS = [
  'Misrepresentation',
  'Unauthorized Billing',
  'Cancellation',
  'Privacy',
  'Security',
  'Discrimination',
  'Credit Reporting',
  'Marketing/Contact',
  'Employee Conduct',
  'Regulatory Rights',
  'Legal Claims',
  'Product Accuracy',
  'Service Dissatisfaction',
] as const;

export type PlaybookScenario = {
  id: string;
  title: string;
  customerQuestion?: string;
  approvedResponse: string;
  disposition?: string;
  escalate?: boolean;
  prohibited?: string[];
};

export const PLAYBOOK_SCENARIOS: PlaybookScenario[] = [
  {
    id: 'fix-credit',
    title: 'Can you fix my credit?',
    customerQuestion: 'Can you fix my credit?',
    approvedResponse:
      'Smart FCRA provides tools and workflows designed to help identify, document and address information that may warrant review or dispute. Results vary based on each consumer\'s circumstances, the information being reported and the responses of the organizations involved. We don\'t guarantee deletions or specific credit-score results.',
  },
  {
    id: 'score-increase',
    title: 'How much will my score go up?',
    customerQuestion: 'How much will my score go up?',
    approvedResponse:
      "We can't predict or guarantee a particular credit-score increase. Credit scores depend on multiple factors and scoring models, and changes to a credit report can affect different consumers differently.",
    disposition: 'Expectation Management — Score',
  },
  {
    id: 'how-long',
    title: 'How long will this take?',
    approvedResponse:
      "Timing depends on the particular action, applicable process and responses received. I can review the status currently shown in your account and explain the next documented milestone, but I don't want to promise a completion date that isn't guaranteed.",
  },
  {
    id: 'is-violation',
    title: 'Is this a violation?',
    customerQuestion: 'Is this a violation?',
    approvedResponse:
      "Smart FCRA may identify information that warrants additional review under particular reporting or consumer-protection frameworks. A system finding isn't the same as a court determining that a legal violation occurred. I can explain what information triggered the finding and the workflow available for reviewing it.",
    escalate: true,
  },
  {
    id: 'how-much-money',
    title: 'How much money can I get?',
    approvedResponse:
      "Smart FCRA may provide educational information or analytical estimates concerning potentially applicable remedies, but those aren't guarantees that liability exists or that any particular amount will be recovered. Actual legal remedies depend on the facts and applicable law.",
  },
  {
    id: 'mine-but-delete',
    title: 'Account is mine but I want it deleted',
    approvedResponse:
      "We can only work from accurate information. We can't create or submit a factual claim we know is false. If you believe specific information about the account is inaccurate, incomplete, unverifiable or otherwise warrants review, tell me what's wrong and we can document the facts accurately.",
  },
  {
    id: 'identity-theft',
    title: 'Identity theft workflow',
    approvedResponse:
      "I'm sorry you're dealing with that. I need to document what you're reporting accurately. I'll take you through our identity-theft workflow so the appropriate information and documentation can be collected.",
  },
  {
    id: 'false-identity-theft',
    title: 'Can I just say identity theft?',
    customerQuestion: 'Can I just say it was identity theft?',
    approvedResponse:
      "No. Identity-theft statements must be truthful. We can't recommend or assist with making a false identity-theft claim.",
  },
  {
    id: 'what-should-i-say',
    title: 'What should I say?',
    approvedResponse:
      "I can explain the available workflow and help make sure the facts you provide are documented accurately. I can't invent facts or tell you to make a statement that isn't true.",
  },
  {
    id: 'finding-explanation',
    title: 'System detected a potential issue',
    approvedResponse:
      'Smart FCRA identified a potential issue associated with [ACCOUNT/DATA FIELD]. The finding was triggered by [PLAIN-LANGUAGE REASON]. That means the information may warrant additional review. It doesn\'t by itself establish that a legal violation occurred.',
  },
  {
    id: 'deletion-received',
    title: 'Customer receives a deletion',
    approvedResponse:
      "Your updated information currently shows that [ITEM] is no longer appearing in [RELEVANT SOURCE/REPORT]. That's a positive change in the report data we're reviewing. We still don't want to predict a particular score change because scoring depends on multiple factors.",
  },
  {
    id: 'item-returns',
    title: 'Item comes back on report',
    approvedResponse:
      "I understand why you'd want this reviewed. Let's compare the previous report, the updated information and any correspondence associated with the account. I'll document what changed and route the case through the appropriate review workflow.",
  },
  {
    id: 'no-change',
    title: 'No change after dispute',
    approvedResponse:
      "The current report comparison shows that this item remains reported. That doesn't necessarily mean the process is finished or that wrongdoing occurred. I'll review the response and case history and identify the next available workflow.",
  },
  {
    id: 'bureau-response',
    title: 'Bureau/furnisher/collector response received',
    approvedResponse:
      "We received a response concerning [ACCOUNT]. Smart FCRA is comparing it with the previous information and case history. I can explain what changed, what remained unchanged and what the current workflow shows as the next review step.",
  },
  {
    id: 'speak-attorney',
    title: 'Customer wants an attorney',
    approvedResponse:
      "Smart FCRA customer-service representatives aren't attorneys and can't provide legal advice. If you want an attorney to evaluate potential legal claims, I can explain any attorney-referral or document-export process Smart FCRA currently makes available.",
  },
  {
    id: 'refund',
    title: 'I want a refund',
    approvedResponse:
      "I can review the account and applicable refund terms with you. I'll document your request exactly as you've made it and follow the required billing/refund workflow.",
    disposition: 'Refund',
  },
  {
    id: 'cancel',
    title: 'Cancel my account',
    approvedResponse:
      "I can help document and process your cancellation request. Before I proceed, I'll verify the account and review the cancellation information associated with your service.",
    disposition: 'Cancellation',
  },
  {
    id: 'chargeback',
    title: 'Chargeback threat',
    approvedResponse:
      "You're entitled to contact your financial institution. I'll document your billing concern and review what our records show regarding the transaction and your account.",
  },
  {
    id: 'regulator-threat',
    title: 'BBB / CFPB / FTC / AG threat',
    approvedResponse:
      "You have the right to contact government agencies or other organizations regarding your concerns. I'll document the issue and make sure your complaint is routed through our escalation process.",
    disposition: 'Regulatory Escalation',
  },
  {
    id: 'ai-incorrect',
    title: 'AI generated something incorrect',
    approvedResponse:
      "Thank you for identifying that. Automated analysis can require human review. I'm flagging this output so it can be reviewed before it is relied upon or sent.",
    disposition: 'AI Review',
  },
];

export const PROHIBITED_PHRASES: { never: string; use: string }[] = [
  { never: 'Guaranteed deletion.', use: 'Results depend on the facts and responses received.' },
  { never: 'This will raise your score.', use: "We can't predict a particular score change." },
  { never: 'They broke the law.', use: 'The system identified information that may warrant additional review.' },
  { never: 'They owe you $5,000.', use: 'The system may display potential remedies or analytical scenarios; actual liability and recovery aren\'t guaranteed.' },
  { never: "We'll get that removed.", use: 'We can review the information and available workflow.' },
  { never: 'Just dispute everything.', use: "Disputes and related statements should accurately reflect the consumer's facts." },
  { never: "Say it isn't yours.", use: 'Tell us accurately what you believe is incorrect.' },
  { never: 'Claim identity theft.', use: 'Identity-theft claims must be truthful.' },
  { never: "Don't pay the creditor.", use: "We can't instruct you to stop paying an obligation. Questions about your legal obligations should be addressed with an appropriately qualified professional." },
];

export const CRM_NOTE_TEMPLATE = 'FACTS → ACTION → RESULT → NEXT STEP';

export const QA_SCORECARD = {
  authentication: 15,
  privacySecurity: 15,
  accuracy: 15,
  compliance: 20,
  customerExperience: 10,
  resolution: 10,
  crmDocumentation: 10,
  escalation: 5,
  criticalFailures: [
    'Unauthorized disclosure',
    'Asking for customer password',
    'Knowingly creating false dispute facts',
    'Coaching false identity theft',
    'Guaranteeing litigation recovery',
    'Materially misrepresenting services',
    'Improperly preventing cancellation',
    'Altering material evidence',
    'Knowingly falsifying CRM notes',
    'Circumventing required consent/security controls',
  ],
} as const;

export const SERVICE_STANDARD = [
  'Never fabricate.',
  'Never guarantee.',
  'Never hide.',
  'Never pressure.',
  'Never alter evidence.',
  'Never obstruct cancellation.',
  'Never disclose without authorization.',
  'Document what happened.',
  'Preserve the evidence.',
  'Escalate what exceeds your authority.',
] as const;

export function detectRedFlagTerms(text: string): string[] {
  const lower = String(text || '').toLowerCase();
  return RED_FLAG_TERMS.filter((term) => lower.includes(term));
}

export function supportPlaybookPayload() {
  return {
    version: '1.0',
    goldenRule: SUPPORT_GOLDEN_RULE,
    callOpening: CALL_OPENING_SCRIPT,
    identityVerified: IDENTITY_VERIFIED_SCRIPT,
    identityFailed: IDENTITY_FAILED_SCRIPT,
    dispositions: SUPPORT_DISPOSITIONS,
    escalationLevels: ESCALATION_LEVELS,
    redFlagTerms: RED_FLAG_TERMS,
    complaintClassifications: COMPLAINT_CLASSIFICATIONS,
    scenarios: PLAYBOOK_SCENARIOS,
    prohibitedPhrases: PROHIBITED_PHRASES,
    noteTemplate: CRM_NOTE_TEMPLATE,
    qaScorecard: QA_SCORECARD,
    serviceStandard: SERVICE_STANDARD,
  };
}
