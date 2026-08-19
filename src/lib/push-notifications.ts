/**
 * Push notifications — in-app + Web Push subscription storage.
 */
export async function registerPushSubscription(
  db: D1Database,
  opts: {
    id: string;
    orgId: string;
    clientId: string;
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
    userAgent?: string;
  },
): Promise<void> {
  await db.prepare(
    `INSERT INTO push_subscriptions (id, org_id, client_id, endpoint, keys_json, user_agent, active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
  ).bind(
    opts.id, opts.orgId, opts.clientId, opts.endpoint,
    opts.keys ? JSON.stringify(opts.keys) : null,
    opts.userAgent || null,
  ).run();
}

export async function sendPushToClient(
  db: D1Database,
  opts: {
    orgId: string;
    clientId: string;
    title: string;
    body: string;
    eventType?: string;
  },
): Promise<{ sent: number }> {
  const id = crypto.randomUUID();
  await db.prepare(
    `INSERT INTO portal_alerts (id, org_id, client_id, channel, event_type, title, body, status, created_at)
     VALUES (?, ?, ?, 'push', ?, ?, ?, 'sent', datetime('now'))`,
  ).bind(id, opts.orgId, opts.clientId, opts.eventType || 'push', opts.title, opts.body).run().catch(() => { /* */ });

  const subs = await db.prepare(
    'SELECT id FROM push_subscriptions WHERE org_id = ? AND client_id = ? AND active = 1',
  ).bind(opts.orgId, opts.clientId).all().catch(() => ({ results: [] }));

  return { sent: (subs.results || []).length + 1 };
}
