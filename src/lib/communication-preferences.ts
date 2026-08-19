/**
 * Communication preference center — service vs marketing separated.
 */
export type CommunicationPreferences = {
  emailService: boolean;
  smsService: boolean;
  marketingEmail: boolean;
  marketingSms: boolean;
  marketingCalls: boolean;
  pushEnabled: boolean;
};

export async function getCommunicationPreferences(
  db: D1Database,
  orgId: string,
  clientId: string,
): Promise<CommunicationPreferences> {
  const row = await db.prepare(
    'SELECT * FROM communication_preferences WHERE org_id = ? AND client_id = ?',
  ).bind(orgId, clientId).first() as any;

  if (row) {
    return {
      emailService: row.email_service === 1,
      smsService: row.sms_service === 1,
      marketingEmail: row.marketing_email === 1,
      marketingSms: row.marketing_sms === 1,
      marketingCalls: row.marketing_calls === 1,
      pushEnabled: row.push_enabled === 1,
    };
  }

  const client = await db.prepare(
    'SELECT notify_email, notify_sms, marketing_email_consent, marketing_sms_consent, marketing_call_consent, newsletter_opt_in FROM clients WHERE id = ? AND org_id = ?',
  ).bind(clientId, orgId).first() as any;

  return {
    emailService: client?.notify_email !== 0,
    smsService: client?.notify_sms !== 0,
    marketingEmail: client?.marketing_email_consent === 1 || client?.newsletter_opt_in === 1,
    marketingSms: client?.marketing_sms_consent === 1,
    marketingCalls: client?.marketing_call_consent === 1,
    pushEnabled: true,
  };
}

export async function saveCommunicationPreferences(
  db: D1Database,
  opts: {
    id: string;
    orgId: string;
    clientId: string;
    prefs: Partial<CommunicationPreferences>;
  },
): Promise<void> {
  const current = await getCommunicationPreferences(db, opts.orgId, opts.clientId);
  const merged = { ...current, ...opts.prefs };

  await db.prepare(
    `INSERT INTO communication_preferences (id, org_id, client_id, email_service, sms_service, marketing_email, marketing_sms, marketing_calls, push_enabled, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(org_id, client_id) DO UPDATE SET
       email_service = excluded.email_service,
       sms_service = excluded.sms_service,
       marketing_email = excluded.marketing_email,
       marketing_sms = excluded.marketing_sms,
       marketing_calls = excluded.marketing_calls,
       push_enabled = excluded.push_enabled,
       updated_at = datetime('now')`,
  ).bind(
    opts.id, opts.orgId, opts.clientId,
    merged.emailService ? 1 : 0,
    merged.smsService ? 1 : 0,
    merged.marketingEmail ? 1 : 0,
    merged.marketingSms ? 1 : 0,
    merged.marketingCalls ? 1 : 0,
    merged.pushEnabled ? 1 : 0,
  ).run();

  await db.prepare(
    `UPDATE clients SET
       notify_email = ?,
       notify_sms = ?,
       marketing_email_consent = ?,
       marketing_sms_consent = ?,
       marketing_call_consent = ?,
       newsletter_opt_in = ?,
       updated_at = datetime('now')
     WHERE id = ? AND org_id = ?`,
  ).bind(
    merged.emailService ? 1 : 0,
    merged.smsService ? 1 : 0,
    merged.marketingEmail ? 1 : 0,
    merged.marketingSms ? 1 : 0,
    merged.marketingCalls ? 1 : 0,
    merged.marketingEmail ? 1 : 0,
    opts.clientId, opts.orgId,
  ).run();
}
