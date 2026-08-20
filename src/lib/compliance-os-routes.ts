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
import {
  AUTOMATION_TRIGGER_CATALOG,
  AUTOMATION_STEP_TYPES,
  parseAutomationRow,
  evaluateConditions,
  automationStepsToWorkflow,
} from './automation-builder';
import {
  buildSignatureChecklist,
  evaluateWorkflowGate,
  defaultPacketStatus,
  CLIENT_SIGNATURE_PACKET,
  CROA_STATUTORY_DISCLOSURE_1679c,
  type ClientPacketStatus,
} from '../engine/client-signature-packet';
import { COMMS_STARTER_LIBRARY, listCommsStarters } from '../data/comms-template-library';
import { generateOrgAiText } from './platform-extensions';
import { buildClientTimeline, appendTimelineEvent } from './client-timeline';
import {
  getCommunicationPreferences,
  saveCommunicationPreferences,
} from './communication-preferences';
import {
  transitionCampaignApproval,
  simulateCampaignSuppression,
  APPROVAL_TRANSITIONS,
} from './campaign-approval';
import {
  canPlaceMarketingCall,
  recordingPolicyForState,
  DEFAULT_CALL_RECORDING_POLICIES,
} from './calling-hours';
import {
  processGhlInboundWebhook,
  resolveOrgIdFromGhlLocation,
  verifyGhlWebhookSignature,
  ghlIdempotencyKey,
  checkGhlWebhookIdempotency,
  type GhlWebhookPayload,
} from './ghl-inbound';
import { registerPushSubscription } from './push-notifications';

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

  // ── Copy QA phrase scan ─────────────────────────────────
  app.post('/api/compliance-os/scan-copy', authMiddleware, async (c) => {
    const user = c.get('user');
    const staffErr = staffOnly(user);
    if (staffErr) return c.json({ error: staffErr }, 403);
    const body = await c.req.json().catch(() => ({}));
    const { scanOutboundCopy } = await import('./copy-qa');
    const scan = scanOutboundCopy(String(body.text || ''), { strict: !!body.strict });
    return c.json({ ok: true, scan });
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

    const { publishPlatformEvent } = await import('./event-bus');
    await publishPlatformEvent({
      db: c.env.DB,
      env: c.env,
      orgId: user.org_id,
      eventType: 'lead.created',
      payload: { leadId: id, email: body.email },
      aggregateType: 'lead',
      aggregateId: id,
      actorId: user.id,
      idempotencyKey: `lead.created:${id}`,
    }).catch(() => null);

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
    const org = await c.env.DB.prepare('SELECT name FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    const { loadOrgSettingsWithVault } = await import('./integration-hub');
    const settings = await loadOrgSettingsWithVault(c.env.DB, user.org_id, c.env.PII_ENCRYPTION_KEY);
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

  // ── Client timeline ─────────────────────────────────────
  app.get('/api/clients/:id/timeline', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const events = await buildClientTimeline(c.env.DB, user.org_id, c.req.param('id'));
    return c.json({ events });
  });

  // ── Communication preferences (staff view) ──────────────
  app.get('/api/clients/:id/communication-preferences', authMiddleware, async (c) => {
    const user = c.get('user');
    const prefs = await getCommunicationPreferences(c.env.DB, user.org_id, c.req.param('id'));
    return c.json({ preferences: prefs });
  });

  app.put('/api/clients/:id/communication-preferences', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    await saveCommunicationPreferences(c.env.DB, {
      id: generateId(),
      orgId: user.org_id,
      clientId: c.req.param('id'),
      prefs: body,
    });
    return c.json({ ok: true });
  });

  // ── Client portal: preferences + push + timeline ────────
  app.get('/api/client-portal/communication-preferences', authMiddleware, async (c) => {
    const user = c.get('user');
    if (!user.client_id) return c.json({ error: 'Client only' }, 403);
    const prefs = await getCommunicationPreferences(c.env.DB, user.org_id, user.client_id);
    return c.json({ preferences: prefs });
  });

  app.put('/api/client-portal/communication-preferences', authMiddleware, async (c) => {
    const user = c.get('user');
    if (!user.client_id) return c.json({ error: 'Client only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    await saveCommunicationPreferences(c.env.DB, {
      id: generateId(),
      orgId: user.org_id,
      clientId: user.client_id,
      prefs: body,
    });
    return c.json({ ok: true });
  });

  app.get('/api/client-portal/timeline', authMiddleware, async (c) => {
    const user = c.get('user');
    if (!user.client_id) return c.json({ error: 'Client only' }, 403);
    const events = await buildClientTimeline(c.env.DB, user.org_id, user.client_id, 80);
    return c.json({ events });
  });

  app.post('/api/client-portal/push/subscribe', authMiddleware, async (c) => {
    const user = c.get('user');
    if (!user.client_id) return c.json({ error: 'Client only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    if (!body.endpoint) return c.json({ error: 'endpoint required' }, 400);
    await registerPushSubscription(c.env.DB, {
      id: generateId(),
      orgId: user.org_id,
      clientId: user.client_id,
      endpoint: body.endpoint,
      keys: body.keys,
      userAgent: c.req.header('user-agent') || undefined,
    });
    return c.json({ ok: true });
  });

  // ── Custom automations (visual builder storage) ─────────
  app.get('/api/compliance-os/automation-catalog', authMiddleware, async (c) => {
    if (staffOnly(c.get('user'))) return c.json({ error: 'Staff only' }, 403);
    return c.json({ triggers: AUTOMATION_TRIGGER_CATALOG, stepTypes: AUTOMATION_STEP_TYPES });
  });

  app.get('/api/compliance-os/automations', authMiddleware, async (c) => {
    const user = c.get('user');
    const rows = await c.env.DB.prepare(
      'SELECT * FROM automation_definitions WHERE org_id = ? ORDER BY updated_at DESC LIMIT 50',
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ automations: (rows.results || []).map(parseAutomationRow) });
  });

  app.post('/api/compliance-os/automations', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const steps = body.steps || [];
    const copyParts = steps
      .filter((s: any) => s.bodyTemplate || s.subject || s.pushBody || s.pushTitle)
      .map((s: any) => [s.subject, s.bodyTemplate, s.pushTitle, s.pushBody].filter(Boolean).join('\n'))
      .join('\n');
    if (copyParts.trim()) {
      const { assertCopyApprovedForSend } = await import('./copy-qa');
      const qa = assertCopyApprovedForSend(copyParts);
      if (!qa.ok && body.requireQaPass !== false) {
        return c.json({ error: qa.error, scan: qa.scan }, 400);
      }
    }
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO automation_definitions (id, org_id, name, description, trigger_event, conditions_json, steps_json, lane, category, status, mandatory_controls, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?)`,
    ).bind(
      id, user.org_id, body.name || 'Custom automation', body.description || '',
      body.triggerEvent || 'custom.manual',
      JSON.stringify(body.conditions || []),
      JSON.stringify(body.steps || []),
      body.lane || 'transactional', body.category || 'custom', user.id,
    ).run();
    return c.json({ ok: true, id });
  });

  app.post('/api/compliance-os/automations/:id/activate', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
    const row = await c.env.DB.prepare(
      'SELECT * FROM automation_definitions WHERE id = ? AND org_id = ?',
    ).bind(c.req.param('id'), user.org_id).first() as any;
    if (!row) return c.json({ error: 'Not found' }, 404);
    if (row.status !== 'approved' && row.status !== 'active') {
      return c.json({ error: 'Automation must be approved before activation' }, 403);
    }
    await c.env.DB.prepare(
      `UPDATE automation_definitions SET status = 'active', approved_by = ?, approved_at = datetime('now') WHERE id = ?`,
    ).bind(user.id, row.id).run();
    return c.json({ ok: true });
  });

  app.post('/api/compliance-os/automations/:id/run', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const row = await c.env.DB.prepare(
      'SELECT * FROM automation_definitions WHERE id = ? AND org_id = ?',
    ).bind(c.req.param('id'), user.org_id).first() as any;
    if (!row) return c.json({ error: 'Not found' }, 404);
    const def = parseAutomationRow(row);
    const ctx = body.context || {};
    if (!evaluateConditions(def.conditions, ctx)) {
      return c.json({ ok: false, error: 'Conditions not met' });
    }
    const steps = automationStepsToWorkflow(def.steps);
    const runId = generateId();
    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      await c.env.DB.prepare(
        `INSERT INTO crm_workflow_steps (id, org_id, run_id, step_index, action_type, action_json, lane, channel, run_at, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'pending')`,
      ).bind(
        generateId(), user.org_id, runId, i, s.action, JSON.stringify(s),
        s.lane || def.lane, s.action === 'sms' ? 'sms' : s.action === 'email' ? 'email' : null,
      ).run();
    }
    await c.env.DB.prepare(
      `INSERT INTO crm_workflow_runs (id, org_id, workflow_key, client_id, lead_id, context_json, status)
       VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    ).bind(runId, user.org_id, `custom:${row.id}`, body.clientId || null, body.leadId || null, JSON.stringify(ctx)).run();
    return c.json({ ok: true, runId });
  });

  // ── Campaign approval ───────────────────────────────────
  app.get('/api/campaigns/:id/approval', authMiddleware, async (c) => {
    const user = c.get('user');
    const campaign = await c.env.DB.prepare(
      'SELECT id, name, approval_status, approved_by, approved_at, compliance_reviewed_by FROM marketing_campaigns WHERE id = ? AND org_id = ?',
    ).bind(c.req.param('id'), user.org_id).first();
    const log = await c.env.DB.prepare(
      'SELECT * FROM campaign_approval_log WHERE org_id = ? AND target_id = ? ORDER BY created_at DESC LIMIT 20',
    ).bind(user.org_id, c.req.param('id')).all().catch(() => ({ results: [] }));
    return c.json({ campaign, log: log.results || [], transitions: APPROVAL_TRANSITIONS });
  });

  app.post('/api/campaigns/:id/approval', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const result = await transitionCampaignApproval({
      db: c.env.DB,
      orgId: user.org_id,
      campaignId: c.req.param('id'),
      toStatus: body.status,
      reviewerId: user.id,
      notes: body.notes,
      logId: generateId(),
    });
    if (!result.ok) return c.json({ error: result.error }, 400);
    return c.json({ ok: true });
  });

  app.post('/api/campaigns/:id/suppression-simulation', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const campaign = await c.env.DB.prepare(
      'SELECT segment_json FROM marketing_campaigns WHERE id = ? AND org_id = ?',
    ).bind(c.req.param('id'), user.org_id).first() as any;
    let segment: any = {};
    try { segment = JSON.parse(campaign?.segment_json || '{}'); } catch { /* */ }
    const sim = await simulateCampaignSuppression({
      db: c.env.DB,
      orgId: user.org_id,
      segmentId: body.segmentId || segment.id || 'inactive_30',
    });
    await c.env.DB.prepare(
      'UPDATE marketing_campaigns SET suppression_simulation_json = ? WHERE id = ? AND org_id = ?',
    ).bind(JSON.stringify(sim), c.req.param('id'), user.org_id).run();
    return c.json({ ok: true, simulation: sim });
  });

  // ── Calling hours + recording policies ──────────────────
  app.get('/api/compliance-os/calling-hours', authMiddleware, async (c) => {
    const user = c.get('user');
    const clientId = c.req.query('clientId');
    if (!clientId) {
      return c.json({ policies: DEFAULT_CALL_RECORDING_POLICIES, defaultWindow: '8:00-21:00 local' });
    }
    const client = await c.env.DB.prepare(
      'SELECT * FROM clients WHERE id = ? AND org_id = ?',
    ).bind(clientId, user.org_id).first() as any;
    const callCheck = canPlaceMarketingCall({ client });
    const recording = recordingPolicyForState(client?.state);
    return c.json({ callCheck, recordingPolicy: recording });
  });

  app.post('/api/compliance-os/call-log', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const client = body.clientId
      ? await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(body.clientId, user.org_id).first() as any
      : null;
    let blockedReason: string | null = null;
    if (body.purpose === 'marketing') {
      const check = canPlaceMarketingCall({ client });
      if (!check.allowed) blockedReason = check.reason || 'blocked';
    }
    const policy = recordingPolicyForState(client?.state);
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO call_log (id, org_id, client_id, direction, phone, duration_sec, disclosure_required, disclosure_played, jurisdiction, purpose, blocked_reason, staff_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, user.org_id, body.clientId || null, body.direction || 'outbound', body.phone || null,
      body.durationSec || null, policy.disclosureRequired ? 1 : 0, body.disclosurePlayed ? 1 : 0,
      client?.state || 'US-default', body.purpose || 'service', blockedReason, user.id,
    ).run();
    if (body.clientId) {
      await appendTimelineEvent(c.env.DB, {
        id: generateId(),
        orgId: user.org_id,
        clientId: body.clientId,
        eventType: blockedReason ? 'call.blocked' : 'call.logged',
        title: blockedReason ? 'Marketing call blocked' : 'Call logged',
        summary: blockedReason || body.purpose,
        actorId: user.id,
      });
    }
    return c.json({ ok: true, id, blocked: !!blockedReason, reason: blockedReason });
  });

  // ── GHL inbound webhook ─────────────────────────────────
  app.post('/api/webhooks/ghl', async (c) => {
    const rawBody = await c.req.text();
    let body: GhlWebhookPayload = {};
    try { body = JSON.parse(rawBody); } catch { return c.json({ error: 'Invalid JSON' }, 400); }

    const sigOk = await verifyGhlWebhookSignature({
      secret: c.env.GHL_WEBHOOK_SECRET,
      rawBody,
      signatureHeader: c.req.header('x-ghl-signature') || c.req.header('x-wh-signature'),
    });
    if (c.env.GHL_WEBHOOK_SECRET && !sigOk) {
      return c.json({ error: 'Invalid webhook signature' }, 401);
    }

    const eventId = generateId();
    const locationId = body.locationId || c.req.query('locationId') || '';
    const orgId = await resolveOrgIdFromGhlLocation(c.env.DB, locationId, c.env.GHL_LOCATION_ID);
    const idempotencyKey = ghlIdempotencyKey(body);

    if (await checkGhlWebhookIdempotency(c.env.DB, orgId, idempotencyKey)) {
      return c.json({ ok: true, duplicate: true });
    }

    await c.env.DB.prepare(
      `INSERT INTO ghl_webhook_events (id, org_id, event_type, contact_id, payload_json, processed, idempotency_key)
       VALUES (?, ?, ?, ?, ?, 0, ?)`,
    ).bind(eventId, orgId, body.type || 'contact.updated', body.contactId || null, rawBody, idempotencyKey || null).run();

    const result = await processGhlInboundWebhook({
      db: c.env.DB,
      env: c.env,
      orgId,
      eventId,
      payload: body,
      generateId,
    });

    if (orgId && body.contactId) {
      const { resolveOrQueueIdentity } = await import('./identity-matching');
      await resolveOrQueueIdentity({
        db: c.env.DB,
        orgId,
        externalSystem: 'ghl',
        externalRecordId: body.contactId,
        candidate: { email: body.email, phone: body.phone },
        payload: body as Record<string, unknown>,
        generateId,
      }).catch(() => null);
    }

    return c.json({ ok: true, ...result });
  });

  app.get('/api/compliance-os/signature-packet/catalog', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    return c.json({
      documents: CLIENT_SIGNATURE_PACKET,
      statutoryDisclosure: CROA_STATUTORY_DISCLOSURE_1679c,
      gates: ['contract', 'service', 'dispute', 'identity_theft', 'payment'],
    });
  });

  app.get('/api/compliance-os/clients/:clientId/signature-packet', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const clientId = c.req.param('clientId');
    const row = await c.env.DB.prepare(
      'SELECT signature_packet_json FROM clients WHERE id = ? AND org_id = ?',
    ).bind(clientId, user.org_id).first() as any;
    if (!row) return c.json({ error: 'Client not found' }, 404);
    let status: ClientPacketStatus = defaultPacketStatus();
    try {
      if (row.signature_packet_json) status = { ...status, ...JSON.parse(row.signature_packet_json) };
    } catch { /* */ }
    return c.json({
      checklist: buildSignatureChecklist(status),
      gates: {
        contract: evaluateWorkflowGate('contract', status),
        service: evaluateWorkflowGate('service', status),
        dispute: evaluateWorkflowGate('dispute', status),
        identity_theft: evaluateWorkflowGate('identity_theft', status),
        payment: evaluateWorkflowGate('payment', status),
      },
      statutoryDisclosure: CROA_STATUTORY_DISCLOSURE_1679c,
    });
  });

  app.patch('/api/compliance-os/clients/:clientId/signature-packet', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const clientId = c.req.param('clientId');
    const body = await c.req.json().catch(() => ({}));
    const docId = String(body.documentId || '');
    const statusVal = String(body.status || 'signed');
    if (!docId) return c.json({ error: 'documentId required' }, 400);
    const row = await c.env.DB.prepare(
      'SELECT signature_packet_json FROM clients WHERE id = ? AND org_id = ?',
    ).bind(clientId, user.org_id).first() as any;
    if (!row) return c.json({ error: 'Client not found' }, 404);
    let status: ClientPacketStatus = defaultPacketStatus();
    try {
      if (row.signature_packet_json) status = { ...status, ...JSON.parse(row.signature_packet_json) };
    } catch { /* */ }
    status[docId] = statusVal as any;
    await c.env.DB.prepare(
      'UPDATE clients SET signature_packet_json = ?, updated_at = datetime(\'now\') WHERE id = ? AND org_id = ?',
    ).bind(JSON.stringify(status), clientId, user.org_id).run();
    return c.json({ ok: true, checklist: buildSignatureChecklist(status) });
  });

  app.get('/api/compliance-os/comms/library', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const category = c.req.query('category') || undefined;
    return c.json({ templates: listCommsStarters(category) });
  });

  app.post('/api/compliance-os/comms/ai-setup', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const prompt = String(body.prompt || body.message || '').trim();
    if (!prompt) return c.json({ error: 'prompt required' }, 400);
    const starters = COMMS_STARTER_LIBRARY.slice(0, 8).map((t) => `${t.id}: ${t.name} (${t.channel})`).join('\n');
    try {
      const result = await generateOrgAiText({
        env: c.env,
        orgId: user.org_id,
        userId: user.id,
        feature: 'comms_setup',
        messages: [
          { role: 'system', content: `Configure Smart FCRA branded email/SMS workflows. Starters:\n${starters}\nReturn JSON: {"workflowName":"","steps":[{"channel":"email|sms","templateId":"","delayHours":0}],"summary":""}` },
          { role: 'user', content: prompt },
        ],
      });
      let plan: any = { summary: result.text };
      try {
        const m = result.text.match(/\{[\s\S]*\}/);
        if (m) plan = JSON.parse(m[0]);
      } catch { /* keep text summary */ }
      return c.json({ plan, provider: result.provider, templates: COMMS_STARTER_LIBRARY });
    } catch (e: any) {
      return c.json({ plan: { summary: 'Use the Communications Library templates below.' }, error: e.message, templates: COMMS_STARTER_LIBRARY });
    }
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
