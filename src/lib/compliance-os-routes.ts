/**
 * Smart FCRA Compliance OS API — lifecycle, workflows, suppression, integrations, tasks.
 */
import type { Hono } from 'hono';
import { generateId } from './auth';
import {
  canSendMessage,
  logCommunicationAttempt,
  recordConsentEvidence,
  revokeMarketingConsent,
  isMarketingOptOutMessage,
  type CommsLane,
} from './comms-compliance';
import { listWorkflowLibrary, getWorkflowDefinition } from '../data/crm-campaign-library';
import { startWorkflowRun, processDueWorkflowSteps, stopWorkflowRunsForClient } from './crm-workflow-engine';
import {
  LIFECYCLE_STAGES,
  transitionLifecycle,
  salesOutcomeWorkflow,
  type LifecycleStage,
  type SalesOutcome,
} from './lifecycle-engine';
import {
  integrationsStatusView,
  saveOrgIntegrations,
  mergeGhlEnv,
  orgGhlConfigured,
  resolveOrgMfsnCredentials,
} from './org-integrations';
import { reconcileMfsnMembersToClients } from './mfsn-reconcile';
import { ensureCustomFields, syncClientToGhl, verifyGhlConnection, clearGhlFieldCache } from './ghl-client';
import { portalBaseUrl } from './portal-services';

type RegisterOpts = { authMiddleware: any };

function staffOnly(user: any): string | null {
  if (!user || user.role === 'client') return 'Staff access required';
  return null;
}

export function registerComplianceOsRoutes(app: Hono<any>, opts: RegisterOpts) {
  const { authMiddleware } = opts;

  // ── Compliance OS overview ──────────────────────────────
  app.get('/api/compliance-os/overview', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);

    const [attempts, runs, tasks, escalations, complaints] = await Promise.all([
      c.env.DB.prepare(
        'SELECT decision, COUNT(*) as c FROM communication_attempts WHERE org_id = ? AND created_at >= datetime(\'now\', \'-7 days\') GROUP BY decision',
      ).bind(user.org_id).all().catch(() => ({ results: [] })),
      c.env.DB.prepare(
        'SELECT status, COUNT(*) as c FROM crm_workflow_runs WHERE org_id = ? GROUP BY status',
      ).bind(user.org_id).all().catch(() => ({ results: [] })),
      c.env.DB.prepare(
        'SELECT status, COUNT(*) as c FROM staff_action_queue WHERE org_id = ? AND status = \'open\' GROUP BY priority',
      ).bind(user.org_id).all().catch(() => ({ results: [] })),
      c.env.DB.prepare(
        'SELECT COUNT(*) as c FROM escalation_queue WHERE org_id = ? AND status = \'pending\'',
      ).bind(user.org_id).first().catch(() => ({ c: 0 })),
      c.env.DB.prepare(
        'SELECT COUNT(*) as c FROM support_complaints WHERE org_id = ? AND status NOT IN (\'resolved\', \'closed\')',
      ).bind(user.org_id).first().catch(() => ({ c: 0 })),
    ]);

    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    let settings = {};
    try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }

    return c.json({
      lanes: ['marketing', 'transactional', 'compliance'],
      lifecycleStages: LIFECYCLE_STAGES,
      commsLast7Days: attempts.results || [],
      workflowRuns: runs.results || [],
      openStaffTasks: tasks.results || [],
      pendingEscalations: Number((escalations as any)?.c || 0),
      openComplaints: Number((complaints as any)?.c || 0),
      integrations: integrationsStatusView(settings, c.env),
      campaignLibraryCount: listWorkflowLibrary().length,
    });
  });

  // ── Workflow library ────────────────────────────────────
  app.get('/api/compliance-os/workflows', authMiddleware, async (c) => {
    if (staffOnly(c.get('user'))) return c.json({ error: 'Staff only' }, 403);
    return c.json({ workflows: listWorkflowLibrary() });
  });

  app.get('/api/compliance-os/workflows/:key', authMiddleware, async (c) => {
    if (staffOnly(c.get('user'))) return c.json({ error: 'Staff only' }, 403);
    const def = getWorkflowDefinition(c.req.param('key'));
    if (!def) return c.json({ error: 'Not found' }, 404);
    return c.json({ workflow: def });
  });

  app.post('/api/compliance-os/workflows/:key/start', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const result = await startWorkflowRun({
      db: c.env.DB,
      env: c.env,
      orgId: user.org_id,
      workflowKey: c.req.param('key'),
      clientId: body.clientId,
      leadId: body.leadId,
      context: body.context,
      generateId,
    });
    if ('error' in result) return c.json({ error: result.error }, 400);
    return c.json({ ok: true, ...result });
  });

  // ── Lifecycle ───────────────────────────────────────────
  app.post('/api/clients/:id/lifecycle', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    await transitionLifecycle({
      db: c.env.DB,
      orgId: user.org_id,
      clientId: c.req.param('id'),
      stage: body.stage as LifecycleStage,
      actorId: user.id,
      reason: body.reason,
    });
    return c.json({ ok: true, stage: body.stage });
  });

  app.post('/api/clients/:id/sales-outcome', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const outcome = body.outcome as SalesOutcome;
    const workflowKey = salesOutcomeWorkflow(outcome);

    if (outcome === 'do_not_contact') {
      await revokeMarketingConsent(c.env.DB, {
        orgId: user.org_id,
        clientId: c.req.param('id'),
        channel: 'all',
        source: 'sales_outcome',
      });
      await c.env.DB.prepare(
        `INSERT INTO do_not_contact_records (id, org_id, client_id, channel, consent_source, status, created_by)
         VALUES (?, ?, ?, 'all', 'sales_outcome', 'active', ?)`,
      ).bind(generateId(), user.org_id, c.req.param('id'), user.id).run();
      await stopWorkflowRunsForClient(c.env.DB, user.org_id, c.req.param('id'), 'do_not_contact');
    }

    if (workflowKey) {
      await startWorkflowRun({
        db: c.env.DB,
        env: c.env,
        orgId: user.org_id,
        workflowKey,
        clientId: c.req.param('id'),
        context: body.context,
        generateId,
      });
    }

    return c.json({ ok: true, outcome, workflowStarted: workflowKey });
  });

  // ── Pre-send gate check (staff QA) ──────────────────────
  app.post('/api/compliance-os/can-send', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const result = await canSendMessage({
      db: c.env.DB,
      orgId: user.org_id,
      clientId: body.clientId,
      leadId: body.leadId,
      email: body.email,
      phone: body.phone,
      lane: body.lane as CommsLane,
      channel: body.channel || 'email',
      templateId: body.templateId,
      campaignId: body.campaignId,
    });
    return c.json(result);
  });

  // ── Consent evidence ────────────────────────────────────
  app.post('/api/compliance-os/consent', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const id = generateId();
    await recordConsentEvidence(c.env.DB, {
      id,
      orgId: user.org_id,
      clientId: body.clientId,
      leadId: body.leadId,
      channel: body.channel,
      purpose: body.purpose,
      languageVersion: body.languageVersion || '2026.08.1',
      exactLanguage: body.exactLanguage,
      sourceForm: body.sourceForm,
      createdBy: user.id,
    });
    if (body.clientId && body.purpose === 'marketing') {
      const col = body.channel === 'sms' ? 'marketing_sms_consent'
        : body.channel === 'phone' ? 'marketing_call_consent' : 'marketing_email_consent';
      await c.env.DB.prepare(
        `UPDATE clients SET ${col} = 1, updated_at = datetime('now') WHERE id = ? AND org_id = ?`,
      ).bind(body.clientId, user.org_id).run();
    }
    return c.json({ ok: true, id });
  });

  app.post('/api/compliance-os/consent/revoke', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    await revokeMarketingConsent(c.env.DB, {
      orgId: user.org_id,
      clientId: body.clientId,
      leadId: body.leadId,
      channel: body.channel || 'all',
      source: body.source || 'staff',
    });
    return c.json({ ok: true });
  });

  // ── Leads + auto workflow ───────────────────────────────
  app.post('/api/leads', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO brand_leads (id, org_id, form_id, email, phone, first_name, last_name, payload_json,
        source_url, status, lifecycle_stage, utm_source, utm_campaign, utm_medium, affiliate_id,
        marketing_email_consent, marketing_sms_consent, assigned_to)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', 'lead', ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, user.org_id, body.formId || 'manual', body.email, body.phone,
      body.firstName, body.lastName, JSON.stringify(body.payload || {}),
      body.sourceUrl, body.utmSource, body.utmCampaign, body.utmMedium, body.affiliateId,
      body.marketingEmailConsent ? 1 : 0, body.marketingSmsConsent ? 1 : 0, body.assignedTo || user.id,
    ).run();

    if (body.marketingEmailConsent || body.marketingSmsConsent) {
      for (const ch of ['email', 'sms'] as const) {
        if ((ch === 'email' && body.marketingEmailConsent) || (ch === 'sms' && body.marketingSmsConsent)) {
          await recordConsentEvidence(c.env.DB, {
            id: generateId(),
            orgId: user.org_id,
            leadId: id,
            channel: ch,
            purpose: 'marketing',
            languageVersion: body.consentVersion || '2026.08.1',
            exactLanguage: body.consentLanguage,
            createdBy: user.id,
          });
        }
      }
    }

    const wf = await startWorkflowRun({
      db: c.env.DB,
      env: c.env,
      orgId: user.org_id,
      workflowKey: 'new_lead',
      leadId: id,
      context: {
        scheduling_link: body.schedulingLink || `${portalBaseUrl(c.env)}/demo`,
        portal_link: portalBaseUrl(c.env),
      },
      generateId,
    });

    await startWorkflowRun({
      db: c.env.DB,
      env: c.env,
      orgId: user.org_id,
      workflowKey: 'lead_followup',
      leadId: id,
      context: { scheduling_link: body.schedulingLink || `${portalBaseUrl(c.env)}/demo` },
      generateId,
    }).catch(() => { /* soft */ });

    return c.json({ ok: true, id, workflow: wf });
  });

  app.get('/api/leads', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const rows = await c.env.DB.prepare(
      'SELECT * FROM brand_leads WHERE org_id = ? ORDER BY created_at DESC LIMIT 100',
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ leads: rows.results || [] });
  });

  // ── Staff action queue (Next Best Action) ───────────────
  app.get('/api/compliance-os/actions', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const rows = await c.env.DB.prepare(
      `SELECT * FROM staff_action_queue WHERE org_id = ? AND status = 'open'
       ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 WHEN 'P2' THEN 2 WHEN 'P3' THEN 3 ELSE 4 END, due_at ASC
       LIMIT 50`,
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ actions: rows.results || [] });
  });

  app.patch('/api/compliance-os/actions/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    await c.env.DB.prepare(
      `UPDATE staff_action_queue SET status = ?, completed_at = datetime('now') WHERE id = ? AND org_id = ?`,
    ).bind(body.status || 'completed', c.req.param('id'), user.org_id).run();
    return c.json({ ok: true });
  });

  // ── Client tasks ────────────────────────────────────────
  app.get('/api/clients/:id/tasks', authMiddleware, async (c) => {
    const rows = await c.env.DB.prepare(
      'SELECT * FROM client_tasks WHERE client_id = ? AND org_id = ? ORDER BY due_at ASC, created_at DESC',
    ).bind(c.req.param('id'), c.get('user').org_id).all().catch(() => ({ results: [] }));
    return c.json({ tasks: rows.results || [] });
  });

  // ── Per-org integrations (GHL / MFSN tokens) ────────────
  app.get('/api/settings/integrations', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    let settings = {};
    try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
    return c.json(integrationsStatusView(settings, c.env));
  });

  app.put('/api/settings/integrations', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const merged = await saveOrgIntegrations(c.env.DB, user.org_id, body);
    return c.json({ ok: true, integrations: integrationsStatusView({ integrations: merged }, c.env) });
  });

  app.post('/api/integrations/mfsn/reconcile-clients', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const org = await c.env.DB.prepare('SELECT name, settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    let settings = {};
    try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
    const result = await reconcileMfsnMembersToClients({
      db: c.env.DB,
      env: c.env,
      orgId: user.org_id,
      orgSettings: settings,
      orgName: org?.name,
      list: body.list === 'paused' ? 'paused' : 'active',
      generateId,
      syncGhl: body.syncGhl !== false,
    });
    return c.json({ ok: true, ...result });
  });

  app.post('/api/integrations/ghl/test-org', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    let settings = {};
    try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
    const ghlEnv = mergeGhlEnv(c.env, settings);
    clearGhlFieldCache();
    const verify = await verifyGhlConnection(ghlEnv);
    return c.json({
      ok: verify.ok,
      configured: orgGhlConfigured(c.env, settings),
      verify,
    });
  });

  // ── Inbound SMS opt-out webhook stub ─────────────────────
  app.post('/api/webhooks/sms/inbound', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const text = body.Body || body.body || '';
    const from = body.From || body.from;
    if (!isMarketingOptOutMessage(text) || !from) {
      return c.json({ ok: true, action: 'ignored' });
    }
    const phone = String(from).replace(/\D/g, '').slice(-10);
    const clients = await c.env.DB.prepare(
      `SELECT id, org_id FROM clients WHERE phone_e164 LIKE ? OR phone LIKE ? LIMIT 5`,
    ).bind(`%${phone}`, `%${phone}`).all();
    for (const client of clients.results || []) {
      await revokeMarketingConsent(c.env.DB, {
        orgId: (client as any).org_id,
        clientId: (client as any).id,
        channel: 'sms',
        source: 'sms_stop',
      });
      await c.env.DB.prepare(
        `INSERT INTO do_not_contact_records (id, org_id, client_id, channel, consent_source, status, created_by)
         VALUES (?, ?, ?, 'sms', 'sms_stop', 'active', 'system')`,
      ).bind(generateId(), (client as any).org_id, (client as any).id).run();
    }
    return c.json({ ok: true, action: 'marketing_suppressed', count: (clients.results || []).length });
  });
}

export { processDueWorkflowSteps, logCommunicationAttempt, canSendMessage };
