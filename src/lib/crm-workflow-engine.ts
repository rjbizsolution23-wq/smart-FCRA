/**
 * CRM workflow runner — schedules and executes prebuilt campaign steps.
 */
import type { CommsLane } from './comms-compliance';
import { canSendMessage, logCommunicationAttempt } from './comms-compliance';
import { getWorkflowDefinition, type WorkflowDefinition } from '../data/crm-campaign-library';
import { transitionLifecycle, type LifecycleStage } from './lifecycle-engine';
import { sendAppEmail } from './email';
import { sendSms } from './alerts';

export async function startWorkflowRun(opts: {
  db: D1Database;
  env: any;
  orgId: string;
  workflowKey: string;
  clientId?: string;
  leadId?: string;
  context?: Record<string, string>;
  generateId: () => string;
  baseTime?: Date;
}): Promise<{ runId: string; stepsScheduled: number } | { error: string }> {
  const def = getWorkflowDefinition(opts.workflowKey);
  if (!def) return { error: 'Unknown workflow' };

  const runId = opts.generateId();
  const base = opts.baseTime || new Date();

  await opts.db.prepare(
    `INSERT INTO crm_workflow_runs (id, org_id, workflow_key, client_id, lead_id, context_json, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
  ).bind(
    runId, opts.orgId, opts.workflowKey, opts.clientId || null, opts.leadId || null,
    JSON.stringify(opts.context || {}),
  ).run();

  let idx = 0;
  for (const step of def.steps) {
    const stepId = opts.generateId();
    const runAt = new Date(base.getTime() + step.delayHours * 3600000).toISOString();
    await opts.db.prepare(
      `INSERT INTO crm_workflow_steps (id, org_id, run_id, step_index, action_type, action_json, lane, channel, run_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    ).bind(
      stepId, opts.orgId, runId, idx, step.action,
      JSON.stringify(step),
      step.lane || def.lane,
      step.action === 'sms' ? 'sms' : step.action === 'email' ? 'email' : null,
      runAt,
    ).run();
    idx += 1;
  }

  return { runId, stepsScheduled: def.steps.length };
}

function renderTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] || '');
}

async function loadContext(db: D1Database, orgId: string, clientId?: string, leadId?: string, extra?: Record<string, string>): Promise<Record<string, string>> {
  const vars: Record<string, string> = { ...extra };
  const org = await db.prepare('SELECT name, settings FROM organizations WHERE id = ?').bind(orgId).first() as any;
  vars.org_name = org?.name || 'Smart FCRA';
  if (clientId) {
    const c = await db.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, orgId).first() as any;
    if (c) {
      vars.first_name = c.first_name || '';
      vars.last_name = c.last_name || '';
      vars.email = c.email || '';
      vars.portal_link = extra?.portal_link || '/app';
      vars.scheduling_link = extra?.scheduling_link || '/app';
    }
  }
  if (leadId) {
    const l = await db.prepare('SELECT * FROM brand_leads WHERE id = ?').bind(leadId).first() as any;
    if (l) {
      vars.first_name = l.first_name || vars.first_name || '';
      vars.last_name = l.last_name || vars.last_name || '';
      vars.email = l.email || vars.email || '';
    }
  }
  return vars;
}

export async function executeWorkflowStep(opts: {
  db: D1Database;
  env: any;
  step: any;
  run: any;
  generateId: () => string;
}): Promise<{ ok: boolean; detail?: string }> {
  const action = JSON.parse(opts.step.action_json || '{}');
  const def = getWorkflowDefinition(opts.run.workflow_key) as WorkflowDefinition | undefined;
  const lane = (opts.step.lane || def?.lane || 'transactional') as CommsLane;
  const ctx = await loadContext(
    opts.db, opts.run.org_id, opts.run.client_id, opts.run.lead_id,
    JSON.parse(opts.run.context_json || '{}'),
  );

  if (action.action === 'freeze_marketing') {
    if (opts.run.client_id) {
      await opts.db.prepare(
        `UPDATE clients SET comms_frozen = 1, comms_freeze_reason = ?, updated_at = datetime('now')
         WHERE id = ? AND org_id = ?`,
      ).bind(`Workflow ${opts.run.workflow_key} marketing freeze`, opts.run.client_id, opts.run.org_id).run();
    }
    return { ok: true, detail: 'marketing_frozen' };
  }

  if (action.action === 'stage_change' && action.targetStage && opts.run.client_id) {
    await transitionLifecycle({
      db: opts.db,
      orgId: opts.run.org_id,
      clientId: opts.run.client_id,
      stage: action.targetStage as LifecycleStage,
      reason: `workflow:${opts.run.workflow_key}`,
    });
    return { ok: true, detail: `stage:${action.targetStage}` };
  }

  if (action.action === 'task') {
    const taskId = opts.generateId();
    if (opts.run.client_id) {
      await opts.db.prepare(
        `INSERT INTO client_tasks (id, org_id, client_id, task_type, title, priority, status)
         VALUES (?, ?, ?, 'workflow', ?, ?, 'open')`,
      ).bind(taskId, opts.run.org_id, opts.run.client_id, action.taskTitle || 'Review required', action.taskPriority || 'normal').run();
    } else {
      await opts.db.prepare(
        `INSERT INTO staff_action_queue (id, org_id, lead_id, action_type, title, priority, status, source)
         VALUES (?, ?, ?, 'workflow_task', ?, ?, 'open', ?)`,
      ).bind(taskId, opts.run.org_id, opts.run.lead_id, action.taskTitle || 'Follow up', action.taskPriority || 'P3', opts.run.workflow_key).run();
    }
    return { ok: true, detail: 'task_created' };
  }

  if (action.action === 'push' && opts.run.client_id) {
    const { sendPushToClient } = await import('./push-notifications');
    const title = renderTemplate(action.pushTitle || action.subject || 'Update from {{org_name}}', ctx);
    const body = renderTemplate(action.pushBody || action.bodyTemplate || '', ctx);
    await sendPushToClient(opts.db, {
      orgId: opts.run.org_id,
      clientId: opts.run.client_id,
      title,
      body,
      eventType: `workflow.${opts.run.workflow_key}`,
    });
    return { ok: true, detail: 'push_sent' };
  }

  const email = ctx.email;
  const phone = ctx.phone_e164 || ctx.phone;

  if (action.action === 'email' && email) {
    const subject = renderTemplate(action.subject || 'Message from {{org_name}}', ctx);
    const body = renderTemplate(action.bodyTemplate || '', ctx);
    const gate = await canSendMessage({
      db: opts.db,
      orgId: opts.run.org_id,
      clientId: opts.run.client_id,
      leadId: opts.run.lead_id,
      email,
      lane,
      channel: 'email',
      templateId: action.templateKey,
      workflowRunId: opts.run.id,
    });
    const attemptId = opts.generateId();
    await logCommunicationAttempt(opts.db, {
      ...gate,
      id: attemptId,
      db: opts.db,
      orgId: opts.run.org_id,
      clientId: opts.run.client_id,
      leadId: opts.run.lead_id,
      email,
      lane,
      channel: 'email',
      templateId: action.templateKey,
      workflowRunId: opts.run.id,
      renderedSubject: subject,
      sent: false,
    });
    if (!gate.allowed) return { ok: false, detail: gate.reasons.join('; ') };
    await sendAppEmail(opts.env, { to: email, subject, text: body });
    await opts.db.prepare('UPDATE communication_attempts SET sent = 1, provider_status = ? WHERE id = ?')
      .bind('sent', attemptId).run();
    return { ok: true, detail: 'email_sent' };
  }

  if (action.action === 'sms' && phone) {
    const body = renderTemplate(action.bodyTemplate || '', ctx);
    const gate = await canSendMessage({
      db: opts.db,
      orgId: opts.run.org_id,
      clientId: opts.run.client_id,
      leadId: opts.run.lead_id,
      phone,
      lane,
      channel: 'sms',
      workflowRunId: opts.run.id,
    });
    const attemptId = opts.generateId();
    await logCommunicationAttempt(opts.db, {
      ...gate,
      id: attemptId,
      db: opts.db,
      orgId: opts.run.org_id,
      clientId: opts.run.client_id,
      leadId: opts.run.lead_id,
      phone,
      lane,
      channel: 'sms',
      workflowRunId: opts.run.id,
      sent: false,
    });
    if (!gate.allowed) return { ok: false, detail: gate.reasons.join('; ') };
    const sms = await sendSms(opts.env, phone, body);
    await opts.db.prepare('UPDATE communication_attempts SET sent = ?, provider_status = ? WHERE id = ?')
      .bind(sms.sent ? 1 : 0, sms.sent ? 'sent' : sms.error || 'failed', attemptId).run();
    return { ok: sms.sent, detail: sms.sent ? 'sms_sent' : sms.error };
  }

  return { ok: true, detail: 'no_op' };
}

export async function processDueWorkflowSteps(opts: {
  db: D1Database;
  env: any;
  generateId: () => string;
  limit?: number;
}): Promise<{ processed: number; failed: number }> {
  const rows = await opts.db.prepare(
    `SELECT s.*, r.workflow_key, r.client_id, r.lead_id, r.context_json, r.org_id as run_org_id
     FROM crm_workflow_steps s
     JOIN crm_workflow_runs r ON r.id = s.run_id
     WHERE s.status = 'pending' AND s.run_at <= datetime('now') AND r.status = 'active'
     ORDER BY s.run_at ASC LIMIT ?`,
  ).bind(opts.limit || 50).all();

  let processed = 0;
  let failed = 0;
  for (const step of rows.results || []) {
    const run = {
      id: step.run_id,
      workflow_key: step.workflow_key,
      client_id: step.client_id,
      lead_id: step.lead_id,
      context_json: step.context_json,
      org_id: step.run_org_id || step.org_id,
    };
    try {
      const result = await executeWorkflowStep({ db: opts.db, env: opts.env, step, run, generateId: opts.generateId });
      await opts.db.prepare(
        `UPDATE crm_workflow_steps SET status = ?, result_json = ?, executed_at = datetime('now') WHERE id = ?`,
      ).bind(result.ok ? 'completed' : 'failed', JSON.stringify(result), step.id).run();
      if (result.ok) processed += 1;
      else failed += 1;
    } catch (err: any) {
      failed += 1;
      await opts.db.prepare(
        `UPDATE crm_workflow_steps SET status = 'failed', result_json = ?, executed_at = datetime('now') WHERE id = ?`,
      ).bind(JSON.stringify({ error: String(err?.message || err) }), step.id).run();
    }
  }
  return { processed, failed };
}

export async function stopWorkflowRunsForClient(db: D1Database, orgId: string, clientId: string, reason: string): Promise<void> {
  await db.prepare(
    `UPDATE crm_workflow_runs SET status = 'stopped', stopped_reason = ?, completed_at = datetime('now')
     WHERE org_id = ? AND client_id = ? AND status = 'active'`,
  ).bind(reason, orgId, clientId).run();
  await db.prepare(
    `UPDATE crm_workflow_steps SET status = 'cancelled'
     WHERE run_id IN (SELECT id FROM crm_workflow_runs WHERE org_id = ? AND client_id = ? AND status = 'stopped')
     AND status = 'pending'`,
  ).bind(orgId, clientId).run();
}
