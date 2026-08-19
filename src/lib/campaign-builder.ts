/**
 * Marketing campaign builder MVP — saved segments + email/SMS broadcast.
 */
import { canSendMessage, logCommunicationAttempt } from './comms-compliance';
export type CampaignSegment = {
  id: string;
  label: string;
  sql: string;
  binds?: string[];
};

export const BUILTIN_SEGMENTS: CampaignSegment[] = [
  {
    id: 'inactive_30',
    label: 'No engagement in 30 days',
    sql: `SELECT id, email, first_name, last_name FROM clients WHERE org_id = ? AND status = 'active'
      AND (last_engaged_at IS NULL OR last_engaged_at < datetime('now', '-30 days'))
      AND notify_email = 1 LIMIT 500`,
  },
  {
    id: 'clock_expiring',
    label: 'Investigation clock expiring in 7 days',
    sql: `SELECT DISTINCT c.id, c.email, c.first_name, c.last_name FROM clients c
      JOIN investigation_clocks ic ON ic.client_id = c.id AND ic.org_id = c.org_id
      WHERE c.org_id = ? AND ic.status = 'open' AND ic.operational_target <= date('now', '+7 days')
      AND c.notify_email = 1 LIMIT 500`,
  },
  {
    id: 'onboarding',
    label: 'Onboarding — no report yet',
    sql: `SELECT c.id, c.email, c.first_name, c.last_name FROM clients c
      WHERE c.org_id = ? AND c.case_status = 'ONBOARDING'
      AND NOT EXISTS (SELECT 1 FROM credit_reports cr WHERE cr.client_id = c.id)
      AND c.notify_email = 1 LIMIT 500`,
  },
  {
    id: 'newsletter_opt_in',
    label: 'Newsletter opt-in',
    sql: `SELECT id, email, first_name, last_name FROM clients WHERE org_id = ? AND newsletter_opt_in = 1 LIMIT 500`,
  },
];

export async function resolveSegmentAudience(
  db: D1Database,
  orgId: string,
  segmentId: string,
): Promise<any[]> {
  const seg = BUILTIN_SEGMENTS.find((s) => s.id === segmentId);
  if (!seg) return [];
  const rows = await db.prepare(seg.sql).bind(orgId, ...(seg.binds || [])).all();
  return rows.results || [];
}

export async function runCampaignDelivery(opts: {
  db: D1Database;
  env: any;
  orgId: string;
  campaignId: string;
  sendEmail: (args: { to: string; subject: string; body: string }) => Promise<void>;
}): Promise<{ sent: number; failed: number }> {
  const campaign = await opts.db.prepare(
    'SELECT * FROM marketing_campaigns WHERE id = ? AND org_id = ?',
  ).bind(opts.campaignId, opts.orgId).first() as any;
  if (!campaign) return { sent: 0, failed: 0 };

  let segment: any = {};
  try { segment = JSON.parse(campaign.segment_json || '{}'); } catch { /* */ }
  const audience = await resolveSegmentAudience(opts.db, opts.orgId, segment.id || 'inactive_30');

  let sent = 0;
  let failed = 0;
  for (const client of audience) {
    const deliveryId = crypto.randomUUID();
    const email = client.email;
    if (!email || String(email).includes('@smartfcra.local')) {
      failed += 1;
      continue;
    }
    const body = String(campaign.body_template || '')
      .replace(/\{first_name\}/g, client.first_name || '')
      .replace(/\{last_name\}/g, client.last_name || '');
    const gate = await canSendMessage({
      db: opts.db,
      orgId: opts.orgId,
      clientId: client.id,
      email,
      lane: 'marketing',
      channel: 'email',
      campaignId: opts.campaignId,
    });
    const attemptId = crypto.randomUUID();
    await logCommunicationAttempt(opts.db, {
      ...gate,
      id: attemptId,
      db: opts.db,
      orgId: opts.orgId,
      clientId: client.id,
      email,
      lane: 'marketing',
      channel: 'email',
      campaignId: opts.campaignId,
      renderedSubject: campaign.subject || campaign.name,
      sent: false,
    });
    if (!gate.allowed) {
      await opts.db.prepare(
        `INSERT INTO campaign_deliveries (id, org_id, campaign_id, client_id, email, status, error) VALUES (?, ?, ?, ?, ?, 'blocked', ?)`,
      ).bind(deliveryId, opts.orgId, opts.campaignId, client.id, email, gate.reasons.join('; ').slice(0, 500)).run();
      failed += 1;
      continue;
    }
    try {
      await opts.sendEmail({ to: email, subject: campaign.subject || campaign.name, body });
      await opts.db.prepare(
        `INSERT INTO campaign_deliveries (id, org_id, campaign_id, client_id, email, status) VALUES (?, ?, ?, ?, ?, 'sent')`,
      ).bind(deliveryId, opts.orgId, opts.campaignId, client.id, email).run();
      sent += 1;
    } catch (err: any) {
      await opts.db.prepare(
        `INSERT INTO campaign_deliveries (id, org_id, campaign_id, client_id, email, status, error) VALUES (?, ?, ?, ?, ?, 'failed', ?)`,
      ).bind(deliveryId, opts.orgId, opts.campaignId, client.id, email, String(err?.message || err).slice(0, 500)).run();
      failed += 1;
    }
  }

  await opts.db.prepare(
    `UPDATE marketing_campaigns SET status = 'sent', sent_at = datetime('now'), stats_json = ? WHERE id = ?`,
  ).bind(JSON.stringify({ sent, failed, audience: audience.length }), opts.campaignId).run();

  return { sent, failed };
}
