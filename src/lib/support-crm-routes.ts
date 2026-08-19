/**
 * Customer Service / CRM compliance APIs + integrations (API keys, webhooks).
 */
import type { Hono } from 'hono';
import { generateId } from './auth';
import { generateApiKeyMaterial, hashApiKey, parseApiKeyScopes, scopesAllow } from './api-keys';
import {
  emitOrgWebhook,
  generateWebhookSecret,
  parseWebhookEvents,
  WEBHOOK_EVENTS,
  type WebhookEventType,
} from './outbound-webhooks';
import { startWorkflowRun } from './crm-workflow-engine';
import { getClick2MailAccountAddresses, click2mailConfigured } from './click2mail';
import {
  detectRedFlagTerms,
  supportPlaybookPayload,
  COMPLAINT_CLASSIFICATIONS,
  SUPPORT_DISPOSITIONS,
} from '../data/support-playbook';

type RegisterOpts = {
  authMiddleware: any;
  apiKeyMiddleware?: any;
};

function staffOnly(user: any): string | null {
  if (!user || user.role === 'client') return 'Staff access required';
  return null;
}

function ticketNumber(orgId: string): string {
  return `TKT-${orgId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

function complaintNumber(orgId: string): string {
  return `CMP-${orgId.slice(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

async function tableExists(db: D1Database, table: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
  ).bind(table).first().catch(() => null);
  return !!row;
}

export function registerSupportCrmRoutes(app: Hono<any>, opts: RegisterOpts) {
  const { authMiddleware } = opts;

  app.get('/api/support/playbook', authMiddleware, async (c) => {
    const user = c.get('user');
    const blocked = staffOnly(user);
    if (blocked) return c.json({ error: blocked }, 403);
    return c.json(supportPlaybookPayload());
  });

  app.get('/api/support/dispositions', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    return c.json({ dispositions: SUPPORT_DISPOSITIONS, complaintClassifications: COMPLAINT_CLASSIFICATIONS });
  });

  // ── Tickets ─────────────────────────────────────────────
  app.get('/api/support/tickets', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    if (!(await tableExists(c.env.DB, 'support_tickets'))) {
      return c.json({ error: 'Migration 0026 required', code: 'MIGRATION_REQUIRED' }, 503);
    }
    const status = c.req.query('status');
    const clientId = c.req.query('clientId');
    let sql = `SELECT t.*, c.first_name, c.last_name, c.email FROM support_tickets t
      LEFT JOIN clients c ON c.id = t.client_id WHERE t.org_id = ?`;
    const binds: any[] = [user.org_id];
    if (status) { sql += ' AND t.status = ?'; binds.push(status); }
    if (clientId) { sql += ' AND t.client_id = ?'; binds.push(clientId); }
    sql += ' ORDER BY t.created_at DESC LIMIT 200';
    const rows = await c.env.DB.prepare(sql).bind(...binds).all();
    return c.json({ tickets: rows.results || [] });
  });

  app.post('/api/support/tickets', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    if (!(await tableExists(c.env.DB, 'support_tickets'))) {
      return c.json({ error: 'Migration 0026 required', code: 'MIGRATION_REQUIRED' }, 503);
    }
    const body = await c.req.json().catch(() => ({}));
    const id = generateId();
    const num = ticketNumber(user.org_id);
    const redFlags = detectRedFlagTerms(
      [body.summary, body.factsText, body.subject].filter(Boolean).join(' '),
    );
    await c.env.DB.prepare(
      `INSERT INTO support_tickets (id, org_id, client_id, ticket_number, channel, status, priority, disposition, subject, summary,
        facts_text, action_text, result_text, next_step_text, escalation_level, assigned_to, verified_identity, recording_disclosed, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, user.org_id, body.clientId || null, num,
      body.channel || 'phone', body.status || 'open', body.priority || 'normal',
      body.disposition || null, body.subject || null, body.summary || null,
      body.factsText || null, body.actionText || null, body.resultText || null, body.nextStepText || null,
      Number(body.escalationLevel || 1), body.assignedTo || null,
      body.verifiedIdentity ? 1 : 0, body.recordingDisclosed == null ? null : (body.recordingDisclosed ? 1 : 0),
      user.id,
    ).run();

    if (body.interactionBody) {
      await c.env.DB.prepare(
        `INSERT INTO support_interactions (id, org_id, ticket_id, client_id, interaction_type, direction, body, red_flag_terms_json, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        generateId(), user.org_id, id, body.clientId || null,
        body.interactionType || 'note', body.direction || 'inbound', body.interactionBody,
        JSON.stringify(redFlags), user.id,
      ).run();
    }

    await c.env.DB.prepare(
      `INSERT INTO activity_log (id, org_id, client_id, user_id, action, description) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(generateId(), user.org_id, body.clientId || null, user.id, 'support_ticket_created', `Ticket ${num} · ${body.disposition || 'open'}`).run();

    emitOrgWebhook(c.env.DB, {
      orgId: user.org_id,
      eventType: 'ticket.created',
      payload: { ticketId: id, ticketNumber: num, clientId: body.clientId || null, disposition: body.disposition || null },
    }).catch(() => null);

    return c.json({ ok: true, id, ticketNumber: num, redFlags });
  });

  app.patch('/api/support/tickets/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const id = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const existing = await c.env.DB.prepare(
      'SELECT * FROM support_tickets WHERE id = ? AND org_id = ?',
    ).bind(id, user.org_id).first();
    if (!existing) return c.json({ error: 'Ticket not found' }, 404);

    await c.env.DB.prepare(
      `UPDATE support_tickets SET status = COALESCE(?, status), disposition = COALESCE(?, disposition),
        summary = COALESCE(?, summary), facts_text = COALESCE(?, facts_text), action_text = COALESCE(?, action_text),
        result_text = COALESCE(?, result_text), next_step_text = COALESCE(?, next_step_text),
        escalation_level = COALESCE(?, escalation_level), assigned_to = COALESCE(?, assigned_to),
        resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE resolved_at END,
        updated_at = datetime('now') WHERE id = ? AND org_id = ?`,
    ).bind(
      body.status || null, body.disposition || null, body.summary || null,
      body.factsText || null, body.actionText || null, body.resultText || null, body.nextStepText || null,
      body.escalationLevel != null ? Number(body.escalationLevel) : null, body.assignedTo || null,
      body.status || null, id, user.org_id,
    ).run();

    return c.json({ ok: true });
  });

  app.get('/api/support/tickets/:id/interactions', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const id = c.req.param('id');
    const rows = await c.env.DB.prepare(
      'SELECT * FROM support_interactions WHERE ticket_id = ? AND org_id = ? ORDER BY created_at ASC',
    ).bind(id, user.org_id).all();
    return c.json({ interactions: rows.results || [] });
  });

  app.post('/api/support/tickets/:id/interactions', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const ticketId = c.req.param('id');
    const body = await c.req.json().catch(() => ({}));
    const ticket = await c.env.DB.prepare(
      'SELECT * FROM support_tickets WHERE id = ? AND org_id = ?',
    ).bind(ticketId, user.org_id).first() as any;
    if (!ticket) return c.json({ error: 'Ticket not found' }, 404);
    const redFlags = detectRedFlagTerms(body.body || '');
    const iid = generateId();
    await c.env.DB.prepare(
      `INSERT INTO support_interactions (id, org_id, ticket_id, client_id, interaction_type, direction, body, red_flag_terms_json, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      iid, user.org_id, ticketId, ticket.client_id, body.interactionType || 'note',
      body.direction || 'inbound', body.body || '', JSON.stringify(redFlags), user.id,
    ).run();
    return c.json({ ok: true, id: iid, redFlags });
  });

  // ── Complaints ──────────────────────────────────────────
  app.get('/api/support/complaints', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const rows = await c.env.DB.prepare(
      'SELECT * FROM support_complaints WHERE org_id = ? ORDER BY created_at DESC LIMIT 100',
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ complaints: rows.results || [] });
  });

  app.post('/api/support/complaints', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const body = await c.req.json().catch(() => ({}));
    if (!body.allegationSummary) return c.json({ error: 'allegationSummary required' }, 400);
    const id = generateId();
    const num = complaintNumber(user.org_id);
    await c.env.DB.prepare(
      `INSERT INTO support_complaints (id, org_id, client_id, ticket_id, complaint_number, classification, severity, allegation_summary, status, owner_id, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, user.org_id, body.clientId || null, body.ticketId || null, num,
      body.classification || 'Service Dissatisfaction', body.severity || 'medium',
      body.allegationSummary, 'open', body.ownerId || user.id, user.id,
    ).run();

    emitOrgWebhook(c.env.DB, {
      orgId: user.org_id,
      eventType: 'complaint.created',
      payload: { complaintId: id, complaintNumber: num, classification: body.classification },
    }).catch(() => null);

    if (body.clientId) {
      startWorkflowRun({
        db: c.env.DB,
        env: c.env,
        orgId: user.org_id,
        workflowKey: 'complaint_ack',
        clientId: body.clientId,
        context: { complaint_id: num },
        generateId,
      }).catch(() => null);
    }

    return c.json({ ok: true, id, complaintNumber: num });
  });

  // ── Refunds ─────────────────────────────────────────────
  app.post('/api/support/refunds', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const body = await c.req.json().catch(() => ({}));
    if (!body.clientId || !body.reason) return c.json({ error: 'clientId and reason required' }, 400);
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO support_refund_requests (id, org_id, client_id, ticket_id, amount_cents, reason, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, 'requested', ?)`,
    ).bind(id, user.org_id, body.clientId, body.ticketId || null, body.amountCents || null, body.reason, user.id).run();

    emitOrgWebhook(c.env.DB, {
      orgId: user.org_id,
      eventType: 'refund.requested',
      payload: { refundRequestId: id, clientId: body.clientId, reason: body.reason },
    }).catch(() => null);

    return c.json({ ok: true, id });
  });

  // ── Do-not-contact ──────────────────────────────────────
  app.get('/api/support/dnc', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const clientId = c.req.query('clientId');
    let sql = 'SELECT * FROM do_not_contact_records WHERE org_id = ? AND status = ?';
    const binds: any[] = [user.org_id, 'active'];
    if (clientId) { sql += ' AND client_id = ?'; binds.push(clientId); }
    sql += ' ORDER BY created_at DESC';
    const rows = await c.env.DB.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }));
    return c.json({ records: rows.results || [] });
  });

  app.post('/api/support/dnc', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const body = await c.req.json().catch(() => ({}));
    if (!body.channel) return c.json({ error: 'channel required' }, 400);
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO do_not_contact_records (id, org_id, client_id, channel, consent_source, status, permitted_exceptions_json, created_by)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
    ).bind(
      id, user.org_id, body.clientId || null, body.channel, body.consentSource || 'agent',
      JSON.stringify(body.permittedExceptions || []), user.id,
    ).run();
    return c.json({ ok: true, id });
  });

  // ── AI output review ────────────────────────────────────
  app.post('/api/support/ai-reviews', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO ai_output_reviews (id, org_id, client_id, ticket_id, output_type, model_name, finding_id, document_id, suspected_error, source_evidence_json, correspondence_sent, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, user.org_id, body.clientId || null, body.ticketId || null,
      body.outputType || 'finding', body.modelName || null, body.findingId || null, body.documentId || null,
      body.suspectedError || null, JSON.stringify(body.sourceEvidence || {}),
      body.correspondenceSent ? 1 : 0, user.id,
    ).run();
    return c.json({ ok: true, id });
  });

  app.get('/api/support/ai-reviews', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const rows = await c.env.DB.prepare(
      `SELECT * FROM ai_output_reviews WHERE org_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 50`,
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ reviews: rows.results || [] });
  });

  // ── Click2Mail addresses ────────────────────────────────
  app.get('/api/integrations/click2mail/addresses', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    if (!click2mailConfigured(c.env)) {
      return c.json({ configured: false, addresses: [] });
    }
    try {
      const addresses = await getClick2MailAccountAddresses(c.env);
      return c.json({ configured: true, addresses });
    } catch (err: any) {
      return c.json({ configured: true, error: err.message, addresses: [] }, 502);
    }
  });

  // ── API keys ────────────────────────────────────────────
  app.get('/api/integrations/api-keys', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const rows = await c.env.DB.prepare(
      `SELECT id, org_id, name, key_prefix, scopes_json, created_by, last_used_at, revoked_at, created_at
       FROM org_api_keys WHERE org_id = ? ORDER BY created_at DESC`,
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ keys: rows.results || [] });
  });

  app.post('/api/integrations/api-keys', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    const body = await c.req.json().catch(() => ({}));
    const { raw, prefix, hash } = await generateApiKeyMaterial();
    const id = generateId();
    const scopes = JSON.stringify(body.scopes || ['read', 'write']);
    await c.env.DB.prepare(
      `INSERT INTO org_api_keys (id, org_id, name, key_prefix, key_hash, scopes_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, user.org_id, body.name || 'Integration key', prefix, hash, scopes, user.id).run();
    return c.json({ ok: true, id, key: raw, prefix, scopes: JSON.parse(scopes), warning: 'Store this key now — it will not be shown again.' });
  });

  app.delete('/api/integrations/api-keys/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    await c.env.DB.prepare(
      `UPDATE org_api_keys SET revoked_at = datetime('now') WHERE id = ? AND org_id = ?`,
    ).bind(c.req.param('id'), user.org_id).run();
    return c.json({ ok: true });
  });

  // ── Webhooks ────────────────────────────────────────────
  app.get('/api/integrations/webhooks', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const rows = await c.env.DB.prepare(
      `SELECT id, org_id, label, url, events_json, active, created_at, updated_at FROM org_webhook_endpoints WHERE org_id = ? ORDER BY created_at DESC`,
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ webhooks: rows.results || [], availableEvents: WEBHOOK_EVENTS });
  });

  app.post('/api/integrations/webhooks', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    const body = await c.req.json().catch(() => ({}));
    if (!body.url || !body.label) return c.json({ error: 'label and url required' }, 400);
    const id = generateId();
    const secret = generateWebhookSecret();
    const events = JSON.stringify(body.events || ['client.created', 'letter.sent']);
    await c.env.DB.prepare(
      `INSERT INTO org_webhook_endpoints (id, org_id, label, url, secret, events_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, user.org_id, body.label, body.url, secret, events, user.id).run();
    return c.json({ ok: true, id, secret, events: JSON.parse(events), warning: 'Store webhook secret for signature verification.' });
  });

  app.patch('/api/integrations/webhooks/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    const body = await c.req.json().catch(() => ({}));
    await c.env.DB.prepare(
      `UPDATE org_webhook_endpoints SET label = COALESCE(?, label), url = COALESCE(?, url),
        events_json = COALESCE(?, events_json), active = COALESCE(?, active), updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`,
    ).bind(
      body.label || null, body.url || null,
      body.events ? JSON.stringify(body.events) : null,
      body.active == null ? null : (body.active ? 1 : 0),
      c.req.param('id'), user.org_id,
    ).run();
    return c.json({ ok: true });
  });

  app.get('/api/integrations/webhooks/deliveries', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff access required' }, 403);
    const rows = await c.env.DB.prepare(
      `SELECT id, endpoint_id, event_type, response_status, success, created_at FROM org_webhook_deliveries WHERE org_id = ? ORDER BY created_at DESC LIMIT 50`,
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ deliveries: rows.results || [] });
  });

  app.post('/api/integrations/webhooks/test', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }
    const result = await emitOrgWebhook(c.env.DB, {
      orgId: user.org_id,
      eventType: 'client.created',
      payload: { test: true, message: 'Smart FCRA webhook test ping' },
    });
    return c.json({ ok: true, ...result });
  });
}

/** API-key auth for Zapier-style external integrations. */
export async function apiKeyAuthMiddleware(c: any, next: any) {
  const auth = c.req.header('Authorization') || '';
  const raw = auth.replace(/^Bearer\s+/i, '').trim();
  if (!raw.startsWith('sf_live_')) {
    return c.json({ error: 'Invalid API key' }, 401);
  }
  const hash = await hashApiKey(raw);
  const row = await c.env.DB.prepare(
    `SELECT * FROM org_api_keys WHERE key_hash = ? AND revoked_at IS NULL`,
  ).bind(hash).first().catch(() => null) as any;
  if (!row) return c.json({ error: 'Invalid API key' }, 401);

  await c.env.DB.prepare(
    `UPDATE org_api_keys SET last_used_at = datetime('now') WHERE id = ?`,
  ).bind(row.id).run().catch(() => null);

  c.set('apiKey', row);
  c.set('user', {
    id: `apikey:${row.id}`,
    org_id: row.org_id,
    role: 'api',
    scopes: parseApiKeyScopes(row.scopes_json),
  });
  await next();
}

export function registerExternalIntegrationRoutes(app: Hono<any>) {
  app.get('/api/v1/clients', apiKeyAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!scopesAllow(user.scopes, 'read')) return c.json({ error: 'Insufficient scope' }, 403);
    const rows = await c.env.DB.prepare(
      `SELECT id, first_name, last_name, email, phone, status, case_status, created_at FROM clients WHERE org_id = ? ORDER BY created_at DESC LIMIT 100`,
    ).bind(user.org_id).all();
    return c.json({ clients: rows.results || [] });
  });

  app.post('/api/v1/webhooks/zapier/subscribe', apiKeyAuthMiddleware, async (c) => {
    const user = c.get('user');
    if (!scopesAllow(user.scopes, 'webhooks') && !scopesAllow(user.scopes, 'write')) {
      return c.json({ error: 'webhooks scope required' }, 403);
    }
    const body = await c.req.json().catch(() => ({}));
    if (!body.targetUrl) return c.json({ error: 'targetUrl required' }, 400);
    const id = generateId();
    const secret = generateWebhookSecret();
    const events = JSON.stringify(body.events || ['client.created', 'letter.sent', 'report.imported']);
    await c.env.DB.prepare(
      `INSERT INTO org_webhook_endpoints (id, org_id, label, url, secret, events_json, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(id, user.org_id, body.label || 'Zapier', body.targetUrl, secret, events, user.id).run();
    return c.json({ id, secret });
  });
}
