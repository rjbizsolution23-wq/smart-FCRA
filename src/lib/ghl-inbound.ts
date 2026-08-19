/**
 * GoHighLevel inbound webhooks — sync DNC, tags, consent from GHL → Smart FCRA.
 */
import { revokeMarketingConsent, recordConsentEvidence } from './comms-compliance';
import { appendTimelineEvent } from './client-timeline';

export type GhlWebhookPayload = {
  type?: string;
  locationId?: string;
  contactId?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  dnd?: boolean;
  dndSettings?: { SMS?: boolean; Email?: boolean; Call?: boolean };
  timestamp?: string;
  [key: string]: unknown;
};

/** Verify GHL webhook signature when GHL_WEBHOOK_SECRET is configured. */
export async function verifyGhlWebhookSignature(opts: {
  secret?: string;
  rawBody: string;
  signatureHeader?: string | null;
}): Promise<boolean> {
  if (!opts.secret) return true;
  if (!opts.signatureHeader) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(opts.secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(opts.rawBody));
  const expected = Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
  return expected === opts.signatureHeader || `sha256=${expected}` === opts.signatureHeader;
}

export function ghlIdempotencyKey(payload: GhlWebhookPayload): string {
  return `${payload.type || 'unknown'}:${payload.contactId || payload.email || 'none'}:${payload.timestamp || ''}`;
}

export async function checkGhlWebhookIdempotency(
  db: D1Database,
  orgId: string | null,
  key: string,
): Promise<boolean> {
  if (!orgId || !key) return false;
  const existing = await db.prepare(
    'SELECT id FROM ghl_webhook_events WHERE org_id = ? AND idempotency_key = ?',
  ).bind(orgId, key).first();
  return !!existing;
}

export async function processGhlInboundWebhook(opts: {
  db: D1Database;
  env: any;
  orgId: string | null;
  eventId: string;
  payload: GhlWebhookPayload;
  generateId: () => string;
}): Promise<{ processed: boolean; actions: string[] }> {
  const actions: string[] = [];
  const email = String(opts.payload.email || '').trim().toLowerCase();
  const contactId = opts.payload.contactId;

  let client: any = null;
  if (email && opts.orgId) {
    client = await opts.db.prepare(
      'SELECT * FROM clients WHERE org_id = ? AND lower(email) = ? LIMIT 1',
    ).bind(opts.orgId, email).first();
  }
  if (!client && contactId && opts.orgId) {
    client = await opts.db.prepare(
      'SELECT * FROM clients WHERE org_id = ? AND ghl_contact_id = ? LIMIT 1',
    ).bind(opts.orgId, contactId).first();
  }

  const dnd = opts.payload.dnd === true;
  const dndSettings = opts.payload.dndSettings || {};

  if (client && (dnd || dndSettings.SMS || dndSettings.Email || dndSettings.Call)) {
    if (dndSettings.SMS || dnd) {
      await revokeMarketingConsent(opts.db, {
        orgId: client.org_id,
        clientId: client.id,
        channel: 'sms',
        source: 'ghl_webhook',
      });
      await opts.db.prepare(
        `INSERT INTO do_not_contact_records (id, org_id, client_id, channel, consent_source, status, created_by)
         VALUES (?, ?, ?, 'sms', 'ghl_dnd', 'active', 'ghl_webhook')`,
      ).bind(opts.generateId(), client.org_id, client.id).run().catch(() => { /* */ });
      actions.push('sms_dnc');
    }
    if (dndSettings.Email || dnd) {
      await revokeMarketingConsent(opts.db, {
        orgId: client.org_id,
        clientId: client.id,
        channel: 'email',
        source: 'ghl_webhook',
      });
      actions.push('email_dnc');
    }
    if (dndSettings.Call || dnd) {
      await revokeMarketingConsent(opts.db, {
        orgId: client.org_id,
        clientId: client.id,
        channel: 'phone',
        source: 'ghl_webhook',
      });
      actions.push('phone_dnc');
    }

    await appendTimelineEvent(opts.db, {
      id: opts.generateId(),
      orgId: client.org_id,
      clientId: client.id,
      eventType: 'ghl.dnc_sync',
      title: 'GHL DNC synced to Smart FCRA',
      summary: JSON.stringify({ dnd, dndSettings }),
      actorId: 'ghl_webhook',
    });
  }

  const tags = opts.payload.tags || [];
  if (client && tags.some((t) => /do.?not.?call|dnc|stop/i.test(t))) {
    await revokeMarketingConsent(opts.db, {
      orgId: client.org_id,
      clientId: client.id,
      channel: 'all',
      source: 'ghl_tag',
    });
    actions.push('tag_dnc');
  }

  if (client && tags.some((t) => /marketing.?opt.?in|newsletter/i.test(t))) {
    await recordConsentEvidence(opts.db, {
      id: opts.generateId(),
      orgId: client.org_id,
      clientId: client.id,
      channel: 'email',
      purpose: 'marketing',
      languageVersion: 'ghl_tag_sync',
      sourceForm: 'ghl_webhook',
      createdBy: 'ghl_webhook',
    });
    await opts.db.prepare(
      'UPDATE clients SET marketing_email_consent = 1, newsletter_opt_in = 1 WHERE id = ?',
    ).bind(client.id).run();
    actions.push('marketing_consent_from_tag');
  }

  await opts.db.prepare(
    'UPDATE ghl_webhook_events SET processed = 1, result_json = ? WHERE id = ?',
  ).bind(JSON.stringify({ actions, clientId: client?.id || null }), opts.eventId).run();

  return { processed: true, actions };
}

export async function resolveOrgIdFromGhlLocation(
  db: D1Database,
  locationId: string,
  platformLocationId?: string,
): Promise<string | null> {
  if (platformLocationId && locationId === platformLocationId) {
    const org = await db.prepare('SELECT id FROM organizations ORDER BY created_at ASC LIMIT 1').first() as any;
    return org?.id || null;
  }
  const orgs = await db.prepare('SELECT id, settings FROM organizations LIMIT 200').all();
  for (const o of orgs.results || []) {
    let settings: any = {};
    try { settings = JSON.parse((o as any).settings || '{}'); } catch { /* */ }
    if (settings?.integrations?.ghl?.locationId === locationId) return (o as any).id;
  }
  return null;
}
