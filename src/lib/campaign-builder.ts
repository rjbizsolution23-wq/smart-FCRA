/**
 * Marketing campaign delivery — brand-matched email + org Twilio SMS.
 */
import { canSendMessage, logCommunicationAttempt } from './comms-compliance';
import { sendBrandedOrgEmail } from './comms-branding';
import { sendSms } from './alerts';
import { loadOrgBrand } from './org-branding';

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
    sql: `SELECT id, email, first_name, last_name, phone, phone_e164 FROM clients WHERE org_id = ? AND status = 'active'
      AND (last_engaged_at IS NULL OR last_engaged_at < datetime('now', '-30 days'))
      AND notify_email = 1 LIMIT 500`,
  },
  {
    id: 'clock_expiring',
    label: 'Investigation clock expiring in 7 days',
    sql: `SELECT DISTINCT c.id, c.email, c.first_name, c.last_name, c.phone, c.phone_e164 FROM clients c
      JOIN investigation_clocks ic ON ic.client_id = c.id AND ic.org_id = c.org_id
      WHERE c.org_id = ? AND ic.status = 'open' AND ic.operational_target <= date('now', '+7 days')
      AND c.notify_email = 1 LIMIT 500`,
  },
  {
    id: 'onboarding',
    label: 'Onboarding — no report yet',
    sql: `SELECT c.id, c.email, c.first_name, c.last_name, c.phone, c.phone_e164 FROM clients c
      WHERE c.org_id = ? AND c.case_status = 'ONBOARDING'
      AND NOT EXISTS (SELECT 1 FROM credit_reports cr WHERE cr.client_id = c.id)
      AND c.notify_email = 1 LIMIT 500`,
  },
  {
    id: 'newsletter_opt_in',
    label: 'Newsletter opt-in',
    sql: `SELECT id, email, first_name, last_name, phone, phone_e164 FROM clients WHERE org_id = ? AND newsletter_opt_in = 1 LIMIT 500`,
  },
];

/** One-click starter campaigns — brand placeholders replaced at send time. */
export const STARTER_CAMPAIGNS = [
  {
    id: 'reengage_inactive',
    name: 'Re-engage inactive clients (30 days)',
    segmentId: 'inactive_30',
    channel: 'email',
    subject: '{{org_name}} — quick check-in on your credit file',
    bodyTemplate: 'Hi {first_name},\n\nWe have not heard from you in a while. Your advisor can review where your file stands and what the next compliant step is — no score guarantees, just facts from your report.\n\nReply to this email or log into your portal when you are ready.\n\n— {{org_name}}',
  },
  {
    id: 'onboarding_nudge',
    name: 'Onboarding — upload your first report',
    segmentId: 'onboarding',
    channel: 'email',
    subject: '{{org_name}} — finish setup (upload ID + report)',
    bodyTemplate: 'Hi {first_name},\n\nYour file is started but we still need your bureau report or MFSN pull to run the violation engine. Upload in the portal under Get Started — we generate letters from your file facts, not blank templates.\n\n— {{org_name}}',
  },
  {
    id: 'clock_reminder',
    name: 'Investigation clock expiring (7 days)',
    segmentId: 'clock_expiring',
    channel: 'email',
    subject: '{{org_name}} — bureau investigation clock update',
    bodyTemplate: 'Hi {first_name},\n\nA bureau investigation clock on your file is approaching its operational deadline. Your advisor is tracking statutory timelines — this is a status update, not a promise of deletion.\n\n— {{org_name}}',
  },
  {
    id: 'newsletter_rights',
    name: 'Consumer rights newsletter (opt-in only)',
    segmentId: 'newsletter_opt_in',
    channel: 'email',
    subject: '{{org_name}} — FCRA rights reminder',
    bodyTemplate: 'Hi {first_name},\n\nYou opted in to educational updates. Remember: you have the right to dispute inaccurate information under the FCRA. Smart FCRA helps your firm document that process — not replace legal counsel.\n\nUnsubscribe anytime in portal Privacy settings.\n\n— {{org_name}}',
  },
  {
    id: 'sms_reengage',
    name: 'SMS check-in (inactive 30 days)',
    segmentId: 'inactive_30',
    channel: 'sms',
    subject: 'SMS check-in',
    bodyTemplate: 'Hi {first_name}, {{org_name}} here — log into your portal when you have a minute.',
  },
] as const;

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
}): Promise<{ sent: number; failed: number }> {
  const campaign = await opts.db.prepare(
    'SELECT * FROM marketing_campaigns WHERE id = ? AND org_id = ?',
  ).bind(opts.campaignId, opts.orgId).first() as any;
  if (!campaign) return { sent: 0, failed: 0 };

  const brand = await loadOrgBrand(opts.env, opts.orgId);
  const orgName = brand.name || 'Your firm';
  const channel = String(campaign.channel || 'email');

  let segment: any = {};
  try { segment = JSON.parse(campaign.segment_json || '{}'); } catch { /* */ }
  const audience = await resolveSegmentAudience(opts.db, opts.orgId, segment.id || 'inactive_30');

  let sent = 0;
  let failed = 0;
  for (const client of audience) {
    const deliveryId = crypto.randomUUID();
    const body = String(campaign.body_template || '')
      .replace(/\{first_name\}/g, client.first_name || '')
      .replace(/\{last_name\}/g, client.last_name || '')
      .replace(/\{\{org_name\}\}/g, orgName);
    const subject = String(campaign.subject || campaign.name || '').replace(/\{\{org_name\}\}/g, orgName);

    if (channel === 'sms') {
      const phone = client.phone_e164 || client.phone;
      if (!phone) {
        failed += 1;
        continue;
      }
      const gate = await canSendMessage({
        db: opts.db,
        orgId: opts.orgId,
        clientId: client.id,
        phone,
        lane: 'marketing',
        channel: 'sms',
        campaignId: opts.campaignId,
      });
      const attemptId = crypto.randomUUID();
      await logCommunicationAttempt(opts.db, {
        ...gate,
        id: attemptId,
        db: opts.db,
        orgId: opts.orgId,
        clientId: client.id,
        phone,
        lane: 'marketing',
        channel: 'sms',
        campaignId: opts.campaignId,
        sent: false,
      });
      if (!gate.allowed) {
        await opts.db.prepare(
          `INSERT INTO campaign_deliveries (id, org_id, campaign_id, client_id, email, status, error) VALUES (?, ?, ?, ?, ?, 'blocked', ?)`,
        ).bind(deliveryId, opts.orgId, opts.campaignId, client.id, phone, gate.reasons.join('; ').slice(0, 500)).run();
        failed += 1;
        continue;
      }
      try {
        const sms = await sendSms(opts.env, phone, body, { orgId: opts.orgId });
        if (!sms.sent) throw new Error(sms.error || 'sms_failed');
        await opts.db.prepare(
          `INSERT INTO campaign_deliveries (id, org_id, campaign_id, client_id, email, status) VALUES (?, ?, ?, ?, ?, 'sent')`,
        ).bind(deliveryId, opts.orgId, opts.campaignId, client.id, phone).run();
        await opts.db.prepare('UPDATE communication_attempts SET sent = 1, provider_status = ? WHERE id = ?')
          .bind('sent', attemptId).run();
        sent += 1;
      } catch (err: any) {
        await opts.db.prepare(
          `INSERT INTO campaign_deliveries (id, org_id, campaign_id, client_id, email, status, error) VALUES (?, ?, ?, ?, ?, 'failed', ?)`,
        ).bind(deliveryId, opts.orgId, opts.campaignId, client.id, phone, String(err?.message || err).slice(0, 500)).run();
        failed += 1;
      }
      continue;
    }

    const email = client.email;
    if (!email || String(email).includes('@smartfcra.local')) {
      failed += 1;
      continue;
    }
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
      renderedSubject: subject,
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
      await sendBrandedOrgEmail({
        env: opts.env,
        orgId: opts.orgId,
        to: email,
        subject,
        bodyText: body,
        title: subject,
      });
      await opts.db.prepare(
        `INSERT INTO campaign_deliveries (id, org_id, campaign_id, client_id, email, status) VALUES (?, ?, ?, ?, ?, 'sent')`,
      ).bind(deliveryId, opts.orgId, opts.campaignId, client.id, email).run();
      await opts.db.prepare('UPDATE communication_attempts SET sent = 1, provider_status = ? WHERE id = ?')
        .bind('sent', attemptId).run();
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
