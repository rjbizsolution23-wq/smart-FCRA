/**
 * One primary consumer action. Never invent guaranteed score/deletion outcomes.
 */

export type CaseStage =
  | 'ONBOARDING'
  | 'REPORT_REQUIRED'
  | 'REPORT_ANALYSIS'
  | 'CLIENT_REVIEW'
  | 'EVIDENCE_COLLECTION'
  | 'DISPUTE_PREPARATION'
  | 'CLIENT_APPROVAL'
  | 'READY_TO_SEND'
  | 'MAILED'
  | 'DELIVERED'
  | 'INVESTIGATION'
  | 'RESPONSE_RECEIVED'
  | 'RESPONSE_REVIEW'
  | 'REPORT_REFRESH'
  | 'FOLLOW_UP_REVIEW'
  | 'COMPLETED'
  | 'PAUSED'
  | 'CANCELLED';

export type NextBestAction = {
  id: string;
  title: string;
  detail: string;
  ctaLabel: string;
  ctaPage: string;
  due?: string | null;
  urgency: 'URGENT' | 'HIGH' | 'NORMAL' | 'LOW';
};

export type NbaContext = {
  hasReport: boolean;
  analysisUnlocked: boolean;
  pendingAttestations: number;
  draftDisputes: number;
  awaitingApproval: number;
  mailedPendingResponse: number;
  responseUploadedUnreviewed: number;
  missingIdUpload: boolean;
  unsignedContract: boolean;
  cancellationRequested: boolean;
  utilizationPct?: number | null;
};

export function inferCaseStage(ctx: NbaContext): CaseStage {
  if (ctx.cancellationRequested) return 'CANCELLED';
  if (!ctx.hasReport) return 'REPORT_REQUIRED';
  if (!ctx.analysisUnlocked) return 'REPORT_ANALYSIS';
  if (ctx.unsignedContract) return 'ONBOARDING';
  if (ctx.responseUploadedUnreviewed) return 'RESPONSE_REVIEW';
  if (ctx.mailedPendingResponse) return 'INVESTIGATION';
  if (ctx.awaitingApproval) return 'CLIENT_APPROVAL';
  if (ctx.draftDisputes) return 'DISPUTE_PREPARATION';
  if (ctx.pendingAttestations) return 'CLIENT_REVIEW';
  if (ctx.missingIdUpload) return 'EVIDENCE_COLLECTION';
  return 'FOLLOW_UP_REVIEW';
}

export function computeNextBestAction(ctx: NbaContext): { primary: NextBestAction; additional: NextBestAction[]; stage: CaseStage } {
  const stage = inferCaseStage(ctx);
  const additional: NextBestAction[] = [];

  const queue: NextBestAction[] = [];
  if (!ctx.hasReport) {
    queue.push({
      id: 'upload_report',
      title: 'Upload or connect a credit report',
      detail: 'Your workspace starts with a report we can analyze. Upload a file or connect monitoring.',
      ctaLabel: 'Get started',
      ctaPage: 'client-self-onboard',
      urgency: 'URGENT',
    });
  }
  if (ctx.hasReport && !ctx.analysisUnlocked) {
    queue.push({
      id: 'unlock_analysis',
      title: 'Unlock your credit analysis',
      detail: 'Your report is on file. Analysis, findings, and dispute drafts unlock after payment is confirmed.',
      ctaLabel: 'View status',
      ctaPage: 'client-cockpit',
      urgency: 'HIGH',
    });
  }
  if (ctx.unsignedContract) {
    queue.push({
      id: 'sign_contract',
      title: 'Review and sign your service agreement',
      detail: 'CROA requires a written contract and specified disclosures before covered credit-repair services proceed.',
      ctaLabel: 'Open Legal & Notary',
      ctaPage: 'client-legal',
      urgency: 'HIGH',
    });
  }
  if (ctx.missingIdUpload) {
    queue.push({
      id: 'upload_id',
      title: 'Upload photo ID and proof of address',
      detail: 'Identity documents help bureaus complete investigations and belong in your evidence vault.',
      ctaLabel: 'Open vault',
      ctaPage: 'client-uploads',
      urgency: 'HIGH',
    });
  }
  if (ctx.pendingAttestations > 0) {
    queue.push({
      id: 'attest_facts',
      title: `Confirm facts on ${ctx.pendingAttestations} account${ctx.pendingAttestations === 1 ? '' : 's'}`,
      detail: 'We will not submit a consumer statement about an account unless it is in your report or you confirm it.',
      ctaLabel: 'Confirm facts',
      ctaPage: 'client-attest',
      urgency: 'URGENT',
    });
  }
  if (ctx.awaitingApproval > 0) {
    queue.push({
      id: 'approve_dispute',
      title: `Review ${ctx.awaitingApproval} dispute draft${ctx.awaitingApproval === 1 ? '' : 's'}`,
      detail: 'Read each statement, confirm accuracy, or request changes. Approval creates an immutable record.',
      ctaLabel: 'Review disputes',
      ctaPage: 'client-disputes',
      urgency: 'URGENT',
    });
  }
  if (ctx.responseUploadedUnreviewed > 0) {
    queue.push({
      id: 'review_response',
      title: 'Review bureau or furnisher response',
      detail: 'Import a fresh report after you understand the results so we can measure what actually changed.',
      ctaLabel: 'Open case',
      ctaPage: 'client-case',
      urgency: 'HIGH',
    });
  }
  if (ctx.mailedPendingResponse > 0) {
    queue.push({
      id: 'await_investigation',
      title: 'Investigation in progress',
      detail: 'Consumer reporting companies generally investigate disputes within 30 days; some circumstances permit up to 45 days. This is a workflow target, not a guarantee for every case.',
      ctaLabel: 'Track case',
      ctaPage: 'client-case',
      urgency: 'NORMAL',
    });
  }
  if (typeof ctx.utilizationPct === 'number' && ctx.utilizationPct >= 50) {
    additional.push({
      id: 'utilization_education',
      title: `Revolving utilization is ${Math.round(ctx.utilizationPct)}%`,
      detail: 'Educational target balances are not a promised score increase. Different lenders use different models.',
      ctaLabel: 'View credit',
      ctaPage: 'client-credit',
      urgency: 'NORMAL',
    });
  }

  const primary = queue[0] || {
    id: 'stay_current',
    title: 'Stay current on your credit journey',
    detail: 'Review scores, documents, and education. No guaranteed deletions or score increases.',
    ctaLabel: 'Open dashboard',
    ctaPage: 'client-cockpit',
    urgency: 'LOW',
  };
  additional.push(...queue.slice(1));

  return { primary, additional, stage };
}

export const CASE_STAGE_LABELS: Record<CaseStage, string> = {
  ONBOARDING: 'Onboarding',
  REPORT_REQUIRED: 'Report required',
  REPORT_ANALYSIS: 'Report analysis',
  CLIENT_REVIEW: 'Your review',
  EVIDENCE_COLLECTION: 'Evidence collection',
  DISPUTE_PREPARATION: 'Dispute preparation',
  CLIENT_APPROVAL: 'Waiting for your approval',
  READY_TO_SEND: 'Ready to send',
  MAILED: 'Mailed',
  DELIVERED: 'Delivered',
  INVESTIGATION: 'Bureau investigation',
  RESPONSE_RECEIVED: 'Response received',
  RESPONSE_REVIEW: 'Response review',
  REPORT_REFRESH: 'Report refresh',
  FOLLOW_UP_REVIEW: 'Follow-up review',
  COMPLETED: 'Completed',
  PAUSED: 'Paused',
  CANCELLED: 'Cancelled',
};
