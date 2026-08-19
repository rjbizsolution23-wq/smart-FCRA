/**
 * Integration OS API — hub, vault, identity, events, DLQ, maker-checker, governance.
 */
import type { Hono } from 'hono';
import { generateId } from './auth';
import {
  integrationHubDashboard,
  testGhlConnectionForOrg,
  upsertIntegrationConnection,
  loadOrgGhlEnv,
} from './integration-hub';
import { storeIntegrationSecret, logVaultAccess } from './credential-vault';
import { saveOrgIntegrations, parseOrgIntegrations, integrationsStatusView, loadOrgTwilioCredentials } from './org-integrations';
import { resolveOrQueueIdentity, linkExternalIdentity } from './identity-matching';
import { publishPlatformEvent, PLATFORM_EVENT_TYPES } from './event-bus';
import { processIntegrationJobQueue, countPendingIntegrationJobs, enqueueIntegrationJob } from './integration-dlq';
import { scanOutboundCopy } from './copy-qa';
import { SYSTEM_OF_RECORD, GHL_FIELD_SYNC_RULES } from './integration-sync-rules';
import { minimizationPayload } from './data-classification';
import { resolveOrgEncryptionKey } from './platform-extensions';

type RegisterOpts = { authMiddleware: any };

function staffOnly(user: any): string | null {
  if (!user || user.role === 'client') return 'Staff access required';
  return null;
}

function adminOnly(user: any): string | null {
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return 'Admin only';
  return null;
}

export function registerIntegrationOsRoutes(app: Hono<any>, opts: RegisterOpts) {
  const { authMiddleware } = opts;

  // ── Integration Hub dashboard ───────────────────────────
  app.get('/api/integration-os/hub', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = staffOnly(user);
    if (err) return c.json({ error: err }, 403);
    const dash = await integrationHubDashboard({
      db: c.env.DB,
      orgId: user.org_id,
      platformEnv: c.env,
      encryptionKey: c.env.PII_ENCRYPTION_KEY,
    });
    return c.json(dash);
  });

  app.get('/api/integration-os/providers', authMiddleware, async (c) => {
    const { INTEGRATION_PROVIDERS } = await import('./integration-hub');
    return c.json({ providers: INTEGRATION_PROVIDERS });
  });

  app.get('/api/integration-os/system-of-record', authMiddleware, async (c) => {
    return c.json({ systemOfRecord: SYSTEM_OF_RECORD, syncRules: GHL_FIELD_SYNC_RULES, dataMinimization: minimizationPayload() });
  });

  // ── Secure credential save (vault) ──────────────────────
  app.put('/api/integration-os/connections/:provider', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const provider = c.req.param('provider');
    const body = await c.req.json().catch(() => ({}));
    const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
    if (!encKey && !c.env.PII_ENCRYPTION_KEY) return c.json({ error: 'PII_ENCRYPTION_KEY required for credential vault' }, 503);

    const patch: any = {};
    if (provider === 'ghl') {
      patch.ghl = {
        enabled: body.enabled !== false,
        locationId: body.locationId,
        apiBase: body.apiBase,
      };
      if (body.pitToken) {
        await storeIntegrationSecret({
          db: c.env.DB, orgId: user.org_id, provider: 'ghl', secretKey: 'pit_token',
          plaintext: body.pitToken, encryptionKey: encKey, createdBy: user.id, id: generateId(),
        });
        patch.ghl.pitToken = '__vault__';
      }
    }
    if (provider === 'mfsn') {
      patch.mfsn = {
        enabled: body.enabled !== false,
        email: body.email,
        affiliateId: body.affiliateId,
        apiUrl: body.apiUrl,
      };
      if (body.password) {
        await storeIntegrationSecret({
          db: c.env.DB, orgId: user.org_id, provider: 'mfsn', secretKey: 'partner_password',
          plaintext: body.password, encryptionKey: encKey, createdBy: user.id, id: generateId(),
        });
      }
      if (body.clientToken) {
        await storeIntegrationSecret({
          db: c.env.DB, orgId: user.org_id, provider: 'mfsn', secretKey: 'client_token',
          plaintext: body.clientToken, encryptionKey: encKey, createdBy: user.id, id: generateId(),
        });
      }
    }
    if (provider === 'twilio') {
      patch.twilio = {
        enabled: body.enabled !== false,
        phoneNumber: body.phoneNumber,
      };
      if (body.accountSid) {
        await storeIntegrationSecret({
          db: c.env.DB, orgId: user.org_id, provider: 'twilio', secretKey: 'account_sid',
          plaintext: body.accountSid.trim(), encryptionKey: encKey, createdBy: user.id, id: generateId(),
        });
        patch.twilio.accountSid = '__vault__';
      }
      if (body.authToken) {
        await storeIntegrationSecret({
          db: c.env.DB, orgId: user.org_id, provider: 'twilio', secretKey: 'auth_token',
          plaintext: body.authToken.trim(), encryptionKey: encKey, createdBy: user.id, id: generateId(),
        });
      }
    }

    if (!patch.ghl && !patch.mfsn && !patch.twilio && provider !== 'ghl' && provider !== 'mfsn' && provider !== 'twilio') {
      return c.json({ error: `Unknown provider: ${provider}` }, 400);
    }

    await saveOrgIntegrations(c.env.DB, user.org_id, patch);
    await upsertIntegrationConnection({
      db: c.env.DB,
      orgId: user.org_id,
      provider,
      id: generateId(),
      patch: {
        authType: body.authType || (provider === 'ghl' ? 'pit' : provider === 'twilio' ? 'api_key' : 'partner_api'),
        status: 'connected',
        locationId: body.locationId,
        scopes: body.scopes,
        config: { affiliateId: body.affiliateId, strategy: 'partner_api_first' },
      },
    });
    await logVaultAccess({
      db: c.env.DB, orgId: user.org_id, provider, action: 'save_credentials',
      userId: user.id, role: user.role, ip: c.req.header('cf-connecting-ip'), id: generateId(),
    });

    return c.json({ ok: true, status: integrationsStatusView(
      JSON.parse((await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any)?.settings || '{}'),
      c.env,
    ) });
  });

  app.post('/api/integration-os/connections/:provider/test', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const provider = c.req.param('provider');
    if (provider === 'ghl') {
      const result = await testGhlConnectionForOrg({
        db: c.env.DB,
        orgId: user.org_id,
        platformEnv: c.env,
        encryptionKey: c.env.PII_ENCRYPTION_KEY,
        userId: user.id,
        role: user.role,
        ip: c.req.header('cf-connecting-ip'),
        logId: generateId(),
      });
      return c.json(result, result.ok ? 200 : 502);
    }
    if (provider === 'twilio') {
      const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
      const creds = await loadOrgTwilioCredentials(c.env.DB, user.org_id, c.env, encKey);
      if (!creds) {
        return c.json({ ok: false, error: 'Twilio not configured. Add Account SID, Auth Token, and From number in Settings.' }, 502);
      }
      try {
        const auth = btoa(`${creds.accountSid}:${creds.authToken}`);
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${creds.accountSid}.json`, {
          headers: { Authorization: `Basic ${auth}` },
        });
        const data = await res.json() as any;
        if (!res.ok) return c.json({ ok: false, error: data.message || 'Twilio auth failed' }, 502);
        return c.json({
          ok: true,
          accountName: data.friendly_name,
          phoneNumber: creds.phoneNumber,
          source: creds.source,
          status: data.status,
        });
      } catch (e: any) {
        return c.json({ ok: false, error: e.message }, 502);
      }
    }
    return c.json({ ok: false, error: 'Test not implemented for provider' }, 501);
  });

  app.post('/api/integration-os/connections/:provider/disconnect', authMiddleware, async (c) => {
    const user = c.get('user');
    if (adminOnly(user)) return c.json({ error: adminOnly(user) }, 403);
    const provider = c.req.param('provider');
    await upsertIntegrationConnection({
      db: c.env.DB, orgId: user.org_id, provider, id: generateId(),
      patch: { status: 'disconnected', healthStatus: 'disconnected', lastError: 'Disconnected by admin' },
    });
    await c.env.DB.prepare(
      `UPDATE integration_secrets SET revoked_at = datetime('now') WHERE org_id = ? AND provider = ?`,
    ).bind(user.org_id, provider).run();
    return c.json({ ok: true });
  });

  // GHL OAuth placeholder — requires GHL Marketplace app registration
  app.get('/api/integrations/ghl/oauth/start', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const clientId = c.env.GHL_OAUTH_CLIENT_ID;
    if (!clientId) {
      return c.json({
        ok: false,
        mode: 'private_integration',
        message: 'OAuth not configured. Use Private Integration Token (PIT) in Settings → Integrations. Register a GHL Marketplace app and set GHL_OAUTH_CLIENT_ID to enable OAuth.',
        docsUrl: 'https://help.gohighlevel.com/support/solutions/articles/155000003054-private-integrations-everything-you-need-to-know',
      });
    }
    const redirectUri = `${c.env.APP_BASE_URL || c.env.FRONTEND_URL || 'https://smartfcra.com'}/api/integrations/ghl/oauth/callback`;
    const state = generateId();
    return c.json({
      ok: true,
      authorizeUrl: `https://marketplace.gohighlevel.com/oauth/chooselocation?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
      state,
    });
  });

  // ── Identity resolution ─────────────────────────────────
  app.get('/api/integration-os/identity-queue', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const rows = await c.env.DB.prepare(
      'SELECT * FROM identity_resolution_queue WHERE org_id = ? AND status = ? ORDER BY created_at DESC LIMIT 50',
    ).bind(user.org_id, 'pending').all();
    return c.json({ queue: rows.results || [] });
  });

  app.post('/api/integration-os/identity-queue/:id/resolve', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const item = await c.env.DB.prepare(
      'SELECT * FROM identity_resolution_queue WHERE id = ? AND org_id = ?',
    ).bind(c.req.param('id'), user.org_id).first() as any;
    if (!item) return c.json({ error: 'Not found' }, 404);

    await linkExternalIdentity({
      db: c.env.DB,
      orgId: user.org_id,
      clientId: body.clientId,
      externalSystem: item.external_system,
      externalRecordId: item.external_record_id,
      id: generateId(),
      method: 'manual_resolution',
      confidence: 1,
    });
    await c.env.DB.prepare(
      `UPDATE identity_resolution_queue SET status = 'resolved', resolved_client_id = ?, resolved_by = ?, resolved_at = datetime('now') WHERE id = ?`,
    ).bind(body.clientId, user.id, item.id).run();
    return c.json({ ok: true });
  });

  app.get('/api/integration-os/identity-links/:clientId', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const rows = await c.env.DB.prepare(
      'SELECT * FROM external_identity_links WHERE org_id = ? AND client_id = ?',
    ).bind(user.org_id, c.req.param('clientId')).all();
    return c.json({ links: rows.results || [] });
  });

  // ── Event bus ─────────────────────────────────────────────
  app.get('/api/integration-os/events', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const rows = await c.env.DB.prepare(
      'SELECT * FROM platform_events WHERE org_id = ? ORDER BY created_at DESC LIMIT 100',
    ).bind(user.org_id).all();
    return c.json({ events: rows.results || [], catalog: PLATFORM_EVENT_TYPES });
  });

  app.post('/api/integration-os/events/publish', authMiddleware, async (c) => {
    const user = c.get('user');
    if (adminOnly(user)) return c.json({ error: adminOnly(user) }, 403);
    const body = await c.req.json().catch(() => ({}));
    const result = await publishPlatformEvent({
      db: c.env.DB,
      env: c.env,
      orgId: user.org_id,
      eventType: body.eventType,
      payload: body.payload,
      clientId: body.clientId,
      idempotencyKey: body.idempotencyKey,
      actorId: user.id,
      source: 'manual',
    });
    return c.json({ ok: true, ...result });
  });

  // ── DLQ / job queue ─────────────────────────────────────
  app.get('/api/integration-os/jobs', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const status = c.req.query('status') || 'pending';
    const rows = await c.env.DB.prepare(
      'SELECT * FROM integration_job_queue WHERE org_id = ? AND status = ? ORDER BY created_at DESC LIMIT 50',
    ).bind(user.org_id, status).all();
    const pending = await countPendingIntegrationJobs(c.env.DB, user.org_id);
    return c.json({ jobs: rows.results || [], pendingTotal: pending });
  });

  app.post('/api/integration-os/jobs/:id/retry', authMiddleware, async (c) => {
    const user = c.get('user');
    if (adminOnly(user)) return c.json({ error: adminOnly(user) }, 403);
    await c.env.DB.prepare(
      `UPDATE integration_job_queue SET status = 'pending', next_attempt_at = datetime('now'), attempt_count = 0 WHERE id = ? AND org_id = ?`,
    ).bind(c.req.param('id'), user.org_id).run();
    return c.json({ ok: true });
  });

  // ── Maker-checker ───────────────────────────────────────
  app.get('/api/integration-os/maker-checker', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const rows = await c.env.DB.prepare(
      'SELECT * FROM maker_checker_requests WHERE org_id = ? AND status = ? ORDER BY created_at DESC LIMIT 50',
    ).bind(user.org_id, 'pending').all();
    return c.json({ requests: rows.results || [] });
  });

  app.post('/api/integration-os/maker-checker', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO maker_checker_requests (id, org_id, action_type, target_type, target_id, client_id, initiated_by, before_json, after_json, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id, user.org_id, body.actionType, body.targetType, body.targetId || null,
      body.clientId || null, user.id,
      JSON.stringify(body.before || {}), JSON.stringify(body.after || {}), body.reason || null,
    ).run();
    return c.json({ ok: true, id, status: 'pending' });
  });

  app.post('/api/integration-os/maker-checker/:id/approve', authMiddleware, async (c) => {
    const user = c.get('user');
    if (adminOnly(user)) return c.json({ error: adminOnly(user) }, 403);
    const req = await c.env.DB.prepare(
      'SELECT * FROM maker_checker_requests WHERE id = ? AND org_id = ? AND status = ?',
    ).bind(c.req.param('id'), user.org_id, 'pending').first() as any;
    if (!req) return c.json({ error: 'Not found' }, 404);
    if (req.initiated_by === user.id) {
      return c.json({ error: 'Maker-checker: approver must differ from initiator' }, 403);
    }
    await c.env.DB.prepare(
      `UPDATE maker_checker_requests SET status = 'approved', approved_by = ?, resolved_at = datetime('now') WHERE id = ?`,
    ).bind(user.id, req.id).run();
    return c.json({ ok: true, request: req });
  });

  // ── Workflow simulation ───────────────────────────────────
  app.post('/api/integration-os/workflows/simulate', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const { canSendMessage } = await import('./comms-compliance');
    const steps = body.steps || [];
    const simulation: any[] = [];
    for (const step of steps) {
      const entry: any = { step: step.type || step.action, status: 'would_run' };
      if (step.type === 'send_email' || step.action === 'email') {
        const gate = await canSendMessage({
          db: c.env.DB,
          orgId: user.org_id,
          clientId: body.clientId,
          lane: step.lane || 'transactional',
          channel: 'email',
        });
        entry.consentCheck = gate;
        if (!gate.allowed) entry.status = 'blocked';
        if (step.bodyTemplate) entry.copyQa = scanOutboundCopy(step.bodyTemplate);
      }
      simulation.push(entry);
    }
    return c.json({ ok: true, simulation, trigger: body.triggerEvent, clientId: body.clientId });
  });

  // ── RBAC catalog ──────────────────────────────────────────
  app.get('/api/integration-os/rbac', authMiddleware, async (c) => {
    return c.json({
      roles: [
        'super_admin', 'admin', 'compliance_officer', 'manager', 'sales',
        'customer_service', 'dispute_specialist', 'billing', 'attorney_liaison',
        'affiliate_manager', 'auditor', 'read_only', 'member', 'client',
      ],
      abacExamples: [
        { role: 'customer_service', can: ['view finding explanation'], cannot: ['alter evidence'] },
        { role: 'dispute_specialist', can: ['draft correspondence'], cannot: ['issue refunds'] },
        { role: 'sales', can: ['view lead pipeline'], cannot: ['view full credit report'] },
        { role: 'auditor', can: ['export audit package'], cannot: ['modify records'] },
      ],
    });
  });
}

export async function runIntegrationOsCron(db: D1Database): Promise<{ jobs: Record<string, number> }> {
  const jobs = await processIntegrationJobQueue(db, 30);
  return { jobs };
}
