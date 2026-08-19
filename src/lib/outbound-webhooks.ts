/**
 * Tenant outbound webhooks (Zapier / Make / custom endpoints).
 */
import { sha256Hex } from '../data/legal-contracts';

/** Hash for display-only fingerprint of webhook secret (not for verification). */
export async function webhookSecretFingerprint(secret: string): Promise<string> {
  return (await sha256Hex(secret)).slice(0, 12);
}

export const WEBHOOK_EVENTS = [
  'client.created',
  'report.imported',
  'finding.created',
  'letter.sent',
  'ticket.created',
  'complaint.created',
  'cancellation.requested',
  'refund.requested',
] as const;

export type WebhookEventType = typeof WEBHOOK_EVENTS[number];

export function parseWebhookEvents(json?: string | null): WebhookEventType[] {
  try {
    const arr = JSON.parse(json || '[]');
    if (!Array.isArray(arr)) return [];
    return arr.filter((e) => (WEBHOOK_EVENTS as readonly string[]).includes(String(e))) as WebhookEventType[];
  } catch {
    return [];
  }
}

async function signPayload(secret: string, body: string, timestamp: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function emitOrgWebhook(
  db: D1Database,
  opts: {
    orgId: string;
    eventType: WebhookEventType;
    payload: Record<string, unknown>;
  },
): Promise<{ delivered: number; failed: number }> {
  const endpoints = await db.prepare(
    `SELECT * FROM org_webhook_endpoints WHERE org_id = ? AND active = 1`,
  ).bind(opts.orgId).all().catch(() => ({ results: [] as any[] }));

  let delivered = 0;
  let failed = 0;
  const envelope = {
    id: crypto.randomUUID(),
    event: opts.eventType,
    createdAt: new Date().toISOString(),
    orgId: opts.orgId,
    data: opts.payload,
  };
  const body = JSON.stringify(envelope);
  const timestamp = String(Math.floor(Date.now() / 1000));

  for (const ep of (endpoints.results || []) as any[]) {
    const events = parseWebhookEvents(ep.events_json);
    if (events.length && !events.includes(opts.eventType)) continue;

    const deliveryId = crypto.randomUUID();
    let responseStatus = 0;
    let responseBody = '';
    let success = 0;

    try {
      const signature = await signPayload(String(ep.secret || ''), body, timestamp);
      const res = await fetch(String(ep.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SmartFCRA-Webhook/1.0',
          'X-SmartFCRA-Event': opts.eventType,
          'X-SmartFCRA-Timestamp': timestamp,
          'X-SmartFCRA-Signature': signature,
          'X-SmartFCRA-Idempotency-Key': envelope.id,
        },
        body,
      });
      responseStatus = res.status;
      responseBody = (await res.text()).slice(0, 4000);
      success = res.ok ? 1 : 0;
      if (res.ok) delivered += 1;
      else failed += 1;
    } catch (err: any) {
      responseBody = String(err?.message || err).slice(0, 4000);
      failed += 1;
    }

    await db.prepare(
      `INSERT INTO org_webhook_deliveries (id, org_id, endpoint_id, event_type, payload_json, response_status, response_body, success, idempotency_key, retry_count, next_retry_at, dead_lettered)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    ).bind(
      deliveryId, opts.orgId, ep.id, opts.eventType, body, responseStatus, responseBody, success,
      envelope.id, success ? null : new Date(Date.now() + 60000).toISOString(), success ? 0 : 0,
    ).run().catch(() => null);

    if (!success) {
      const { enqueueIntegrationJob } = await import('./integration-dlq');
      await enqueueIntegrationJob({
        db,
        orgId: opts.orgId,
        provider: 'webhook',
        jobType: 'webhook_retry',
        payload: { deliveryId },
        idempotencyKey: `webhook_retry:${deliveryId}`,
        id: crypto.randomUUID(),
      }).catch(() => null);
    }
  }

  return { delivered, failed };
}

export async function retryWebhookDelivery(db: D1Database, deliveryId: string): Promise<void> {
  const row = await db.prepare(
    `SELECT d.*, e.url, e.secret, e.events_json FROM org_webhook_deliveries d
     JOIN org_webhook_endpoints e ON e.id = d.endpoint_id WHERE d.id = ?`,
  ).bind(deliveryId).first() as any;
  if (!row) throw new Error('Delivery not found');

  const body = row.payload_json;
  const timestamp = String(Math.floor(Date.now() / 1000));
  const envelope = JSON.parse(body);
  const signature = await signPayload(String(row.secret || ''), body, timestamp);
  const res = await fetch(String(row.url), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'SmartFCRA-Webhook/1.0',
      'X-SmartFCRA-Event': row.event_type,
      'X-SmartFCRA-Timestamp': timestamp,
      'X-SmartFCRA-Signature': signature,
      'X-SmartFCRA-Idempotency-Key': envelope.id || deliveryId,
    },
    body,
  });
  const responseBody = (await res.text()).slice(0, 4000);
  const success = res.ok ? 1 : 0;
  await db.prepare(
    `UPDATE org_webhook_deliveries SET response_status = ?, response_body = ?, success = ?, retry_count = coalesce(retry_count,0)+1, dead_lettered = ? WHERE id = ?`,
  ).bind(res.status, responseBody, success, success ? 0 : (Number(row.retry_count || 0) >= 4 ? 1 : 0), deliveryId).run();
  if (!res.ok) throw new Error(`Webhook retry failed: ${res.status}`);
}

export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return `whsec_${Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')}`;
}
