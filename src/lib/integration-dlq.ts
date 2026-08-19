/**
 * Integration job queue — retry with exponential backoff → dead letter.
 */
const BACKOFF_MINUTES = [1, 5, 15, 60, 240];

export async function enqueueIntegrationJob(opts: {
  db: D1Database;
  orgId: string;
  provider: string;
  jobType: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  id: string;
  maxAttempts?: number;
}): Promise<{ jobId: string; duplicate: boolean }> {
  if (opts.idempotencyKey) {
    const dup = await opts.db.prepare(
      `SELECT id FROM integration_job_queue WHERE org_id = ? AND idempotency_key = ? AND status IN ('pending','processing')`,
    ).bind(opts.orgId, opts.idempotencyKey).first();
    if (dup) return { jobId: (dup as any).id, duplicate: true };
  }

  await opts.db.prepare(
    `INSERT INTO integration_job_queue (id, org_id, provider, job_type, payload_json, idempotency_key, max_attempts)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    opts.id, opts.orgId, opts.provider, opts.jobType,
    JSON.stringify(opts.payload), opts.idempotencyKey || null, opts.maxAttempts ?? 5,
  ).run();
  return { jobId: opts.id, duplicate: false };
}

export async function processIntegrationJobQueue(
  db: D1Database,
  limit = 25,
): Promise<{ processed: number; failed: number; deadLettered: number }> {
  const rows = await db.prepare(
    `SELECT * FROM integration_job_queue
     WHERE status = 'pending' AND next_attempt_at <= datetime('now')
     ORDER BY next_attempt_at ASC LIMIT ?`,
  ).bind(limit).all();

  let processed = 0;
  let failed = 0;
  let deadLettered = 0;

  for (const job of rows.results || []) {
    const j = job as any;
    await db.prepare(
      `UPDATE integration_job_queue SET status = 'processing', updated_at = datetime('now') WHERE id = ?`,
    ).bind(j.id).run();

    try {
      await executeJob(db, j);
      await db.prepare(
        `UPDATE integration_job_queue SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
      ).bind(j.id).run();
      processed += 1;
    } catch (err: any) {
      const attempt = Number(j.attempt_count || 0) + 1;
      const max = Number(j.max_attempts || 5);
      const errMsg = String(err?.message || err).slice(0, 500);
      if (attempt >= max) {
        await db.prepare(
          `UPDATE integration_job_queue SET status = 'dead_letter', attempt_count = ?, last_error = ?, dead_lettered_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
        ).bind(attempt, errMsg, j.id).run();
        deadLettered += 1;
        await db.prepare(
          `UPDATE integration_connections SET records_failed = coalesce(records_failed,0) + 1, last_error = ?, last_error_at = datetime('now'), health_status = 'degraded' WHERE org_id = ? AND provider = ?`,
        ).bind(errMsg, j.org_id, j.provider).run().catch(() => null);
      } else {
        const backoffMin = BACKOFF_MINUTES[Math.min(attempt - 1, BACKOFF_MINUTES.length - 1)];
        await db.prepare(
          `UPDATE integration_job_queue SET status = 'pending', attempt_count = ?, last_error = ?, next_attempt_at = datetime('now', '+' || ? || ' minutes'), updated_at = datetime('now') WHERE id = ?`,
        ).bind(attempt, errMsg, backoffMin, j.id).run();
        failed += 1;
      }
    }
  }
  return { processed, failed, deadLettered };
}

async function executeJob(db: D1Database, job: any): Promise<void> {
  const payload = JSON.parse(job.payload_json || '{}');
  if (job.job_type === 'webhook_retry') {
    const { retryWebhookDelivery } = await import('./outbound-webhooks');
    await retryWebhookDelivery(db, payload.deliveryId);
    return;
  }
  if (job.job_type === 'ghl_sync_client') {
    throw new Error('ghl_sync_client jobs require env context — use API route');
  }
  throw new Error(`Unknown job type: ${job.job_type}`);
}

export async function countPendingIntegrationJobs(db: D1Database, orgId?: string): Promise<number> {
  const q = orgId
    ? db.prepare(`SELECT COUNT(*) as c FROM integration_job_queue WHERE org_id = ? AND status IN ('pending','dead_letter')`).bind(orgId)
    : db.prepare(`SELECT COUNT(*) as c FROM integration_job_queue WHERE status IN ('pending','dead_letter')`);
  const row = await q.first() as any;
  return Number(row?.c || 0);
}
