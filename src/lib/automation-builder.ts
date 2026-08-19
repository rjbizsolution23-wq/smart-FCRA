/**
 * Custom automation builder — WHEN / IF / THEN / WAIT / CHECK / STOP DSL.
 */
export type AutomationCondition = {
  field: string;
  op: 'eq' | 'neq' | 'exists' | 'not_exists' | 'in' | 'gt' | 'lt';
  value?: string | number | boolean | string[];
};

export type AutomationStep = {
  type: 'send_email' | 'send_sms' | 'task' | 'stage_change' | 'freeze_marketing' | 'push' | 'wait' | 'stop';
  lane?: string;
  delayHours?: number;
  subject?: string;
  bodyTemplate?: string;
  taskTitle?: string;
  taskPriority?: string;
  targetStage?: string;
  pushTitle?: string;
  pushBody?: string;
  conditions?: AutomationCondition[];
};

export type AutomationDefinition = {
  id: string;
  orgId: string;
  name: string;
  description?: string;
  triggerEvent: string;
  conditions: AutomationCondition[];
  steps: AutomationStep[];
  lane: string;
  category: string;
  status: 'draft' | 'pending_review' | 'approved' | 'active' | 'archived';
  mandatoryControls: boolean;
  version: number;
};

export function parseAutomationRow(row: any): AutomationDefinition {
  let conditions: AutomationCondition[] = [];
  let steps: AutomationStep[] = [];
  try { conditions = JSON.parse(row.conditions_json || '[]'); } catch { /* */ }
  try { steps = JSON.parse(row.steps_json || '[]'); } catch { /* */ }
  return {
    id: row.id,
    orgId: row.org_id,
    name: row.name,
    description: row.description,
    triggerEvent: row.trigger_event,
    conditions,
    steps,
    lane: row.lane || 'transactional',
    category: row.category || 'custom',
    status: row.status,
    mandatoryControls: row.mandatory_controls === 1,
    version: row.version || 1,
  };
}

export function evaluateConditions(
  conditions: AutomationCondition[],
  context: Record<string, unknown>,
): boolean {
  if (!conditions.length) return true;
  return conditions.every((c) => {
    const val = context[c.field];
    switch (c.op) {
      case 'eq': return String(val) === String(c.value);
      case 'neq': return String(val) !== String(c.value);
      case 'exists': return val !== undefined && val !== null && val !== '';
      case 'not_exists': return val === undefined || val === null || val === '';
      case 'gt': return Number(val) > Number(c.value);
      case 'lt': return Number(val) < Number(c.value);
      case 'in': return Array.isArray(c.value) ? c.value.includes(String(val)) : false;
      default: return true;
    }
  });
}

/** Convert custom automation steps to workflow engine step format. */
export function automationStepsToWorkflow(steps: AutomationStep[]): Array<{
  delayHours: number;
  action: string;
  lane?: string;
  subject?: string;
  bodyTemplate?: string;
  taskTitle?: string;
  taskPriority?: string;
  targetStage?: string;
  pushTitle?: string;
  pushBody?: string;
}> {
  let accumulatedDelay = 0;
  const out: any[] = [];
  for (const s of steps) {
    if (s.type === 'wait') {
      accumulatedDelay += s.delayHours || 0;
      continue;
    }
    if (s.type === 'stop') break;
    const action = s.type === 'send_email' ? 'email'
      : s.type === 'send_sms' ? 'sms'
      : s.type === 'push' ? 'push'
      : s.type === 'task' ? 'task'
      : s.type === 'stage_change' ? 'stage_change'
      : s.type === 'freeze_marketing' ? 'freeze_marketing'
      : 'task';
    out.push({
      delayHours: accumulatedDelay,
      action,
      lane: s.lane,
      subject: s.subject,
      bodyTemplate: s.bodyTemplate,
      taskTitle: s.taskTitle,
      taskPriority: s.taskPriority,
      targetStage: s.targetStage,
      pushTitle: s.pushTitle,
      pushBody: s.pushBody,
    });
    accumulatedDelay = 0;
  }
  return out;
}

export const AUTOMATION_TRIGGER_CATALOG = [
  'lead.created', 'lead.hot', 'lead.converted', 'appointment.booked', 'appointment.no_show',
  'consultation.completed', 'enrollment.started', 'enrollment.completed', 'report.imported',
  'analysis.started', 'analysis.complete', 'document.required', 'document.uploaded',
  'document.sent', 'response.uploaded', 'credit_event.deleted', 'credit_event.updated',
  'billing.failed', 'billing.paid', 'cancellation.requested', 'complaint.created',
  'refund.requested', 'privacy.requested', 'client.inactive', 'custom.manual',
];

export const AUTOMATION_STEP_TYPES = [
  { type: 'send_email', label: 'Send email', laneRequired: true },
  { type: 'send_sms', label: 'Send SMS', laneRequired: true },
  { type: 'push', label: 'Push notification (in-app)', laneRequired: false },
  { type: 'task', label: 'Create staff task', laneRequired: false },
  { type: 'stage_change', label: 'Change lifecycle stage', laneRequired: false },
  { type: 'freeze_marketing', label: 'Freeze marketing', laneRequired: false },
  { type: 'wait', label: 'Wait (hours)', laneRequired: false },
  { type: 'stop', label: 'Stop workflow', laneRequired: false },
];
