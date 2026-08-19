/**
 * Unified client timeline — single chronology for staff and portal.
 */
export type TimelineEvent = {
  id: string;
  eventType: string;
  title: string;
  summary?: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  actorId?: string;
  createdAt: string;
  source: 'timeline' | 'activity_log' | 'communication' | 'credit_event' | 'document';
};

export async function appendTimelineEvent(db: D1Database, row: {
  id: string;
  orgId: string;
  clientId: string;
  eventType: string;
  title: string;
  summary?: string;
  relatedObjectType?: string;
  relatedObjectId?: string;
  actorId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.prepare(
    `INSERT INTO client_timeline_events (id, org_id, client_id, event_type, title, summary, related_object_type, related_object_id, actor_id, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    row.id, row.orgId, row.clientId, row.eventType, row.title, row.summary || null,
    row.relatedObjectType || null, row.relatedObjectId || null, row.actorId || null,
    row.metadata ? JSON.stringify(row.metadata) : null,
  ).run().catch(() => { /* soft */ });
}

export async function buildClientTimeline(
  db: D1Database,
  orgId: string,
  clientId: string,
  limit = 100,
): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  const timeline = await db.prepare(
    'SELECT * FROM client_timeline_events WHERE org_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT ?',
  ).bind(orgId, clientId, limit).all().catch(() => ({ results: [] }));

  for (const r of timeline.results || []) {
    events.push({
      id: (r as any).id,
      eventType: (r as any).event_type,
      title: (r as any).title,
      summary: (r as any).summary,
      relatedObjectType: (r as any).related_object_type,
      relatedObjectId: (r as any).related_object_id,
      actorId: (r as any).actor_id,
      createdAt: (r as any).created_at,
      source: 'timeline',
    });
  }

  const activity = await db.prepare(
    'SELECT * FROM activity_log WHERE org_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT ?',
  ).bind(orgId, clientId, Math.min(limit, 50)).all().catch(() => ({ results: [] }));

  for (const r of activity.results || []) {
    events.push({
      id: `act-${(r as any).id}`,
      eventType: (r as any).action,
      title: String((r as any).action || 'Activity').replace(/_/g, ' '),
      summary: (r as any).description || (r as any).details,
      actorId: (r as any).user_id,
      createdAt: (r as any).created_at,
      source: 'activity_log',
    });
  }

  const comms = await db.prepare(
    `SELECT * FROM communication_attempts WHERE org_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT ?`,
  ).bind(orgId, clientId, 30).all().catch(() => ({ results: [] }));

  for (const r of comms.results || []) {
    events.push({
      id: `comm-${(r as any).id}`,
      eventType: `comms.${(r as any).lane}`,
      title: `${(r as any).channel} ${(r as any).decision}`,
      summary: (r as any).rendered_subject || (r as any).template_id,
      createdAt: (r as any).created_at,
      source: 'communication',
    });
  }

  const docs = await db.prepare(
    `SELECT id, document_type, status, created_at, sent_at FROM documents
     WHERE org_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT 20`,
  ).bind(orgId, clientId).all().catch(() => ({ results: [] }));

  for (const r of docs.results || []) {
    events.push({
      id: `doc-${(r as any).id}`,
      eventType: 'document',
      title: `${(r as any).document_type || 'Letter'} — ${(r as any).status}`,
      relatedObjectId: (r as any).id,
      createdAt: (r as any).sent_at || (r as any).created_at,
      source: 'document',
    });
  }

  const credit = await db.prepare(
    `SELECT id, taxonomy, account_key, created_at FROM credit_events
     WHERE org_id = ? AND client_id = ? ORDER BY created_at DESC LIMIT 20`,
  ).bind(orgId, clientId).all().catch(() => ({ results: [] }));

  for (const r of credit.results || []) {
    events.push({
      id: `ce-${(r as any).id}`,
      eventType: `credit.${(r as any).taxonomy}`,
      title: `Credit event: ${(r as any).taxonomy}`,
      summary: (r as any).account_key,
      createdAt: (r as any).created_at,
      source: 'credit_event',
    });
  }

  return events
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
    .slice(0, limit);
}
