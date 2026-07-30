/**
 * Enterprise email workflows: onboarding drip, CROA nudges, dispute-due reminders, admin digests.
 */
import { sendTemplatedClientMessage, type TemplateId } from './email-templates';
import { loadOrgBrand, brandVars } from './org-branding';
import { portalBaseUrl } from './portal-services';
import { isSyntheticPortalEmail } from './portal-services';

export type WorkflowEnv = {
  DB: any;
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
  [key: string]: any;
};

function rid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

function utcDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

async function alreadySent(env: WorkflowEnv, clientId: string, dripKey: string, sendDate = utcDate()): Promise<boolean> {
  try {
    const row = await env.DB.prepare(
      `SELECT id FROM onboarding_drip_log WHERE client_id = ? AND drip_key = ? AND send_date = ?`
    ).bind(clientId, dripKey, sendDate).first();
    return !!row;
  } catch {
    return false;
  }
}

async function markSent(env: WorkflowEnv, orgId: string, clientId: string, dripKey: string, channels: any, sendDate = utcDate()) {
  try {
    await env.DB.prepare(
      `INSERT INTO onboarding_drip_log (id, org_id, client_id, drip_key, send_date, channels_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(client_id, drip_key, send_date) DO UPDATE SET channels_json = excluded.channels_json`
    ).bind(rid(), orgId, clientId, dripKey, sendDate, JSON.stringify(channels || {})).run();
  } catch (e) {
    console.warn('[drip] markSent failed', e);
  }
}

async function clientEmailOk(client: any): Promise<string | null> {
  if (!client?.email || isSyntheticPortalEmail(client.email)) return null;
  if (client.notify_email === 0) return null;
  return client.email;
}

export async function dispatchOnboardingDrips(env: WorkflowEnv, opts?: { orgId?: string; limit?: number }) {
  const limit = opts?.limit || 200;
  let sql = `SELECT * FROM clients WHERE status != 'archived' AND email IS NOT NULL AND email != ''`;
  const binds: any[] = [];
  if (opts?.orgId) {
    sql += ` AND org_id = ?`;
    binds.push(opts.orgId);
  }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  binds.push(limit);

  const rows = await env.DB.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }));
  const clients = (rows?.results || []) as any[];
  const stats = { scanned: clients.length, welcomeD1: 0, welcomeD3: 0, croaNudge: 0, skipped: 0, errors: 0 };
  const portal = portalBaseUrl(env as any);

  for (const client of clients) {
    try {
      const email = await clientEmailOk(client);
      if (!email) { stats.skipped++; continue; }
      const brand = await loadOrgBrand(env, client.org_id);
      const b = brandVars(brand);
      const created = new Date(client.created_at || Date.now()).getTime();
      const ageHours = (Date.now() - created) / 3600000;
      const varsBase = {
        ...b,
        clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        portalUrl: portal + '/',
      };

      // Day-1 follow-up (20–48h after create)
      if (ageHours >= 20 && ageHours < 48) {
        if (!(await alreadySent(env, client.id, 'welcome_d1'))) {
          const r = await sendTemplatedClientMessage(env as any, {
            templateId: 'onboarding_day1',
            orgId: client.org_id,
            clientId: client.id,
            email,
            notifyEmail: true,
            vars: varsBase,
            brand,
          });
          await markSent(env, client.org_id, client.id, 'welcome_d1', r);
          stats.welcomeD1++;
        }
      }

      // Day-3 follow-up
      if (ageHours >= 66 && ageHours < 96) {
        if (!(await alreadySent(env, client.id, 'welcome_d3'))) {
          const r = await sendTemplatedClientMessage(env as any, {
            templateId: 'onboarding_day3',
            orgId: client.org_id,
            clientId: client.id,
            email,
            notifyEmail: true,
            vars: varsBase,
            brand,
          });
          await markSent(env, client.org_id, client.id, 'welcome_d3', r);
          stats.welcomeD3++;
        }
      }

      // Unsigned CROA nudge (after 12h, once per day max via drip_key date)
      const needsCroa = !client.croa_contract_agreed || client.croa_contract_agreed === 0;
      if (needsCroa && ageHours >= 12) {
        if (!(await alreadySent(env, client.id, 'croa_nudge'))) {
          const r = await sendTemplatedClientMessage(env as any, {
            templateId: 'unsigned_contract_nudge',
            orgId: client.org_id,
            clientId: client.id,
            email,
            notifyEmail: true,
            vars: { ...varsBase, contractType: 'CROA service agreement' },
            brand,
          });
          await markSent(env, client.org_id, client.id, 'croa_nudge', r);
          stats.croaNudge++;
        }
      }
    } catch (e) {
      console.warn('[drip] client failed', client.id, e);
      stats.errors++;
    }
  }

  return stats;
}

export async function dispatchDisputeDueReminders(env: WorkflowEnv, opts?: { orgId?: string; limit?: number }) {
  const limit = opts?.limit || 300;
  let sql = `
    SELECT d.id as document_id, d.org_id, d.client_id, d.title, d.response_due_date, d.status,
           c.first_name, c.last_name, c.email, c.notify_email, c.phone, c.phone_e164
    FROM documents d
    JOIN clients c ON c.id = d.client_id
    WHERE d.status = 'sent'
      AND d.response_due_date IS NOT NULL
      AND date(d.response_due_date) <= date('now', '+5 days')
      AND date(d.response_due_date) >= date('now', '-2 days')
  `;
  const binds: any[] = [];
  if (opts?.orgId) {
    sql += ` AND d.org_id = ?`;
    binds.push(opts.orgId);
  }
  sql += ` ORDER BY d.response_due_date ASC LIMIT ?`;
  binds.push(limit);

  const rows = await env.DB.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }));
  const docs = (rows?.results || []) as any[];
  const stats = { scanned: docs.length, sent: 0, skipped: 0, errors: 0 };
  const portal = portalBaseUrl(env as any);

  for (const doc of docs) {
    try {
      const dripKey = `dispute_due_${doc.document_id}`;
      if (await alreadySent(env, doc.client_id, dripKey)) { stats.skipped++; continue; }
      const email = doc.email && !isSyntheticPortalEmail(doc.email) && doc.notify_email !== 0 ? doc.email : null;
      if (!email) { stats.skipped++; continue; }
      const brand = await loadOrgBrand(env, doc.org_id);
      const due = doc.response_due_date;
      const overdue = new Date(due).getTime() < Date.now();
      const r = await sendTemplatedClientMessage(env as any, {
        templateId: 'dispute_due_reminder',
        orgId: doc.org_id,
        clientId: doc.client_id,
        email,
        notifyEmail: true,
        vars: {
          ...brandVars(brand),
          clientName: `${doc.first_name || ''} ${doc.last_name || ''}`.trim(),
          documentTitle: doc.title || 'Dispute letter',
          dueDate: due,
          statusNote: overdue ? 'This response window is overdue.' : 'Response window closing soon.',
          portalUrl: portal + '/',
        },
        brand,
      });
      await markSent(env, doc.org_id, doc.client_id, dripKey, r);
      stats.sent++;
    } catch (e) {
      console.warn('[dispute-due] failed', doc.document_id, e);
      stats.errors++;
    }
  }
  return stats;
}

export async function dispatchAdminDailyDigest(env: WorkflowEnv, opts?: { orgId?: string }) {
  let orgSql = `SELECT id, name FROM organizations`;
  const binds: any[] = [];
  if (opts?.orgId) {
    orgSql += ` WHERE id = ?`;
    binds.push(opts.orgId);
  }
  const orgs = await env.DB.prepare(orgSql).bind(...binds).all().catch(() => ({ results: [] }));
  const stats = { orgs: 0, emails: 0, skipped: 0 };

  for (const org of (orgs?.results || []) as any[]) {
    stats.orgs++;
    const admins = await env.DB.prepare(
      `SELECT id, email, name FROM users WHERE org_id = ? AND role IN ('admin','super_admin') AND is_active = 1 AND email IS NOT NULL`
    ).bind(org.id).all().catch(() => ({ results: [] }));

    const since = daysAgo(1);
    const newClients = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM clients WHERE org_id = ? AND created_at >= ?`
    ).bind(org.id, since).first() as any;
    const newReports = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM credit_reports WHERE org_id = ? AND created_at >= ?`
    ).bind(org.id, since).first() as any;
    const pendingSign = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM documents WHERE org_id = ? AND status = 'draft'`
    ).bind(org.id).first() as any;
    const overdueMail = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM documents WHERE org_id = ? AND status = 'sent' AND response_due_date IS NOT NULL AND date(response_due_date) < date('now')`
    ).bind(org.id).first() as any;
    const unsignedCroa = await env.DB.prepare(
      `SELECT COUNT(*) as c FROM clients WHERE org_id = ? AND (croa_contract_agreed = 0 OR croa_contract_agreed IS NULL)`
    ).bind(org.id).first() as any;

    const brand = await loadOrgBrand(env, org.id);
    const body = [
      `Daily ops digest for ${org.name}`,
      ``,
      `New clients (24h): ${newClients?.c || 0}`,
      `Reports analyzed (24h): ${newReports?.c || 0}`,
      `Documents awaiting e-sign: ${pendingSign?.c || 0}`,
      `Overdue bureau responses: ${overdueMail?.c || 0}`,
      `Clients missing CROA: ${unsignedCroa?.c || 0}`,
      ``,
      `Open Compliance Hub to act.`,
    ].join('\n');

    for (const admin of (admins?.results || []) as any[]) {
      const dripKey = `admin_digest_${admin.id}`;
      // Use a synthetic client_id slot = admin user for uniqueness in drip log — use org placeholder client
      // Store against org via a pseudo client id = org
      if (await alreadySent(env, `admin:${admin.id}`, dripKey)) { stats.skipped++; continue; }
      try {
        const r = await sendTemplatedClientMessage(env as any, {
          templateId: 'admin_daily_digest',
          orgId: org.id,
          clientId: `admin:${admin.id}`,
          email: admin.email,
          notifyEmail: true,
          notifySms: false,
          vars: {
            ...brandVars(brand),
            clientName: admin.name || 'Admin',
            digestBody: body,
            portalUrl: portalBaseUrl(env as any) + '/',
          },
          brand,
          skipClientAlert: true, // digests go to staff, not portal_alerts for a fake client
        });
        await markSent(env, org.id, `admin:${admin.id}`, dripKey, r);
        stats.emails++;
      } catch (e) {
        console.warn('[admin-digest]', admin.email, e);
        stats.skipped++;
      }
    }
  }
  return stats;
}

export async function runEnterpriseCommsCron(env: WorkflowEnv, opts?: { orgId?: string }) {
  const drips = await dispatchOnboardingDrips(env, opts);
  const disputeDue = await dispatchDisputeDueReminders(env, opts);
  const adminDigest = await dispatchAdminDailyDigest(env, opts);
  return { drips, disputeDue, adminDigest, ranAt: new Date().toISOString() };
}

/** Helper for template typing in this module */
export type { TemplateId };
