/**
 * Smart FCRA Compliance OS — central pre-send gate for all outbound communications.
 * Three lanes: marketing | transactional | compliance
 * Channels: email | sms | phone | push | in_app
 */
export type CommsLane = 'marketing' | 'transactional' | 'compliance';
export type CommsChannel = 'email' | 'sms' | 'phone' | 'push' | 'in_app';
export type CommsDecision = 'ALLOW' | 'BLOCK' | 'MANUAL_REVIEW';

export const COMMS_POLICY_VERSION = '2026.08.1';

export type CanSendInput = {
  db: D1Database;
  orgId: string;
  clientId?: string | null;
  leadId?: string | null;
  email?: string | null;
  phone?: string | null;
  lane: CommsLane;
  channel: CommsChannel;
  templateId?: string;
  campaignId?: string;
  workflowRunId?: string;
};

export type CanSendResult = {
  allowed: boolean;
  decision: CommsDecision;
  reasons: string[];
  policyVersion: string;
};

function normEmail(e?: string | null): string {
  return String(e || '').trim().toLowerCase();
}

async function emailSuppressed(db: D1Database, email: string): Promise<boolean> {
  if (!email) return false;
  const row = await db.prepare(
    'SELECT 1 FROM email_suppressions WHERE lower(email) = ? LIMIT 1',
  ).bind(email).first();
  return !!row;
}

async function channelDnc(
  db: D1Database,
  orgId: string,
  clientId: string | null | undefined,
  channel: CommsChannel,
): Promise<string | null> {
  const channels = channel === 'phone' ? ['phone', 'all'] : channel === 'sms' ? ['sms', 'all'] : ['email', 'all'];
  for (const ch of channels) {
    const row = await db.prepare(
      `SELECT id FROM do_not_contact_records
       WHERE org_id = ? AND status = 'active' AND channel = ?
       AND (client_id = ? OR client_id IS NULL)
       LIMIT 1`,
    ).bind(orgId, ch, clientId || null).first();
    if (row) return `DNC active for channel ${ch}`;
  }
  return null;
}

async function hasConsent(
  db: D1Database,
  orgId: string,
  clientId: string | null | undefined,
  leadId: string | null | undefined,
  channel: string,
  purpose: string,
): Promise<boolean> {
  let row: any = null;
  if (clientId) {
    row = await db.prepare(
      `SELECT id FROM consent_evidence
       WHERE org_id = ? AND client_id = ? AND channel = ? AND purpose = ? AND status = 'GRANTED'
       AND (revoked_at IS NULL OR revoked_at = '')
       LIMIT 1`,
    ).bind(orgId, clientId, channel, purpose).first();
    if (row) return true;
    const legacy = await db.prepare(
      `SELECT status FROM client_consents
       WHERE org_id = ? AND client_id = ? AND consent_type = ? AND status = 'GRANTED'
       ORDER BY accepted_at DESC LIMIT 1`,
    ).bind(orgId, clientId, purpose === 'marketing' ? 'OPTIONAL_MARKETING' : purpose.toUpperCase()).first();
    if (legacy) return true;
  }
  if (leadId) {
    row = await db.prepare(
      `SELECT id FROM consent_evidence
       WHERE org_id = ? AND lead_id = ? AND channel = ? AND purpose = ? AND status = 'GRANTED'
       AND (revoked_at IS NULL OR revoked_at = '')
       LIMIT 1`,
    ).bind(orgId, leadId, channel, purpose).first();
    if (row) return true;
  }
  return false;
}

async function loadClient(db: D1Database, orgId: string, clientId: string): Promise<any | null> {
  return db.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, orgId).first() as any;
}

async function openComplaintFreeze(db: D1Database, orgId: string, clientId: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT id FROM support_complaints
     WHERE org_id = ? AND client_id = ? AND status NOT IN ('resolved', 'closed')
     AND (classification LIKE '%Marketing%' OR classification LIKE '%Contact%' OR severity IN ('high', 'critical'))
     LIMIT 1`,
  ).bind(orgId, clientId).first();
  return !!row;
}

export async function canSendMessage(input: CanSendInput): Promise<CanSendResult> {
  const reasons: string[] = [];
  const email = normEmail(input.email);
  const client = input.clientId
    ? await loadClient(input.db, input.orgId, input.clientId)
    : null;

  if (client?.comms_frozen === 1) {
    reasons.push(client.comms_freeze_reason || 'Communications frozen on account');
    return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
  }

  if (input.clientId && input.lane === 'marketing') {
    if (await openComplaintFreeze(input.db, input.orgId, input.clientId)) {
      reasons.push('Open complaint restricts marketing communications');
      return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
    }
    const cancel = await input.db.prepare(
      `SELECT id FROM service_cancellations
       WHERE org_id = ? AND client_id = ? AND status IN ('REQUESTED', 'EFFECTIVE')
       LIMIT 1`,
    ).bind(input.orgId, input.clientId).first();
    if (cancel) {
      reasons.push('Cancellation in progress or effective — marketing blocked');
      return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
    }
    if (client?.data_retention_holds) {
      reasons.push('Legal hold active');
      return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
    }
  }

  const dnc = await channelDnc(input.db, input.orgId, input.clientId, input.channel);
  if (dnc && input.lane === 'marketing') {
    reasons.push(dnc);
    return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
  }
  if (dnc && input.lane === 'transactional') {
    const permitted = await input.db.prepare(
      `SELECT permitted_exceptions_json FROM do_not_contact_records
       WHERE org_id = ? AND status = 'active' AND client_id = ? LIMIT 1`,
    ).bind(input.orgId, input.clientId).first() as any;
    let exceptions: string[] = [];
    try { exceptions = JSON.parse(permitted?.permitted_exceptions_json || '[]'); } catch { /* */ }
    const tpl = input.templateId || '';
    const allowedException = exceptions.some((e: string) =>
      tpl.includes(e) || e === 'billing' || e === 'security' || e === 'compliance',
    );
    if (!allowedException && !['password_reset', 'account_verify', 'security_alert'].includes(tpl)) {
      reasons.push(`${dnc} — transactional exception not matched`);
      return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
    }
  }

  if (input.lane === 'marketing') {
    if (input.channel === 'email') {
      if (email && await emailSuppressed(input.db, email)) {
        reasons.push('Email on global suppression list');
        return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
      }
      const marketingOk = client?.marketing_email_consent === 1
        || client?.newsletter_opt_in === 1
        || await hasConsent(input.db, input.orgId, input.clientId, input.leadId, 'email', 'marketing');
      if (!marketingOk) {
        reasons.push('Marketing email consent not granted');
        return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
      }
      if (client && client.notify_email === 0) {
        reasons.push('Client notify_email disabled');
        return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
      }
    }
    if (input.channel === 'sms') {
      const smsOk = client?.marketing_sms_consent === 1
        || await hasConsent(input.db, input.orgId, input.clientId, input.leadId, 'sms', 'marketing');
      if (!smsOk) {
        reasons.push('Marketing SMS consent not granted');
        return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
      }
      if (client && client.notify_sms === 0) {
        reasons.push('Client notify_sms disabled');
        return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
      }
    }
    if (input.channel === 'phone') {
      const callOk = client?.marketing_call_consent === 1
        || await hasConsent(input.db, input.orgId, input.clientId, input.leadId, 'phone', 'marketing');
      if (!callOk) {
        reasons.push('Marketing call consent not granted');
        return { allowed: false, decision: 'MANUAL_REVIEW', reasons, policyVersion: COMMS_POLICY_VERSION };
      }
    }
  }

  if (input.lane === 'transactional' && input.channel === 'email' && email) {
    if (await emailSuppressed(input.db, email)) {
      const hard = await input.db.prepare(
        `SELECT reason FROM email_suppressions WHERE lower(email) = ? LIMIT 1`,
      ).bind(email).first() as any;
      if (hard?.reason === 'bounce' || hard?.reason === 'complaint') {
        reasons.push(`Email suppressed (${hard.reason}) — transactional blocked`);
        return { allowed: false, decision: 'BLOCK', reasons, policyVersion: COMMS_POLICY_VERSION };
      }
    }
  }

  if (input.lane === 'compliance') {
    return { allowed: true, decision: 'ALLOW', reasons: ['Compliance/legal lane — service notices permitted'], policyVersion: COMMS_POLICY_VERSION };
  }

  return {
    allowed: true,
    decision: 'ALLOW',
    reasons: reasons.length ? reasons : [`${input.lane}/${input.channel} passed compliance gate`],
    policyVersion: COMMS_POLICY_VERSION,
  };
}

export async function logCommunicationAttempt(
  db: D1Database,
  opts: CanSendInput & CanSendResult & {
    id: string;
    sent?: boolean;
    renderedSubject?: string;
    providerStatus?: string;
  },
): Promise<void> {
  await db.prepare(
    `INSERT INTO communication_attempts
     (id, org_id, client_id, lead_id, lane, channel, template_id, campaign_id, workflow_run_id,
      rendered_subject, decision, block_reasons_json, recipient_email, recipient_phone, sent, provider_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    opts.id, opts.orgId, opts.clientId || null, opts.leadId || null,
    opts.lane, opts.channel, opts.templateId || null, opts.campaignId || null, opts.workflowRunId || null,
    opts.renderedSubject || null, opts.decision, JSON.stringify(opts.reasons),
    normEmail(opts.email) || null, opts.phone || null,
    opts.sent ? 1 : 0, opts.providerStatus || null,
  ).run().catch(() => { /* soft */ });
}

export async function recordConsentEvidence(db: D1Database, row: {
  id: string;
  orgId: string;
  clientId?: string;
  leadId?: string;
  channel: string;
  purpose: string;
  languageVersion: string;
  exactLanguage?: string;
  sourceForm?: string;
  sourceUrl?: string;
  ipAddress?: string;
  userAgent?: string;
  createdBy?: string;
}): Promise<void> {
  await db.prepare(
    `INSERT INTO consent_evidence
     (id, org_id, client_id, lead_id, channel, purpose, consent_language_version, exact_language,
      status, source_form, source_url, ip_address, user_agent, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'GRANTED', ?, ?, ?, ?, ?)`,
  ).bind(
    row.id, row.orgId, row.clientId || null, row.leadId || null,
    row.channel, row.purpose, row.languageVersion, row.exactLanguage || null,
    row.sourceForm || null, row.sourceUrl || null, row.ipAddress || null, row.userAgent || null,
    row.createdBy || null,
  ).run();
}

export async function revokeMarketingConsent(db: D1Database, opts: {
  orgId: string;
  clientId?: string;
  leadId?: string;
  channel: 'email' | 'sms' | 'phone' | 'all';
  source: string;
}): Promise<void> {
  const channels = opts.channel === 'all' ? ['email', 'sms', 'phone'] : [opts.channel];
  for (const ch of channels) {
    await db.prepare(
      `UPDATE consent_evidence SET status = 'REVOKED', revoked_at = datetime('now'), revocation_source = ?
       WHERE org_id = ? AND channel = ? AND purpose = 'marketing'
       AND (client_id = ? OR lead_id = ?) AND status = 'GRANTED'`,
    ).bind(opts.source, opts.orgId, ch, opts.clientId || null, opts.leadId || null).run();
  }
  if (opts.clientId) {
    const sets: string[] = [];
    if (channels.includes('email')) sets.push('marketing_email_consent = 0', 'newsletter_opt_in = 0');
    if (channels.includes('sms')) sets.push('marketing_sms_consent = 0');
    if (channels.includes('phone')) sets.push('marketing_call_consent = 0');
    if (sets.length) {
      await db.prepare(
        `UPDATE clients SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ? AND org_id = ?`,
      ).bind(opts.clientId, opts.orgId).run();
    }
  }
}

/** Parse STOP/UNSUBSCRIBE from inbound SMS — immediate marketing suppression. */
export function isMarketingOptOutMessage(body: string): boolean {
  const t = String(body || '').trim().toUpperCase();
  return ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL'].includes(t)
    || t.startsWith('STOP ');
}
