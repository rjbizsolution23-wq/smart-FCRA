/**
 * Unified ops scheduler — integrity, client value, and CRO operating jobs.
 * Invoked by /api/cron/ops packs (hourly | daily | weekly | monthly).
 */
import { sendTemplatedClientMessage } from './email-templates';
import { loadOrgBrand, brandVars } from './org-branding';
import { portalBaseUrl, isSyntheticPortalEmail, computeAndStoreFundability } from './portal-services';
import { runEnterpriseCommsCron } from './email-workflows';
import { dispatchDailyMotivationBatch } from './portal-journey';
import { buildSecurityPosture } from './security-compliance';
import { seedKnowledgeBase, retrieveKnowledge } from './knowledge-base';
import { syncTradelineInventory } from './tradeline-sync';
import { tradelineMasterConfigured } from './tradelinemaster-client';
import { OPS_BACKUP_TABLES } from './data-compliance';
import { processDueWorkflowSteps } from './crm-workflow-engine';
import { reconcileMfsnMembersToClients } from './mfsn-reconcile';

export type OpsEnv = {
  DB: any;
  DOCS?: R2Bucket;
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
  JOURNEY_CRON_SECRET?: string;
  MAILING_WEBHOOK_SECRET?: string;
  AI?: any;
  [key: string]: any;
};

export type OpsJobName =
  | 'housekeeping'
  | 'email_health'
  | 'enterprise_comms'
  | 'morning_ritual'
  | 'journey_streak_nudge'
  | 'fundability_refresh'
  | 'inactive_reengage'
  | 'newsletter_weekly'
  | 'bureau_followup'
  | 'privacy_sla'
  | 'ron_video_cleanup'
  | 'kb_health'
  | 'weekly_owner_report'
  | 'monthly_compliance_snapshot'
  | 'monthly_progress_reports'
  | 'client_billing_dunning'
  | 'crm_workflow_tick'
  | 'mfsn_member_reconcile'
  | 'backup_snapshot'
  | 'tradeline_inventory_refresh';

export const OPS_PACKS: Record<string, OpsJobName[]> = {
  hourly: ['housekeeping', 'email_health', 'ron_video_cleanup', 'crm_workflow_tick'],
  daily: [
    'morning_ritual',
    'enterprise_comms',
    'journey_streak_nudge',
    'inactive_reengage',
    'bureau_followup',
    'privacy_sla',
    'email_health',
    'client_billing_dunning',
    'mfsn_member_reconcile',
    'tradeline_inventory_refresh',
  ],
  weekly: ['fundability_refresh', 'newsletter_weekly', 'weekly_owner_report', 'kb_health', 'backup_snapshot'],
  monthly: ['monthly_compliance_snapshot', 'monthly_progress_reports', 'housekeeping'],
};

function rid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

function utcDate(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function isoWeekKey(d = new Date()): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

async function startRun(env: OpsEnv, jobName: string, pack: string | undefined, triggeredBy: string, orgId?: string) {
  const id = rid();
  try {
    await env.DB.prepare(
      `INSERT INTO scheduled_job_runs (id, job_name, pack, org_id, status, started_at, triggered_by)
       VALUES (?, ?, ?, ?, 'running', datetime('now'), ?)`
    ).bind(id, jobName, pack || null, orgId || null, triggeredBy).run();
  } catch (e) {
    console.warn('[ops] startRun failed', e);
  }
  return id;
}

async function finishRun(env: OpsEnv, id: string, status: 'ok' | 'error' | 'skipped', stats: any, error?: string) {
  try {
    await env.DB.prepare(
      `UPDATE scheduled_job_runs SET status = ?, finished_at = datetime('now'), stats_json = ?, error_message = ? WHERE id = ?`
    ).bind(status, JSON.stringify(stats || {}), error || null, id).run();
  } catch (e) {
    console.warn('[ops] finishRun failed', e);
  }
}

async function writeOpsAlert(
  env: OpsEnv,
  opts: { orgId?: string | null; severity: string; category: string; title: string; body: string; meta?: any },
) {
  try {
    await env.DB.prepare(
      `INSERT INTO ops_alerts (id, org_id, severity, category, title, body, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      rid(),
      opts.orgId || null,
      opts.severity,
      opts.category,
      opts.title,
      opts.body,
      opts.meta ? JSON.stringify(opts.meta) : null,
    ).run();
  } catch (e) {
    console.warn('[ops] alert insert failed', e);
  }
}

async function isSuppressed(env: OpsEnv, email: string): Promise<boolean> {
  try {
    const row = await env.DB.prepare(
      `SELECT id FROM email_suppressions WHERE lower(email) = lower(?) LIMIT 1`
    ).bind(email).first();
    return !!row;
  } catch {
    return false;
  }
}

async function alreadyDripped(env: OpsEnv, clientId: string, dripKey: string, sendDate = utcDate()): Promise<boolean> {
  try {
    const row = await env.DB.prepare(
      `SELECT id FROM onboarding_drip_log WHERE client_id = ? AND drip_key = ? AND send_date = ?`
    ).bind(clientId, dripKey, sendDate).first();
    return !!row;
  } catch {
    return false;
  }
}

async function markDrip(env: OpsEnv, orgId: string, clientId: string, dripKey: string, channels: any, sendDate = utcDate()) {
  try {
    await env.DB.prepare(
      `INSERT INTO onboarding_drip_log (id, org_id, client_id, drip_key, send_date, channels_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(client_id, drip_key, send_date) DO UPDATE SET channels_json = excluded.channels_json`
    ).bind(rid(), orgId, clientId, dripKey, sendDate, JSON.stringify(channels || {})).run();
  } catch { /* soft */ }
}

/** Soft-touch last_engaged_at when clients interact — call from portal routes when convenient. */
export async function touchClientEngagement(env: OpsEnv, clientId: string) {
  try {
    await env.DB.prepare(`UPDATE clients SET last_engaged_at = datetime('now') WHERE id = ?`).bind(clientId).run();
  } catch { /* column may be missing until migration */ }
}

// ── Individual jobs ──────────────────────────────────────────────

export async function jobHousekeeping(env: OpsEnv, opts?: { orgId?: string }) {
  const stats = { sessions: 0, mfa: 0, verifyTokens: 0, resetTokens: 0, oldAlerts: 0, oldJobRuns: 0, demoExpired: 0, errors: 0 };
  // Session rows are retained after expiry/revoke for tenant audit (revoked_at / expires_at). Do not DELETE.
  try {
    const r = await env.DB.prepare(
      `UPDATE demo_sessions SET status = 'expired', updated_at = datetime('now') WHERE expires_at < datetime('now') AND status IN ('active','pending')`
    ).run();
    stats.demoExpired = r?.meta?.changes || 0;
  } catch { stats.errors++; }
  try {
    const r = await env.DB.prepare(
      `DELETE FROM email_verification_tokens WHERE expires_at < datetime('now')`
    ).run();
    stats.verifyTokens = r?.meta?.changes || 0;
  } catch { stats.errors++; }
  try {
    const r = await env.DB.prepare(
      `DELETE FROM password_reset_tokens WHERE expires_at < datetime('now')`
    ).run();
    stats.resetTokens = r?.meta?.changes || 0;
  } catch { stats.errors++; }
  try {
    const r = await env.DB.prepare(
      `DELETE FROM mfa_challenges WHERE expires_at < datetime('now') OR consumed = 1`
    ).run();
    stats.mfa = r?.meta?.changes || 0;
  } catch { stats.errors++; }
  // Retain portal alerts 180 days unless the client is on legal hold
  try {
    const r = await env.DB.prepare(
      `DELETE FROM portal_alerts WHERE created_at < datetime('now', '-180 days') AND status IN ('sent','simulated','failed','skipped')
       AND client_id NOT IN (SELECT id FROM clients WHERE COALESCE(data_retention_holds, 0) = 1)`
    ).run();
    stats.oldAlerts = r?.meta?.changes || 0;
  } catch { /* soft */ }
  try {
    const r = await env.DB.prepare(
      `DELETE FROM scheduled_job_runs WHERE started_at < datetime('now', '-90 days') AND status != 'running'`
    ).run();
    stats.oldJobRuns = r?.meta?.changes || 0;
  } catch { /* soft */ }
  return stats;
}

export async function jobEmailHealth(env: OpsEnv, opts?: { orgId?: string }) {
  const stats = { scanned: 0, failed: 0, simulated: 0, sent: 0, alerts: 0 };
  let sql = `SELECT status, COUNT(*) as c FROM email_delivery_log WHERE created_at >= datetime('now', '-24 hours')`;
  const binds: any[] = [];
  if (opts?.orgId) {
    sql += ` AND org_id = ?`;
    binds.push(opts.orgId);
  }
  sql += ` GROUP BY status`;
  try {
    const rows = await env.DB.prepare(sql).bind(...binds).all();
    for (const row of (rows?.results || []) as any[]) {
      const c = Number(row.c || 0);
      stats.scanned += c;
      if (row.status === 'failed') stats.failed = c;
      if (row.status === 'simulated') stats.simulated = c;
      if (row.status === 'sent') stats.sent = c;
    }
  } catch {
    return { ...stats, note: 'email_delivery_log unavailable' };
  }

  const failRate = stats.scanned ? stats.failed / stats.scanned : 0;
  const simRate = stats.scanned ? stats.simulated / stats.scanned : 0;
  if (stats.scanned >= 5 && (failRate >= 0.25 || (simRate >= 0.9 && stats.scanned >= 10))) {
    const title = failRate >= 0.25 ? 'High email failure rate' : 'Email mostly simulated (provider not live)';
    const body = [
      `Last 24h email delivery:`,
      `sent=${stats.sent} simulated=${stats.simulated} failed=${stats.failed} total=${stats.scanned}`,
      `failRate=${(failRate * 100).toFixed(1)}% simRate=${(simRate * 100).toFixed(1)}%`,
      `Check Cloudflare Email / Resend / SendGrid secrets.`,
    ].join('\n');
    await writeOpsAlert(env, {
      orgId: opts?.orgId,
      severity: failRate >= 0.25 ? 'critical' : 'warning',
      category: 'email_health',
      title,
      body,
      meta: stats,
    });
    stats.alerts++;

    // Notify org admins (or all orgs if global)
    let orgSql = `SELECT id, name FROM organizations`;
    const orgBinds: any[] = [];
    if (opts?.orgId) {
      orgSql += ` WHERE id = ?`;
      orgBinds.push(opts.orgId);
    }
    const orgs = await env.DB.prepare(orgSql).bind(...orgBinds).all().catch(() => ({ results: [] }));
    for (const org of (orgs?.results || []).slice(0, 20) as any[]) {
      const admins = await env.DB.prepare(
        `SELECT id, email, name FROM users WHERE org_id = ? AND role IN ('admin','super_admin') AND is_active = 1`
      ).bind(org.id).all().catch(() => ({ results: [] }));
      const brand = await loadOrgBrand(env, org.id);
      for (const admin of (admins?.results || []).slice(0, 3) as any[]) {
        if (!admin.email || (await isSuppressed(env, admin.email))) continue;
        if (await alreadyDripped(env, `admin:${admin.id}`, 'ops_email_health')) continue;
        const r = await sendTemplatedClientMessage(env as any, {
          templateId: 'ops_health_alert',
          orgId: org.id,
          clientId: `admin:${admin.id}`,
          email: admin.email,
          notifyEmail: true,
          skipClientAlert: true,
          brand,
          vars: {
            ...brandVars(brand),
            severity: failRate >= 0.25 ? 'critical' : 'warning',
            title,
            body,
            portalUrl: portalBaseUrl(env as any) + '/',
          },
        });
        await markDrip(env, org.id, `admin:${admin.id}`, 'ops_email_health', r);
      }
    }
  }
  return stats;
}

export async function jobJourneyStreakNudge(env: OpsEnv, opts?: { orgId?: string; limit?: number }) {
  const today = utcDate();
  const limit = opts?.limit || 500;
  let sql = `
    SELECT c.*, j.streak_days, j.last_check_in_date, j.motivation_opt_in
    FROM client_journey_state j
    JOIN clients c ON c.id = j.client_id
    WHERE COALESCE(c.status, 'active') NOT IN ('archived','purged')
      AND COALESCE(j.motivation_opt_in, 1) = 1
      AND (j.last_check_in_date IS NULL OR j.last_check_in_date < ?)
      AND COALESCE(j.last_motivation_date, '') != ?
  `;
  const binds: any[] = [today, today];
  if (opts?.orgId) {
    sql += ` AND c.org_id = ?`;
    binds.push(opts.orgId);
  }
  sql += ` ORDER BY j.streak_days DESC LIMIT ?`;
  binds.push(limit);

  const rows = await env.DB.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }));
  const stats = { scanned: (rows?.results || []).length, sent: 0, skipped: 0, errors: 0 };
  const portal = portalBaseUrl(env as any) + '/';

  for (const client of (rows?.results || []) as any[]) {
    try {
      if (!client.email || isSyntheticPortalEmail(client.email) || client.notify_email === 0) {
        stats.skipped++;
        continue;
      }
      if (await isSuppressed(env, client.email)) { stats.skipped++; continue; }
      if (await alreadyDripped(env, client.id, 'journey_streak_nudge')) { stats.skipped++; continue; }
      const brand = await loadOrgBrand(env, client.org_id);
      const r = await sendTemplatedClientMessage(env as any, {
        templateId: 'journey_checkin_nudge',
        orgId: client.org_id,
        clientId: client.id,
        email: client.email,
        notifyEmail: true,
        brand,
        vars: {
          ...brandVars(brand),
          clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
          portalUrl: portal,
        },
      });
      await markDrip(env, client.org_id, client.id, 'journey_streak_nudge', r);
      stats.sent++;
    } catch {
      stats.errors++;
    }
  }
  return stats;
}

export async function jobFundabilityRefresh(env: OpsEnv, opts?: { orgId?: string; limit?: number }) {
  const limit = opts?.limit || 200;
  let sql = `
    SELECT c.* FROM clients c
    WHERE COALESCE(c.status, 'active') NOT IN ('archived','purged')
      AND EXISTS (SELECT 1 FROM credit_reports r WHERE r.client_id = c.id)
  `;
  const binds: any[] = [];
  if (opts?.orgId) {
    sql += ` AND c.org_id = ?`;
    binds.push(opts.orgId);
  }
  sql += ` ORDER BY c.updated_at DESC LIMIT ?`;
  binds.push(limit);

  const rows = await env.DB.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }));
  const stats = { scanned: 0, refreshed: 0, notified: 0, errors: 0 };
  const portal = portalBaseUrl(env as any) + '/';

  for (const client of (rows?.results || []) as any[]) {
    stats.scanned++;
    try {
      const prev = await env.DB.prepare(
        `SELECT overall_score FROM fundability_snapshots WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`
      ).bind(client.id).first() as any;
      const report = await env.DB.prepare(
        `SELECT total_accounts, total_collections FROM credit_reports WHERE client_id = ? ORDER BY created_at DESC LIMIT 1`
      ).bind(client.id).first() as any;
      const viol = await env.DB.prepare(
        `SELECT COUNT(*) as c FROM violations WHERE client_id = ?`
      ).bind(client.id).first() as any;

      const result = await computeAndStoreFundability(env as any, {
        orgId: client.org_id,
        clientId: client.id,
        client,
        reportMeta: {
          accounts: report?.total_accounts || 0,
          collections: report?.total_collections || 0,
        },
        violationCount: viol?.c || 0,
        goal: 'mortgage',
      });
      stats.refreshed++;

      const newScore = Number((result as any)?.overallScore ?? NaN);
      const oldScore = Number(prev?.overall_score ?? NaN);
      const delta = Number.isFinite(newScore) && Number.isFinite(oldScore) ? Math.abs(newScore - oldScore) : 0;
      if (delta >= 5 && client.email && !isSyntheticPortalEmail(client.email) && client.notify_email !== 0) {
        if (!(await alreadyDripped(env, client.id, 'fundability_update_weekly'))) {
          const brand = await loadOrgBrand(env, client.org_id);
          await sendTemplatedClientMessage(env as any, {
            templateId: 'fundability_update',
            orgId: client.org_id,
            clientId: client.id,
            email: client.email,
            notifyEmail: true,
            brand,
            vars: {
              ...brandVars(brand),
              clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
              score: String(newScore),
              goal: 'mortgage',
              portalUrl: portal,
            },
          });
          await markDrip(env, client.org_id, client.id, 'fundability_update_weekly', { delta, newScore, oldScore });
          stats.notified++;
        }
      }
    } catch (e) {
      console.warn('[ops] fundability refresh failed', client.id, e);
      stats.errors++;
    }
  }
  return stats;
}

export async function jobInactiveReengage(env: OpsEnv, opts?: { orgId?: string; limit?: number }) {
  const limit = opts?.limit || 300;
  // Prefer last_engaged_at; fall back to client updated_at / created_at
  let sql = `
    SELECT c.* FROM clients c
    WHERE COALESCE(c.status, 'active') NOT IN ('archived','purged')
      AND COALESCE(c.newsletter_opt_in, 0) >= 0
      AND datetime(COALESCE(c.last_engaged_at, c.updated_at, c.created_at)) < datetime('now', '-14 days')
  `;
  const binds: any[] = [];
  if (opts?.orgId) {
    sql += ` AND c.org_id = ?`;
    binds.push(opts.orgId);
  }
  sql += ` ORDER BY COALESCE(c.last_engaged_at, c.updated_at) ASC LIMIT ?`;
  binds.push(limit);

  const rows = await env.DB.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }));
  const stats = { scanned: (rows?.results || []).length, sent14: 0, sent30: 0, skipped: 0, errors: 0 };
  const portal = portalBaseUrl(env as any) + '/';

  for (const client of (rows?.results || []) as any[]) {
    try {
      if (!client.email || isSyntheticPortalEmail(client.email) || client.notify_email === 0) {
        stats.skipped++;
        continue;
      }
      if (await isSuppressed(env, client.email)) { stats.skipped++; continue; }

      const last = new Date(client.last_engaged_at || client.updated_at || client.created_at).getTime();
      const daysSilent = Math.floor((Date.now() - last) / 86400000);
      const dripKey = daysSilent >= 30 ? 'reengage_30' : 'reengage_14';
      // Cadence: once per 14 days for 14d bucket, once per 30 for 30d
      const windowDays = daysSilent >= 30 ? 30 : 14;
      const recent = await env.DB.prepare(
        `SELECT id FROM onboarding_drip_log WHERE client_id = ? AND drip_key = ? AND send_date >= date('now', ?)`
      ).bind(client.id, dripKey, `-${windowDays} days`).first().catch(() => null);
      if (recent) { stats.skipped++; continue; }

      const brand = await loadOrgBrand(env, client.org_id);
      const r = await sendTemplatedClientMessage(env as any, {
        templateId: 'inactive_reengage',
        orgId: client.org_id,
        clientId: client.id,
        email: client.email,
        notifyEmail: true,
        brand,
        vars: {
          ...brandVars(brand),
          clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
          daysSilent: String(daysSilent),
          nudge: daysSilent >= 30
            ? 'Your advisor is ready to restart disputes and review fundability with you.'
            : 'A quick portal check-in keeps your streak and dispute calendar on track.',
          portalUrl: portal,
        },
      });
      await markDrip(env, client.org_id, client.id, dripKey, r);
      if (daysSilent >= 30) stats.sent30++;
      else stats.sent14++;
    } catch {
      stats.errors++;
    }
  }
  return stats;
}

function buildNewsletterCopy(brandName: string, weekKey: string): { title: string; subject: string; bodyHtml: string; bodyText: string } {
  const title = `${brandName} weekly credit tips · ${weekKey}`;
  const subject = title;
  const tips = [
    'Review each bureau separately — Equifax, Experian, and TransUnion often disagree on the same account.',
    'Keep copies of every dispute letter and mailing receipt; response windows usually run ~30–45 days.',
    'Utilization under 30% (ideally under 10%) on revolving accounts is a strong fundability signal.',
    'Authorized-user and primary tradelines only help when payment history and limits are strong — ask your advisor first.',
    'Never pay a collection just to “delete” without a written agreement. Document everything.',
  ];
  const tip = tips[Math.abs(weekKey.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % tips.length];
  const bodyText = [
    title,
    '',
    `This week's focus: ${tip}`,
    '',
    'In your portal you can: check My Journey, review fact-checked findings, e-sign letters, and message your credit team.',
    '',
    `— ${brandName}`,
  ].join('\n');
  const bodyHtml = `<p><strong>This week's focus</strong></p><p>${tip.replace(/</g, '&lt;')}</p><p>In your portal: My Journey, fact-checked findings, e-sign queue, and secure messaging.</p>`;
  return { title, subject, bodyHtml, bodyText };
}

export async function jobNewsletterWeekly(env: OpsEnv, opts?: { orgId?: string }) {
  const weekKey = isoWeekKey();
  const stats = { orgs: 0, issues: 0, sent: 0, skipped: 0, errors: 0 };
  let orgSql = `SELECT id, name FROM organizations`;
  const binds: any[] = [];
  if (opts?.orgId) {
    orgSql += ` WHERE id = ?`;
    binds.push(opts.orgId);
  }
  const orgs = await env.DB.prepare(orgSql).bind(...binds).all().catch(() => ({ results: [] }));
  const portal = portalBaseUrl(env as any) + '/';

  for (const org of (orgs?.results || []) as any[]) {
    stats.orgs++;
    try {
      const brand = await loadOrgBrand(env, org.id);
      const copy = buildNewsletterCopy(brand.name, weekKey);
      const issueId = rid();
      try {
        await env.DB.prepare(
          `INSERT INTO newsletter_issues (id, org_id, title, subject, body_html, body_text, issue_key, status, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'draft', datetime('now'))`
        ).bind(issueId, org.id, copy.title, copy.subject, copy.bodyHtml, copy.bodyText, weekKey).run();
      } catch {
        // Already sent this week
        const existing = await env.DB.prepare(
          `SELECT id, status FROM newsletter_issues WHERE org_id = ? AND issue_key = ?`
        ).bind(org.id, weekKey).first() as any;
        if (existing?.status === 'sent') { stats.skipped++; continue; }
      }

      // Auto-enroll clients who opted into newsletter; also honor newsletter_opt_in on clients
      const clients = await env.DB.prepare(
        `SELECT id, email, first_name, last_name, notify_email, newsletter_opt_in FROM clients
         WHERE org_id = ? AND COALESCE(status,'active') NOT IN ('archived','purged')
           AND COALESCE(newsletter_opt_in, 0) = 1
           AND email IS NOT NULL AND email != ''`
      ).bind(org.id).all().catch(() => ({ results: [] }));

      let issueSent = 0;
      for (const client of (clients?.results || []) as any[]) {
        if (isSyntheticPortalEmail(client.email) || client.notify_email === 0) { stats.skipped++; continue; }
        if (await isSuppressed(env, client.email)) { stats.skipped++; continue; }
        const r = await sendTemplatedClientMessage(env as any, {
          templateId: 'client_newsletter',
          orgId: org.id,
          clientId: client.id,
          email: client.email,
          notifyEmail: true,
          brand,
          vars: {
            ...brandVars(brand),
            clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
            title: copy.title,
            subject: copy.subject,
            bodyHtml: copy.bodyHtml,
            bodyText: copy.bodyText,
            portalUrl: portal,
            unsubscribeUrl: `${portal}?page=client-settings`,
          },
        });
        try {
          await env.DB.prepare(
            `INSERT INTO newsletter_deliveries (id, issue_id, org_id, client_id, email, status, provider, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
          ).bind(
            rid(),
            issueId,
            org.id,
            client.id,
            client.email,
            r.deliveryStatus || 'unknown',
            r.channels?.provider || null,
          ).run();
        } catch { /* soft */ }
        issueSent++;
        stats.sent++;
      }

      await env.DB.prepare(
        `UPDATE newsletter_issues SET status = 'sent', sent_at = datetime('now'), stats_json = ? WHERE id = ? OR (org_id = ? AND issue_key = ?)`
      ).bind(JSON.stringify({ sent: issueSent }), issueId, org.id, weekKey).run().catch(() => null);
      stats.issues++;
    } catch (e) {
      console.warn('[ops] newsletter org failed', org.id, e);
      stats.errors++;
    }
  }
  return stats;
}

export async function jobBureauFollowup(env: OpsEnv, opts?: { orgId?: string }) {
  const stats = { orgs: 0, overdueDocs: 0, emails: 0, skipped: 0 };
  let orgSql = `SELECT id, name FROM organizations`;
  const binds: any[] = [];
  if (opts?.orgId) {
    orgSql += ` WHERE id = ?`;
    binds.push(opts.orgId);
  }
  const orgs = await env.DB.prepare(orgSql).bind(...binds).all().catch(() => ({ results: [] }));

  for (const org of (orgs?.results || []) as any[]) {
    stats.orgs++;
    const docs = await env.DB.prepare(
      `SELECT d.id, d.title, d.response_due_date, d.status, c.first_name, c.last_name
       FROM documents d JOIN clients c ON c.id = d.client_id
       WHERE d.org_id = ? AND d.status = 'sent'
         AND d.response_due_date IS NOT NULL
         AND date(d.response_due_date) < date('now')
       ORDER BY d.response_due_date ASC LIMIT 40`
    ).bind(org.id).all().catch(() => ({ results: [] }));

    const list = (docs?.results || []) as any[];
    stats.overdueDocs += list.length;
    if (!list.length) { stats.skipped++; continue; }

    const digestBody = [
      `Overdue bureau responses for ${org.name}:`,
      ``,
      ...list.map((d) => `• ${d.first_name} ${d.last_name} — ${d.title || 'Dispute'} (due ${d.response_due_date})`),
      ``,
      `Record responses or escalate next-round disputes in the CRM.`,
    ].join('\n');

    const brand = await loadOrgBrand(env, org.id);
    const admins = await env.DB.prepare(
      `SELECT id, email, name FROM users WHERE org_id = ? AND role IN ('admin','super_admin','member') AND is_active = 1`
    ).bind(org.id).all().catch(() => ({ results: [] }));

    for (const admin of (admins?.results || []).slice(0, 5) as any[]) {
      if (!admin.email || (await isSuppressed(env, admin.email))) continue;
      if (await alreadyDripped(env, `admin:${admin.id}`, 'bureau_followup')) continue;
      await sendTemplatedClientMessage(env as any, {
        templateId: 'bureau_followup_staff',
        orgId: org.id,
        clientId: `admin:${admin.id}`,
        email: admin.email,
        notifyEmail: true,
        skipClientAlert: true,
        brand,
        vars: {
          ...brandVars(brand),
          count: String(list.length),
          digestBody,
          portalUrl: portalBaseUrl(env as any) + '/',
        },
      });
      await markDrip(env, org.id, `admin:${admin.id}`, 'bureau_followup', { count: list.length });
      stats.emails++;
    }
  }
  return stats;
}

export async function jobPrivacySla(env: OpsEnv, opts?: { orgId?: string }) {
  const stats = { scanned: 0, alerted: 0, errors: 0 };
  let sql = `
    SELECT p.*, c.first_name, c.last_name FROM privacy_requests p
    LEFT JOIN clients c ON c.id = p.client_id
    WHERE p.status IN ('pending','in_progress','received','open')
      AND datetime(p.created_at) <= datetime('now', '-7 days')
  `;
  const binds: any[] = [];
  if (opts?.orgId) {
    sql += ` AND p.org_id = ?`;
    binds.push(opts.orgId);
  }
  sql += ` ORDER BY p.created_at ASC LIMIT 100`;
  const rows = await env.DB.prepare(sql).bind(...binds).all().catch(() => ({ results: [] }));
  stats.scanned = (rows?.results || []).length;

  for (const req of (rows?.results || []) as any[]) {
    try {
      const daysOpen = Math.floor((Date.now() - new Date(req.created_at).getTime()) / 86400000);
      await writeOpsAlert(env, {
        orgId: req.org_id,
        severity: daysOpen >= 25 ? 'critical' : 'warning',
        category: 'privacy_sla',
        title: `Privacy ${req.request_type} open ${daysOpen}d`,
        body: `Request ${req.id} for ${req.first_name || ''} ${req.last_name || ''} status=${req.status}`,
        meta: { requestId: req.id, daysOpen },
      });

      const admins = await env.DB.prepare(
        `SELECT id, email, name FROM users WHERE org_id = ? AND role IN ('admin','super_admin') AND is_active = 1`
      ).bind(req.org_id).all().catch(() => ({ results: [] }));
      const brand = await loadOrgBrand(env, req.org_id);
      for (const admin of (admins?.results || []).slice(0, 3) as any[]) {
        if (!admin.email) continue;
        if (await alreadyDripped(env, `admin:${admin.id}`, `privacy_sla_${req.id}`)) continue;
        await sendTemplatedClientMessage(env as any, {
          templateId: 'privacy_sla_alert',
          orgId: req.org_id,
          clientId: `admin:${admin.id}`,
          email: admin.email,
          notifyEmail: true,
          skipClientAlert: true,
          brand,
          vars: {
            ...brandVars(brand),
            requestId: req.id,
            requestType: req.request_type || 'privacy',
            daysOpen: String(daysOpen),
            status: req.status || '',
            clientName: `${req.first_name || ''} ${req.last_name || ''}`.trim(),
            portalUrl: portalBaseUrl(env as any) + '/',
          },
        });
        await markDrip(env, req.org_id, `admin:${admin.id}`, `privacy_sla_${req.id}`, { daysOpen });
      }
      stats.alerted++;
    } catch {
      stats.errors++;
    }
  }
  return stats;
}

export async function jobRonVideoCleanup(env: OpsEnv, opts?: { orgId?: string }) {
  const stats = { ronExpired: 0, videoClosed: 0, errors: 0 };
  try {
    let sql = `
      UPDATE ron_sessions SET status = 'cancelled', updated_at = datetime('now'),
        error_message = COALESCE(error_message, 'Auto-expired after 72h without completion')
      WHERE status IN ('created','identity_pending','identity_verified','in_session')
        AND datetime(created_at) < datetime('now', '-72 hours')
    `;
    const binds: any[] = [];
    if (opts?.orgId) {
      sql += ` AND org_id = ?`;
      binds.push(opts.orgId);
    }
    const r = await env.DB.prepare(sql).bind(...binds).run();
    stats.ronExpired = r?.meta?.changes || 0;
  } catch { stats.errors++; }

  try {
    let sql = `
      UPDATE video_conference_sessions SET status = 'cancelled', updated_at = datetime('now'),
        ended_at = COALESCE(ended_at, datetime('now'))
      WHERE status IN ('scheduled','live')
        AND datetime(COALESCE(scheduled_at, created_at)) < datetime('now', '-24 hours')
    `;
    const binds: any[] = [];
    if (opts?.orgId) {
      sql += ` AND org_id = ?`;
      binds.push(opts.orgId);
    }
    const r = await env.DB.prepare(sql).bind(...binds).run();
    stats.videoClosed = r?.meta?.changes || 0;
  } catch { stats.errors++; }
  return stats;
}

export async function jobKbHealth(env: OpsEnv, opts?: { orgId?: string }) {
  const stats = { chunks: 0, seeded: 0, retrievalOk: false, errors: 0 };
  try {
    const row = await env.DB.prepare(`SELECT COUNT(*) as c FROM knowledge_chunks`).first() as any;
    stats.chunks = Number(row?.c || 0);
    if (stats.chunks < 10) {
      const kb = await seedKnowledgeBase(env as any);
      stats.seeded = kb?.upserted || 0;
      stats.chunks += stats.seeded;
    }
    const hits = await retrieveKnowledge(env as any, 'FCRA accuracy dispute statute 1681i', 3);
    stats.retrievalOk = Array.isArray(hits?.results) ? hits.results.length > 0 : false;
  } catch (e) {
    console.warn('[ops] kb health', e);
    stats.errors++;
  }
  if (!stats.retrievalOk || stats.chunks < 5) {
    await writeOpsAlert(env, {
      orgId: opts?.orgId,
      severity: 'warning',
      category: 'knowledge',
      title: 'Knowledge base health check failed',
      body: `chunks=${stats.chunks} retrievalOk=${stats.retrievalOk}`,
      meta: stats,
    });
  }
  return stats;
}

export async function jobWeeklyOwnerReport(env: OpsEnv, opts?: { orgId?: string }) {
  const weekKey = isoWeekKey();
  const stats = { orgs: 0, emails: 0, skipped: 0 };
  let orgSql = `SELECT id, name FROM organizations`;
  const binds: any[] = [];
  if (opts?.orgId) {
    orgSql += ` WHERE id = ?`;
    binds.push(opts.orgId);
  }
  const orgs = await env.DB.prepare(orgSql).bind(...binds).all().catch(() => ({ results: [] }));

  for (const org of (orgs?.results || []) as any[]) {
    stats.orgs++;
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const [clients, reports, sentDocs, overdue, unsigned, failedMail, posture] = await Promise.all([
      env.DB.prepare(`SELECT COUNT(*) as c FROM clients WHERE org_id = ? AND created_at >= ?`).bind(org.id, since).first().catch(() => ({ c: 0 })),
      env.DB.prepare(`SELECT COUNT(*) as c FROM credit_reports WHERE org_id = ? AND created_at >= ?`).bind(org.id, since).first().catch(() => ({ c: 0 })),
      env.DB.prepare(`SELECT COUNT(*) as c FROM documents WHERE org_id = ? AND status = 'sent' AND updated_at >= ?`).bind(org.id, since).first().catch(() => ({ c: 0 })),
      env.DB.prepare(`SELECT COUNT(*) as c FROM documents WHERE org_id = ? AND status = 'sent' AND response_due_date IS NOT NULL AND date(response_due_date) < date('now')`).bind(org.id).first().catch(() => ({ c: 0 })),
      env.DB.prepare(`SELECT COUNT(*) as c FROM clients WHERE org_id = ? AND (croa_contract_agreed = 0 OR croa_contract_agreed IS NULL)`).bind(org.id).first().catch(() => ({ c: 0 })),
      env.DB.prepare(`SELECT COUNT(*) as c FROM email_delivery_log WHERE org_id = ? AND status = 'failed' AND created_at >= ?`).bind(org.id, since).first().catch(() => ({ c: 0 })),
      buildSecurityPosture(env as any),
    ]);

    const reportBody = [
      `Weekly owner report · ${weekKey}`,
      `Organization: ${org.name}`,
      ``,
      `New clients (7d): ${(clients as any)?.c || 0}`,
      `Reports analyzed (7d): ${(reports as any)?.c || 0}`,
      `Disputes mailed (7d): ${(sentDocs as any)?.c || 0}`,
      `Overdue bureau responses: ${(overdue as any)?.c || 0}`,
      `Clients missing CROA: ${(unsigned as any)?.c || 0}`,
      `Failed emails (7d): ${(failedMail as any)?.c || 0}`,
      `Security posture score: ${(posture as any)?.score ?? '—'}`,
      ``,
      `Open Compliance Hub and CRM to clear blockers.`,
    ].join('\n');

    const brand = await loadOrgBrand(env, org.id);
    const admins = await env.DB.prepare(
      `SELECT id, email, name FROM users WHERE org_id = ? AND role IN ('admin','super_admin') AND is_active = 1`
    ).bind(org.id).all().catch(() => ({ results: [] }));

    for (const admin of (admins?.results || []) as any[]) {
      if (!admin.email) continue;
      if (await alreadyDripped(env, `admin:${admin.id}`, `weekly_owner_${weekKey}`)) { stats.skipped++; continue; }
      await sendTemplatedClientMessage(env as any, {
        templateId: 'weekly_owner_report',
        orgId: org.id,
        clientId: `admin:${admin.id}`,
        email: admin.email,
        notifyEmail: true,
        skipClientAlert: true,
        brand,
        vars: {
          ...brandVars(brand),
          weekKey,
          reportBody,
          portalUrl: portalBaseUrl(env as any) + '/',
        },
      });
      await markDrip(env, org.id, `admin:${admin.id}`, `weekly_owner_${weekKey}`, { weekKey });
      stats.emails++;
    }
  }
  return stats;
}

export async function jobMonthlyComplianceSnapshot(env: OpsEnv, opts?: { orgId?: string }) {
  const period = monthKey();
  const stats = { orgs: 0, snapshots: 0, errors: 0 };
  let orgSql = `SELECT id, name FROM organizations`;
  const binds: any[] = [];
  if (opts?.orgId) {
    orgSql += ` WHERE id = ?`;
    binds.push(opts.orgId);
  }
  const orgs = await env.DB.prepare(orgSql).bind(...binds).all().catch(() => ({ results: [] }));

  for (const org of (orgs?.results || []) as any[]) {
    stats.orgs++;
    try {
      const existing = await env.DB.prepare(
        `SELECT id FROM compliance_snapshots WHERE org_id = ? AND period_key = ?`
      ).bind(org.id, period).first();
      if (existing) continue;

      const [croa, contracts, esign, privacy, ron, posture] = await Promise.all([
        env.DB.prepare(`SELECT COUNT(*) as c FROM clients WHERE org_id = ? AND croa_contract_agreed = 1`).bind(org.id).first(),
        env.DB.prepare(`SELECT status, COUNT(*) as c FROM legal_contracts WHERE org_id = ? GROUP BY status`).bind(org.id).all().catch(() => ({ results: [] })),
        env.DB.prepare(`SELECT COUNT(*) as c FROM esign_consent_events WHERE org_id = ?`).bind(org.id).first().catch(() => ({ c: 0 })),
        env.DB.prepare(`SELECT status, COUNT(*) as c FROM privacy_requests WHERE org_id = ? GROUP BY status`).bind(org.id).all().catch(() => ({ results: [] })),
        env.DB.prepare(`SELECT status, COUNT(*) as c FROM ron_sessions WHERE org_id = ? GROUP BY status`).bind(org.id).all().catch(() => ({ results: [] })),
        buildSecurityPosture(env as any),
      ]);

      const snapshot = {
        period,
        orgId: org.id,
        orgName: org.name,
        croaAgreedClients: (croa as any)?.c || 0,
        contractsByStatus: (contracts as any)?.results || [],
        esignEvents: (esign as any)?.c || 0,
        privacyByStatus: (privacy as any)?.results || [],
        ronByStatus: (ron as any)?.results || [],
        postureScore: (posture as any)?.score ?? null,
        capturedAt: new Date().toISOString(),
      };

      await env.DB.prepare(
        `INSERT INTO compliance_snapshots (id, org_id, period_key, snapshot_json, posture_score, created_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`
      ).bind(rid(), org.id, period, JSON.stringify(snapshot), snapshot.postureScore).run();
      stats.snapshots++;
    } catch (e) {
      console.warn('[ops] compliance snapshot', org.id, e);
      stats.errors++;
    }
  }
  return stats;
}

export async function jobBackupSnapshot(env: OpsEnv, opts?: { orgId?: string }) {
  const stats = { uploaded: false, key: null as string | null, tables: 0, rows: 0, note: '' };
  if (!env.DOCS) {
    stats.note = 'DOCS R2 binding missing — skipped';
    await writeOpsAlert(env, {
      orgId: opts?.orgId,
      severity: 'warning',
      category: 'backup',
      title: 'Scheduled backup skipped',
      body: 'R2 DOCS binding not configured for automated JSON snapshot.',
    });
    return stats;
  }

  const tables = OPS_BACKUP_TABLES;
  const payload: Record<string, any> = {
    createdAt: new Date().toISOString(),
    type: 'ops_scheduled_snapshot',
    tables: {},
  };

  for (const table of tables) {
    try {
      const rows = await env.DB.prepare(`SELECT * FROM ${table} LIMIT 5000`).all();
      payload.tables[table] = rows?.results || [];
      stats.tables++;
      stats.rows += (rows?.results || []).length;
    } catch {
      payload.tables[table] = { error: 'unavailable' };
    }
  }

  const key = `backups/d1/ops_snapshot_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  await env.DOCS.put(key, JSON.stringify(payload), {
    httpMetadata: { contentType: 'application/json' },
    customMetadata: { source: 'ops-scheduler', tables: String(stats.tables) },
  });
  stats.uploaded = true;
  stats.key = key;
  await writeOpsAlert(env, {
    orgId: opts?.orgId,
    severity: 'info',
    category: 'backup',
    title: 'Scheduled backup snapshot uploaded',
    body: `R2 key ${key} · tables=${stats.tables} rows≈${stats.rows}`,
    meta: stats,
  });
  return stats;
}

// ── Runner ───────────────────────────────────────────────────────

type JobFn = (env: OpsEnv, opts?: { orgId?: string; limit?: number }) => Promise<any>;

async function jobTradelineInventoryRefresh(env: OpsEnv) {
  if (!tradelineMasterConfigured(env)) {
    return { skipped: true, reason: 'tradeline_not_configured' };
  }
  const sync = await syncTradelineInventory(env as any);
  return {
    ok: !!sync.ok,
    count: sync.count,
    fetchedAt: sync.fetchedAt,
    balance: sync.balance,
    error: sync.error || null,
  };
}

async function jobMonthlyProgressReports(env: OpsEnv) {
  const { runMonthlyProgressReports } = await import('./progress-report');
  const { sendAppEmail } = await import('./email');
  return runMonthlyProgressReports({
    db: env.DB,
    sendEmail: async ({ email, subject, body }) => {
      await sendAppEmail(env as any, { to: email, subject, text: body });
    },
  });
}

async function jobClientBillingDunning(env: OpsEnv) {
  const { sendAppEmail } = await import('./email');
  const pastDue = await env.DB.prepare(
    `SELECT c.id, c.org_id, c.email, c.first_name, c.dunning_stage, c.payment_status
     FROM clients c WHERE c.dunning_stage > 0 AND c.payment_status IN ('past_due','suspended') AND c.notify_email = 1 LIMIT 200`,
  ).all();
  let sent = 0;
  for (const row of ((pastDue as any)?.results || []) as any[]) {
    if (!row.email || String(row.email).includes('@smartfcra.local')) continue;
    try {
      await sendAppEmail(env as any, {
        to: row.email,
        subject: 'Payment reminder — action needed on your account',
        text: `Hi ${row.first_name || 'there'},\n\nOur records show a past-due balance on your credit services account. Please sign in to update your payment method: ${portalBaseUrl(env as any)}/\n\nIf you have questions, contact your service provider. We do not guarantee specific credit outcomes.`,
      });
      sent += 1;
    } catch { /* soft */ }
  }
  return { sent, total: ((pastDue as any)?.results || []).length };
}

async function jobCrmWorkflowTick(env: OpsEnv) {
  return processDueWorkflowSteps({
    db: env.DB,
    env,
    generateId: rid,
    limit: 100,
  });
}

async function jobMfsnMemberReconcile(env: OpsEnv, opts?: { orgId?: string }) {
  let orgs: any[] = [];
  if (opts?.orgId) {
    orgs = [{ id: opts.orgId, name: '', settings: '{}' }];
  } else {
    const rows = await env.DB.prepare(
      `SELECT id, name, settings FROM organizations WHERE coalesce(json_extract(settings, '$.integrations.mfsn.enabled'), 1) != 0 LIMIT 50`,
    ).all();
    orgs = rows.results || [];
  }
  let totalCreated = 0;
  let totalUpdated = 0;
  const errors: string[] = [];
  for (const org of orgs) {
    let settings = {};
    try { settings = JSON.parse(org.settings || '{}'); } catch { /* */ }
    const result = await reconcileMfsnMembersToClients({
      db: env.DB,
      env,
      orgId: org.id,
      orgSettings: settings,
      orgName: org.name,
      generateId: rid,
      syncGhl: true,
    });
    totalCreated += result.created;
    totalUpdated += result.updated;
    errors.push(...result.errors);
  }
  return { orgs: orgs.length, created: totalCreated, updated: totalUpdated, errors: errors.slice(0, 10) };
}

const JOB_MAP: Record<OpsJobName, JobFn> = {
  housekeeping: jobHousekeeping,
  email_health: jobEmailHealth,
  enterprise_comms: async (env, opts) => runEnterpriseCommsCron(env, opts),
  morning_ritual: async (env, opts) => dispatchDailyMotivationBatch(env, { orgId: opts?.orgId, limit: opts?.limit || 2000 }),
  journey_streak_nudge: jobJourneyStreakNudge,
  fundability_refresh: jobFundabilityRefresh,
  inactive_reengage: jobInactiveReengage,
  newsletter_weekly: jobNewsletterWeekly,
  bureau_followup: jobBureauFollowup,
  privacy_sla: jobPrivacySla,
  ron_video_cleanup: jobRonVideoCleanup,
  kb_health: jobKbHealth,
  weekly_owner_report: jobWeeklyOwnerReport,
  monthly_compliance_snapshot: jobMonthlyComplianceSnapshot,
  monthly_progress_reports: jobMonthlyProgressReports,
  client_billing_dunning: jobClientBillingDunning,
  crm_workflow_tick: jobCrmWorkflowTick,
  mfsn_member_reconcile: jobMfsnMemberReconcile,
  backup_snapshot: jobBackupSnapshot,
  tradeline_inventory_refresh: jobTradelineInventoryRefresh,
};

export async function runOpsJob(
  env: OpsEnv,
  jobName: OpsJobName,
  opts?: { orgId?: string; pack?: string; triggeredBy?: string; limit?: number },
) {
  const fn = JOB_MAP[jobName];
  if (!fn) return { job: jobName, status: 'error', error: 'unknown_job' };
  const runId = await startRun(env, jobName, opts?.pack, opts?.triggeredBy || 'cron', opts?.orgId);
  try {
    const stats = await fn(env, { orgId: opts?.orgId, limit: opts?.limit });
    await finishRun(env, runId, 'ok', stats);
    return { job: jobName, status: 'ok', runId, stats };
  } catch (e: any) {
    await finishRun(env, runId, 'error', {}, e?.message || 'job_failed');
    return { job: jobName, status: 'error', runId, error: e?.message || 'job_failed' };
  }
}

export async function runOpsPack(
  env: OpsEnv,
  pack: keyof typeof OPS_PACKS | string,
  opts?: { orgId?: string; jobs?: OpsJobName[]; triggeredBy?: string },
) {
  const jobs = opts?.jobs?.length ? opts.jobs : (OPS_PACKS[pack] || []);
  const results: any[] = [];
  for (const job of jobs) {
    results.push(await runOpsJob(env, job, { orgId: opts?.orgId, pack, triggeredBy: opts?.triggeredBy || 'cron' }));
  }
  return {
    pack,
    ranAt: new Date().toISOString(),
    jobs: results,
    ok: results.every((r) => r.status === 'ok'),
  };
}

export function listOpsJobs() {
  return {
    packs: OPS_PACKS,
    jobs: Object.keys(JOB_MAP),
    schedules: {
      hourly: '17 * * * * — housekeeping, email health, RON/video cleanup',
      daily_morning: '0 13 * * * — morning ritual (also dedicated workflow)',
      daily_comms: '0 14 * * * — enterprise comms + streak + reengage + bureau + privacy',
      weekly: '0 15 * * 1 — fundability, newsletter, owner report, KB, backup snapshot',
      monthly: '0 10 1 * * — compliance snapshot + deep housekeeping',
    },
  };
}
