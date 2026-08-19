/**
 * Platform event bus — workflows and integrations subscribe to typed events.
 */
import { emitOrgWebhook, type WebhookEventType } from './outbound-webhooks';

export const PLATFORM_EVENT_TYPES = [
  'lead.created', 'lead.converted', 'appointment.booked', 'appointment.no_show',
  'contract.sent', 'contract.executed', 'consumer.verified',
  'report.received', 'report.imported', 'report.analysis.started', 'report.changed',
  'finding.created', 'finding.approved',
  'letter.approved', 'letter.sent', 'mail.delivered', 'response.received',
  'deadline.approaching', 'payment.failed', 'payment.paid',
  'consumer.cancelled', 'complaint.created', 'privacy.requested',
  'sms.opted_out', 'security.account_takeover_suspected',
  'copy.qa_failed', 'integration.sync_failed', 'integration.health_degraded',
] as const;

export type PlatformEventType = typeof PLATFORM_EVENT_TYPES[number] | WebhookEventType;

export async function publishPlatformEvent(opts: {
  db: D1Database;
  env?: any;
  orgId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  aggregateType?: string;
  aggregateId?: string;
  clientId?: string;
  source?: string;
  actorId?: string;
  idempotencyKey?: string;
  eventId?: string;
  skipAutomations?: boolean;
}): Promise<{ eventId: string; duplicate: boolean }> {
  const eventId = opts.eventId || crypto.randomUUID();

  if (opts.idempotencyKey) {
    const existing = await opts.db.prepare(
      'SELECT id, result_json FROM event_idempotency_keys WHERE org_id = ? AND idempotency_key = ?',
    ).bind(opts.orgId, opts.idempotencyKey).first() as any;
    if (existing) {
      return { eventId: existing.id, duplicate: true };
    }
  }

  await opts.db.prepare(
    `INSERT INTO platform_events (id, org_id, event_type, aggregate_type, aggregate_id, client_id, payload_json, source, actor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    eventId, opts.orgId, opts.eventType,
    opts.aggregateType || null, opts.aggregateId || null, opts.clientId || null,
    JSON.stringify(opts.payload || {}), opts.source || 'system', opts.actorId || null,
  ).run();

  if (opts.idempotencyKey) {
    await opts.db.prepare(
      `INSERT INTO event_idempotency_keys (id, org_id, idempotency_key, event_type, result_json)
       VALUES (?, ?, ?, ?, ?)`,
    ).bind(eventId, opts.orgId, opts.idempotencyKey, opts.eventType, JSON.stringify({ eventId })).run();
  }

  const webhookEvents = [
    'client.created', 'report.imported', 'finding.created', 'letter.sent',
    'ticket.created', 'complaint.created', 'cancellation.requested', 'refund.requested',
  ] as const;
  if ((webhookEvents as readonly string[]).includes(opts.eventType)) {
    await emitOrgWebhook(opts.db, {
      orgId: opts.orgId,
      eventType: opts.eventType as WebhookEventType,
      payload: { ...(opts.payload || {}), clientId: opts.clientId, eventId },
    }).catch(() => null);
  }

  if (!opts.skipAutomations) {
    await dispatchAutomationsForEvent(opts).catch(() => null);
  }

  return { eventId, duplicate: false };
}

async function dispatchAutomationsForEvent(opts: {
  db: D1Database;
  env?: any;
  orgId: string;
  eventType: string;
  payload?: Record<string, unknown>;
  clientId?: string;
}): Promise<void> {
  const rows = await opts.db.prepare(
    `SELECT * FROM automation_definitions WHERE org_id = ? AND status = 'active' AND trigger_event = ? LIMIT 20`,
  ).bind(opts.orgId, opts.eventType).all().catch(() => ({ results: [] }));

  if (!rows.results?.length) return;

  const { parseAutomationRow, evaluateConditions, automationStepsToWorkflow } = await import('./automation-builder');
  const { generateId } = await import('./auth');

  for (const row of rows.results as any[]) {
    const def = parseAutomationRow(row);
    const ctx = { ...(opts.payload || {}), clientId: opts.clientId };
    if (!evaluateConditions(def.conditions, ctx)) continue;

    const steps = automationStepsToWorkflow(def.steps);
    const runId = generateId();
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      await opts.db.prepare(
        `INSERT INTO crm_workflow_steps (id, org_id, run_id, step_index, action_type, action_json, lane, channel, run_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+' || ? || ' hours'), 'pending')`,
      ).bind(
        generateId(), opts.orgId, runId, i, s.action, JSON.stringify(s),
        s.lane || def.lane, s.action === 'sms' ? 'sms' : s.action === 'email' ? 'email' : null,
        s.delayHours || 0,
      ).run();
    }
    await opts.db.prepare(
      `INSERT INTO crm_workflow_runs (id, org_id, workflow_key, client_id, context_json, status)
       VALUES (?, ?, ?, ?, ?, 'active')`,
    ).bind(runId, opts.orgId, `custom:${row.id}`, opts.clientId || null, JSON.stringify(ctx)).run();
  }
}
