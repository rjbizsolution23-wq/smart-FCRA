/**
 * Unified CRM lifecycle — primary consumer journey + sub-workflow hooks.
 */
export type LifecycleStage =
  | 'lead'
  | 'qualified'
  | 'appointment_scheduled'
  | 'consultation'
  | 'decision'
  | 'enrollment_pending'
  | 'onboarding'
  | 'active'
  | 'report_analysis'
  | 'findings_review'
  | 'action'
  | 'response'
  | 'reanalysis'
  | 'progress_review'
  | 'renewal'
  | 'completed'
  | 'cancelled'
  | 'inactive'
  | 'nurture';

export type SalesOutcome =
  | 'enrolled'
  | 'thinking'
  | 'not_qualified'
  | 'not_interested'
  | 'unable_to_contact'
  | 'do_not_contact'
  | 'follow_up_requested'
  | 'needs_compliance_review'
  | 'b2b_prospect';

export const LIFECYCLE_STAGES: Array<{ id: LifecycleStage; label: string; order: number }> = [
  { id: 'lead', label: 'Lead', order: 0 },
  { id: 'qualified', label: 'Qualified', order: 1 },
  { id: 'appointment_scheduled', label: 'Consultation Scheduled', order: 2 },
  { id: 'consultation', label: 'Consultation', order: 3 },
  { id: 'decision', label: 'Decision', order: 4 },
  { id: 'enrollment_pending', label: 'Enrollment Pending', order: 5 },
  { id: 'onboarding', label: 'Onboarding', order: 6 },
  { id: 'active', label: 'Active', order: 7 },
  { id: 'report_analysis', label: 'Report Analysis', order: 8 },
  { id: 'findings_review', label: 'Findings Review', order: 9 },
  { id: 'action', label: 'Action', order: 10 },
  { id: 'response', label: 'Response', order: 11 },
  { id: 'reanalysis', label: 'Reanalysis', order: 12 },
  { id: 'progress_review', label: 'Progress Review', order: 13 },
  { id: 'renewal', label: 'Renewal / Continuation', order: 14 },
  { id: 'completed', label: 'Completed', order: 15 },
  { id: 'cancelled', label: 'Cancelled', order: 16 },
  { id: 'inactive', label: 'Inactive', order: 17 },
  { id: 'nurture', label: 'Lead — Nurture', order: 18 },
];

/** Map legacy case_status to lifecycle stage for backward compatibility. */
export function caseStatusToLifecycle(caseStatus?: string): LifecycleStage {
  const m: Record<string, LifecycleStage> = {
    ONBOARDING: 'onboarding',
    DISPUTING: 'action',
    LITIGATION: 'action',
    FILED: 'action',
    SETTLED: 'completed',
    CLOSED: 'completed',
  };
  return m[String(caseStatus || '').toUpperCase()] || 'active';
}

export function lifecycleToCaseStatus(stage: LifecycleStage): string | null {
  const m: Partial<Record<LifecycleStage, string>> = {
    onboarding: 'ONBOARDING',
    action: 'DISPUTING',
    response: 'DISPUTING',
    reanalysis: 'DISPUTING',
    completed: 'SETTLED',
    cancelled: 'CLOSED',
  };
  return m[stage] || null;
}

export function salesOutcomeWorkflow(outcome: SalesOutcome): string | null {
  const map: Record<SalesOutcome, string | null> = {
    enrolled: 'enrollment',
    thinking: 'thinking_about_it',
    not_qualified: null,
    not_interested: null,
    unable_to_contact: 'lead_followup',
    do_not_contact: null,
    follow_up_requested: 'lead_followup',
    needs_compliance_review: null,
    b2b_prospect: 'b2b_admin_onboarding',
  };
  return map[outcome];
}

export async function transitionLifecycle(opts: {
  db: D1Database;
  orgId: string;
  clientId: string;
  stage: LifecycleStage;
  actorId?: string;
  reason?: string;
}): Promise<void> {
  const caseUpdate = lifecycleToCaseStatus(opts.stage);
  if (caseUpdate) {
    await opts.db.prepare(
      `UPDATE clients SET lifecycle_stage = ?, lifecycle_updated_at = datetime('now'),
       case_status = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`,
    ).bind(opts.stage, caseUpdate, opts.clientId, opts.orgId).run();
  } else {
    await opts.db.prepare(
      `UPDATE clients SET lifecycle_stage = ?, lifecycle_updated_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`,
    ).bind(opts.stage, opts.clientId, opts.orgId).run();
  }
  await opts.db.prepare(
    `INSERT INTO activity_log (id, org_id, client_id, user_id, action, details, created_at)
     VALUES (?, ?, ?, ?, 'lifecycle_transition', ?, datetime('now'))`,
  ).bind(
    crypto.randomUUID(), opts.orgId, opts.clientId, opts.actorId || 'system',
    JSON.stringify({ stage: opts.stage, reason: opts.reason || null }),
  ).run().catch(() => { /* soft */ });
}

export function marketingAllowedForStage(stage: LifecycleStage): boolean {
  const blocked: LifecycleStage[] = ['cancelled', 'enrollment_pending'];
  return !blocked.includes(stage);
}
