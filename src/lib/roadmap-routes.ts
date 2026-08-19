/**
 * Roadmap parity APIs: client billing, PPD, campaigns, custom domains, escalation, progress.
 */
import type { Hono } from 'hono';
import { generateId } from './auth';
import {
  createClientSubscriptionCheckout,
  handleClientBillingWebhook,
  listClientBillingPlans,
  clientBillingConfigured,
} from './client-billing';
import { queuePpdCharge, invoicePpdCharge, parsePpdSettings } from './ppd-billing';
import { setOrgCustomDomain, resolveOrgByCustomDomain } from './custom-domain';
import { BUILTIN_SEGMENTS, STARTER_CAMPAIGNS, runCampaignDelivery } from './campaign-builder';
import { buildClientProgressSummary, progressReportPlainText, generateProgressReportPdf } from './progress-report';
import { sendBrandedOrgEmail } from './comms-branding';
import { sendAppEmail } from './email';
import { portalBaseUrl } from './portal-services';

type RegisterOpts = { authMiddleware: any };

function staffOnly(user: any): string | null {
  if (!user || user.role === 'client') return 'Staff access required';
  return null;
}

export function registerRoadmapRoutes(app: Hono<any>, opts: RegisterOpts) {
  const { authMiddleware } = opts;

  // ── Client billing plans ────────────────────────────────
  app.get('/api/client-billing/plans', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const plans = await listClientBillingPlans(c.env.DB, user.org_id);
    return c.json({ plans, stripeConfigured: clientBillingConfigured(c.env) });
  });

  app.post('/api/client-billing/plans', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO client_billing_plans (id, org_id, name, amount_cents, interval) VALUES (?, ?, ?, ?, ?)`,
    ).bind(id, user.org_id, body.name || 'Monthly CRO', Number(body.amountCents || 9900), body.interval || 'month').run();
    return c.json({ ok: true, id });
  });

  app.post('/api/clients/:id/billing/checkout', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const base = portalBaseUrl(c.env);
    const result = await createClientSubscriptionCheckout({
      env: c.env,
      db: c.env.DB,
      orgId: user.org_id,
      clientId: c.req.param('id'),
      planId: body.planId,
      successUrl: body.successUrl || `${base}/app?billing=success`,
      cancelUrl: body.cancelUrl || `${base}/app?billing=cancel`,
      generateId,
    });
    if ('error' in result) return c.json({ error: result.error }, result.status);
    return c.json(result);
  });

  app.get('/api/clients/:id/billing/invoices', authMiddleware, async (c) => {
    const user = c.get('user');
    const rows = await c.env.DB.prepare(
      'SELECT * FROM client_invoices WHERE client_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 50',
    ).bind(c.req.param('id'), user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ invoices: rows.results || [] });
  });

  // ── PPD ─────────────────────────────────────────────────
  app.get('/api/settings/ppd', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    let settings = {};
    try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
    return c.json({ ppd: parsePpdSettings(settings) });
  });

  app.put('/api/settings/ppd', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    let settings: any = {};
    try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
    settings.ppd = {
      enabled: !!body.enabled,
      amountCents: Number(body.amountCents || 0),
      requireApproval: body.requireApproval !== false,
    };
    await c.env.DB.prepare('UPDATE organizations SET settings = ?, updated_at = datetime(\'now\') WHERE id = ?').bind(JSON.stringify(settings), user.org_id).run();
    return c.json({ ok: true, ppd: settings.ppd });
  });

  app.get('/api/ppd/charges', authMiddleware, async (c) => {
    const user = c.get('user');
    const rows = await c.env.DB.prepare(
      'SELECT * FROM ppd_charges WHERE org_id = ? ORDER BY created_at DESC LIMIT 100',
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ charges: rows.results || [] });
  });

  app.post('/api/ppd/charges/:id/approve', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const charge = await c.env.DB.prepare(
      'SELECT * FROM ppd_charges WHERE id = ? AND org_id = ?',
    ).bind(c.req.param('id'), user.org_id).first() as any;
    if (!charge) return c.json({ error: 'Not found' }, 404);
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(charge.client_id).first() as any;
    const result = await invoicePpdCharge({
      db: c.env.DB, env: c.env, orgId: user.org_id, clientId: charge.client_id,
      chargeId: charge.id, client, generateId, approvedBy: user.id,
    });
    if (!result.ok) return c.json({ error: result.error }, 400);
    return c.json({ ok: true });
  });

  // ── Custom domain ───────────────────────────────────────
  app.get('/api/settings/custom-domain', authMiddleware, async (c) => {
    const user = c.get('user');
    const org = await c.env.DB.prepare(
      'SELECT custom_domain, custom_domain_verified, settings FROM organizations WHERE id = ?',
    ).bind(user.org_id).first() as any;
    return c.json({
      domain: org?.custom_domain || null,
      verified: org?.custom_domain_verified === 1,
      cnameTarget: 'smart-fcra-v2.pages.dev',
    });
  });

  app.put('/api/settings/custom-domain', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    await setOrgCustomDomain({
      db: c.env.DB,
      orgId: user.org_id,
      domain: body.domain || '',
      verified: !!body.verified,
    });
    return c.json({ ok: true });
  });

  app.get('/api/public/tenant-by-host', async (c) => {
    const host = c.req.query('host') || c.req.header('host');
    const org = await resolveOrgByCustomDomain(c.env.DB, host);
    if (!org) return c.json({ found: false });
    return c.json({ found: true, orgId: org.id, name: org.name });
  });

  // ── Campaigns ───────────────────────────────────────────
  app.get('/api/campaigns/segments', authMiddleware, async (c) => {
    if (staffOnly(c.get('user'))) return c.json({ error: 'Staff only' }, 403);
    return c.json({ segments: BUILTIN_SEGMENTS.map((s) => ({ id: s.id, label: s.label })) });
  });

  app.get('/api/campaigns/starters', authMiddleware, async (c) => {
    if (staffOnly(c.get('user'))) return c.json({ error: 'Staff only' }, 403);
    return c.json({
      starters: STARTER_CAMPAIGNS,
      note: 'Clone a starter to create a draft. {{org_name}} becomes your firm name at send. SMS starters require Twilio in Settings.',
    });
  });

  app.get('/api/campaigns', authMiddleware, async (c) => {
    const user = c.get('user');
    const rows = await c.env.DB.prepare(
      'SELECT * FROM marketing_campaigns WHERE org_id = ? ORDER BY created_at DESC LIMIT 50',
    ).bind(user.org_id).all().catch(() => ({ results: [] }));
    return c.json({ campaigns: rows.results || [] });
  });

  app.post('/api/campaigns', authMiddleware, async (c) => {
    const user = c.get('user');
    if (staffOnly(user)) return c.json({ error: 'Staff only' }, 403);
    const body = await c.req.json().catch(() => ({}));
    const id = generateId();
    await c.env.DB.prepare(
      `INSERT INTO marketing_campaigns (id, org_id, name, channel, segment_json, subject, body_template, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', ?)`,
    ).bind(
      id, user.org_id, body.name || 'Campaign', body.channel || 'email',
      JSON.stringify({ id: body.segmentId || 'inactive_30' }),
      body.subject || '', body.bodyTemplate || '', user.id,
    ).run();
    return c.json({ ok: true, id });
  });

  app.post('/api/campaigns/:id/send', authMiddleware, async (c) => {
    const user = c.get('user');
    if (user.role !== 'admin' && user.role !== 'super_admin') return c.json({ error: 'Admin only' }, 403);
    const campaign = await c.env.DB.prepare(
      'SELECT approval_status FROM marketing_campaigns WHERE id = ? AND org_id = ?',
    ).bind(c.req.param('id'), user.org_id).first() as any;
    const status = campaign?.approval_status || 'draft';
    if (!['approved', 'sent'].includes(status)) {
      return c.json({ error: 'Campaign must pass compliance approval before send. Submit for review in Campaigns.' }, 403);
    }
    const result = await runCampaignDelivery({
      db: c.env.DB,
      env: c.env,
      orgId: user.org_id,
      campaignId: c.req.param('id'),
    });
    return c.json({ ok: true, ...result });
  });

  // ── Escalation queue ────────────────────────────────────
  app.get('/api/escalations', authMiddleware, async (c) => {
    const user = c.get('user');
    const rows = await c.env.DB.prepare(
      'SELECT * FROM escalation_queue WHERE org_id = ? AND status = ? ORDER BY created_at DESC LIMIT 50',
    ).bind(user.org_id, c.req.query('status') || 'pending').all().catch(() => ({ results: [] }));
    return c.json({ escalations: rows.results || [] });
  });

  app.patch('/api/escalations/:id', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    await c.env.DB.prepare(
      `UPDATE escalation_queue SET status = ?, resolved_at = datetime('now'), resolved_by = ? WHERE id = ? AND org_id = ?`,
    ).bind(body.status || 'resolved', user.id, c.req.param('id'), user.org_id).run();
    return c.json({ ok: true });
  });

  // ── Progress report preview ─────────────────────────────
  app.get('/api/clients/:id/progress-report', authMiddleware, async (c) => {
    const user = c.get('user');
    const summary = await buildClientProgressSummary({ db: c.env.DB, orgId: user.org_id, clientId: c.req.param('id') });
    if (!summary) return c.json({ error: 'Requires at least 2 reports on file' }, 400);
    const org = await c.env.DB.prepare('SELECT name FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    return c.json({ summary, text: progressReportPlainText(summary, org?.name || 'Smart FCRA') });
  });

  app.post('/api/clients/:id/progress-report/email', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.org_id).first() as any;
    if (!client?.email) return c.json({ error: 'Client email required' }, 400);
    const summary = await buildClientProgressSummary({ db: c.env.DB, orgId: user.org_id, clientId: client.id });
    if (!summary) return c.json({ error: 'Requires 2+ reports' }, 400);
    const org = await c.env.DB.prepare('SELECT name FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    const orgName = org?.name || 'Smart FCRA';
    await sendAppEmail(c.env, {
      to: client.email,
      subject: `${orgName} — Your credit file progress update`,
      text: progressReportPlainText(summary, orgName),
    });
    return c.json({ ok: true });
  });
}

export { handleClientBillingWebhook };
