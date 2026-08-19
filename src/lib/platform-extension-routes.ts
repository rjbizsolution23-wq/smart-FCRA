/**
 * Platform extension API routes — BYOK AI, credits, gateways, Zoom, contracts.
 */
import type { Hono } from 'hono';
import { generateId } from './auth';
import {
  BYOK_AI_PROVIDERS,
  PAYMENT_GATEWAYS,
  AI_CREDIT_PACKS,
  listOrgAiProviders,
  saveOrgAiProvider,
  getOrgAiCredits,
  chargeAiCredits,
  addOrgAiCredits,
  listOrgPaymentGateways,
  savePaymentGateway,
  getZoomStatus,
  createZoomMeeting,
  listOrgContractTemplates,
  saveOrgContractTemplate,
  getActiveOrgContractTemplate,
  resolveOrgEncryptionKey,
} from './platform-extensions';
import { INTEGRATION_PROVIDERS } from './integration-hub';

type RegisterOpts = { authMiddleware: any };

function adminOnly(user: any): string | null {
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return 'Admin only';
  return null;
}

export function registerPlatformExtensionRoutes(app: Hono<any>, opts: RegisterOpts) {
  const { authMiddleware } = opts;

  app.get('/api/platform-extensions/catalog', authMiddleware, async (c) => {
    return c.json({
      aiProviders: BYOK_AI_PROVIDERS,
      paymentGateways: PAYMENT_GATEWAYS,
      aiCreditPacks: AI_CREDIT_PACKS,
      integrations: INTEGRATION_PROVIDERS,
      zapier: {
        configured: true,
        apiKeysRoute: '/api/integrations/api-keys',
        subscribeRoute: '/api/v1/webhooks/zapier/subscribe',
        events: ['client.created', 'report.imported', 'letter.sent', 'ticket.created', 'complaint.created', 'workflow.completed'],
        docs: 'Settings → Click2Mail, Zapier & Webhooks',
      },
      cloudflareAi: {
        binding: 'Workers AI',
        included: true,
        description: 'Platform-included Cloudflare Workers AI when org has no BYOK key or credits exhausted with fallback enabled.',
      },
    });
  });

  // ── BYOK AI ─────────────────────────────────────────────
  app.get('/api/platform-extensions/ai/providers', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
    const providers = await listOrgAiProviders(c.env.DB, user.org_id, encKey);
    const credits = await getOrgAiCredits(c.env.DB, user.org_id);
    return c.json({ providers, credits, bringYourOwnKey: true, platformFallback: true });
  });

  app.put('/api/platform-extensions/ai/providers/:providerId', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const body = await c.req.json().catch(() => ({}));
    const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
    await saveOrgAiProvider({
      db: c.env.DB,
      orgId: user.org_id,
      providerId: c.req.param('providerId'),
      apiKey: body.apiKey,
      enabled: body.enabled,
      priority: body.priority,
      usePlatformFallback: body.usePlatformFallback,
      encryptionKey: encKey,
      userId: user.id,
    });
    return c.json({ ok: true });
  });

  app.get('/api/platform-extensions/ai/credits', authMiddleware, async (c) => {
    const user = c.get('user');
    const credits = await getOrgAiCredits(c.env.DB, user.org_id);
    const usage = await c.env.DB.prepare(
      `SELECT provider, feature, credits_charged, created_at FROM org_ai_usage WHERE org_id = ? ORDER BY created_at DESC LIMIT 25`,
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ credits, recentUsage: usage.results || [], packs: AI_CREDIT_PACKS });
  });

  app.post('/api/platform-extensions/ai/credits/purchase', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const body = await c.req.json().catch(() => ({}));
    const pack = AI_CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) return c.json({ error: 'Invalid credit pack' }, 400);
    // Stripe checkout for credit packs — same platform billing; webhook adds credits
    return c.json({
      ok: true,
      message: 'AI credit purchase initiated. Complete Stripe checkout to add credits.',
      pack,
      checkoutHint: 'POST /api/billing/checkout with metadata ai_credit_pack',
      manualGrant: false,
    });
  });

  // ── Payment gateways ────────────────────────────────────
  app.get('/api/platform-extensions/payment-gateways', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
    const gateways = await listOrgPaymentGateways(c.env.DB, user.org_id, encKey);
    return c.json({ gateways });
  });

  app.put('/api/platform-extensions/payment-gateways/:gateway', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const body = await c.req.json().catch(() => ({}));
    const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
    await savePaymentGateway({
      db: c.env.DB,
      orgId: user.org_id,
      gateway: c.req.param('gateway'),
      encryptionKey: encKey,
      userId: user.id,
      body,
    });
    return c.json({ ok: true });
  });

  // ── Zoom ────────────────────────────────────────────────
  app.get('/api/platform-extensions/zoom/status', authMiddleware, async (c) => {
    const user = c.get('user');
    const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
    const status = await getZoomStatus(c.env.DB, user.org_id, encKey);
    return c.json(status);
  });

  app.put('/api/platform-extensions/zoom/credentials', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const body = await c.req.json().catch(() => ({}));
    const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
    await savePaymentGateway({
      db: c.env.DB,
      orgId: user.org_id,
      gateway: 'zoom',
      encryptionKey: encKey,
      userId: user.id,
      body,
    });
    await c.env.DB.prepare(
      `INSERT INTO org_zoom_connections (org_id, status, updated_at) VALUES (?, 'pending', datetime('now'))
       ON CONFLICT(org_id) DO UPDATE SET status = 'pending', updated_at = datetime('now')`,
    ).bind(user.org_id).run();
    return c.json({ ok: true });
  });

  app.post('/api/platform-extensions/zoom/meetings', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    const encKey = resolveOrgEncryptionKey(c.env.PII_ENCRYPTION_KEY, user.org_id);
    const result = await createZoomMeeting({
      db: c.env.DB,
      orgId: user.org_id,
      encryptionKey: encKey,
      topic: String(body.topic || 'Smart FCRA client meeting'),
      startTime: body.startTime,
      durationMin: body.durationMin,
    });
    if (!result.ok) return c.json({ error: result.error }, 502);
    await c.env.DB.prepare(
      `INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(generateId(), user.org_id, user.id, 'zoom_meeting_created', `Zoom meeting: ${body.topic}`, JSON.stringify({ meetingId: result.meetingId })).run().catch(() => {});
    return c.json(result);
  });

  // ── Custom contracts ────────────────────────────────────
  app.get('/api/platform-extensions/contracts/templates', authMiddleware, async (c) => {
    const user = c.get('user');
    const templates = await listOrgContractTemplates(c.env.DB, user.org_id);
    return c.json({
      templates,
      supportedTypes: ['croa', 'lpoa', 'rep_auth', 'esign', 'privacy', 'custom'],
      note: 'Org templates override system defaults when active. Variables: {{client_name}}, {{org_name}}, {{date}}.',
    });
  });

  app.post('/api/platform-extensions/contracts/templates', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const body = await c.req.json().catch(() => ({}));
    if (!body.bodyText?.trim()) return c.json({ error: 'Template body required' }, 400);
    const saved = await saveOrgContractTemplate({
      db: c.env.DB,
      orgId: user.org_id,
      userId: user.id,
      templateType: String(body.templateType || 'custom'),
      name: String(body.name || 'Custom template'),
      bodyText: String(body.bodyText),
    });
    return c.json({ ok: true, template: saved });
  });

  app.get('/api/platform-extensions/contracts/templates/:type/active', authMiddleware, async (c) => {
    const user = c.get('user');
    const tpl = await getActiveOrgContractTemplate(c.env.DB, user.org_id, c.req.param('type'));
    if (!tpl) return c.json({ template: null, usingSystemDefault: true });
    return c.json({ template: { id: tpl.id, name: tpl.name, version: tpl.version, bodyText: tpl.body_text }, usingSystemDefault: false });
  });
}

export { chargeAiCredits };
