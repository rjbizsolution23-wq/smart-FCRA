/**
 * Master Consumer ID — external system records map to Smart FCRA clients.
 */
export type IdentityCandidate = {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  externalId?: string;
  address?: string;
};

export type MatchResult =
  | { status: 'linked'; clientId: string; confidence: number; method: string }
  | { status: 'ambiguous'; candidates: string[]; score: number }
  | { status: 'new'; confidence: number };

function normEmail(v?: string): string {
  return String(v || '').trim().toLowerCase();
}

function normPhone(v?: string): string {
  return String(v || '').replace(/\D/g, '').slice(-10);
}

function nameScore(a: string, b: string): number {
  const x = a.toLowerCase().trim();
  const y = b.toLowerCase().trim();
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.7;
  const ax = x.split(/\s+/)[0];
  const by = y.split(/\s+/)[0];
  if (ax === by) return 0.5;
  return 0;
}

export function scoreIdentityMatch(candidate: IdentityCandidate, client: any): number {
  let score = 0;
  const email = normEmail(candidate.email);
  const phone = normPhone(candidate.phone);
  if (email && normEmail(client.email) === email) score += 0.45;
  if (phone && normPhone(client.phone || client.phone_e164) === phone) score += 0.25;
  const fn = `${candidate.firstName || ''} ${candidate.lastName || ''}`.trim();
  const cn = `${client.first_name || ''} ${client.last_name || ''}`.trim();
  score += nameScore(fn, cn) * 0.2;
  if (candidate.dob && client.date_of_birth_enc && candidate.dob === client.date_of_birth) score += 0.1;
  return Math.min(1, score);
}

export async function resolveOrQueueIdentity(opts: {
  db: D1Database;
  orgId: string;
  externalSystem: string;
  externalRecordId: string;
  candidate: IdentityCandidate;
  payload?: Record<string, unknown>;
  generateId: () => string;
  minAutoLinkScore?: number;
}): Promise<MatchResult> {
  const minScore = opts.minAutoLinkScore ?? 0.85;

  const existing = await opts.db.prepare(
    `SELECT client_id FROM external_identity_links
     WHERE org_id = ? AND external_system = ? AND external_record_id = ?`,
  ).bind(opts.orgId, opts.externalSystem, opts.externalRecordId).first() as any;
  if (existing?.client_id) {
    return { status: 'linked', clientId: existing.client_id, confidence: 1, method: 'existing_link' };
  }

  const clients = await opts.db.prepare(
    `SELECT * FROM clients WHERE org_id = ? AND coalesce(status,'active') != 'deleted' LIMIT 500`,
  ).bind(opts.orgId).all();

  const scored: { id: string; score: number }[] = [];
  for (const c of clients.results || []) {
    const score = scoreIdentityMatch(opts.candidate, c);
    if (score >= 0.4) scored.push({ id: (c as any).id, score });
  }
  scored.sort((a, b) => b.score - a.score);

  if (scored.length === 1 && scored[0].score >= minScore) {
    await linkExternalIdentity({
      db: opts.db,
      orgId: opts.orgId,
      clientId: scored[0].id,
      externalSystem: opts.externalSystem,
      externalRecordId: opts.externalRecordId,
      externalEmail: opts.candidate.email,
      confidence: scored[0].score,
      method: 'auto_match',
      id: opts.generateId(),
    });
    return { status: 'linked', clientId: scored[0].id, confidence: scored[0].score, method: 'auto_match' };
  }

  if (scored.length >= 2 && scored[0].score >= 0.5 && scored[0].score - scored[1].score < 0.15) {
    await opts.db.prepare(
      `INSERT INTO identity_resolution_queue (id, org_id, external_system, external_record_id, candidate_client_ids_json, payload_json, match_score, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    ).bind(
      opts.generateId(), opts.orgId, opts.externalSystem, opts.externalRecordId,
      JSON.stringify(scored.slice(0, 5).map((s) => s.id)),
      JSON.stringify(opts.payload || {}), scored[0].score,
    ).run();
    return { status: 'ambiguous', candidates: scored.slice(0, 5).map((s) => s.id), score: scored[0].score };
  }

  if (scored.length >= 1 && scored[0].score >= minScore) {
    await linkExternalIdentity({
      db: opts.db,
      orgId: opts.orgId,
      clientId: scored[0].id,
      externalSystem: opts.externalSystem,
      externalRecordId: opts.externalRecordId,
      externalEmail: opts.candidate.email,
      confidence: scored[0].score,
      method: 'auto_match',
      id: opts.generateId(),
    });
    return { status: 'linked', clientId: scored[0].id, confidence: scored[0].score, method: 'auto_match' };
  }

  return { status: 'new', confidence: scored[0]?.score || 0 };
}

export async function linkExternalIdentity(opts: {
  db: D1Database;
  orgId: string;
  clientId: string;
  externalSystem: string;
  externalRecordId: string;
  externalEmail?: string;
  confidence?: number;
  method?: string;
  metadata?: Record<string, unknown>;
  id: string;
}): Promise<void> {
  await opts.db.prepare(
    `INSERT INTO external_identity_links (id, org_id, client_id, external_system, external_record_id, external_email, match_confidence, match_method, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(org_id, external_system, external_record_id) DO UPDATE SET
       client_id = excluded.client_id,
       match_confidence = excluded.match_confidence,
       match_method = excluded.match_method,
       updated_at = datetime('now')`,
  ).bind(
    opts.id, opts.orgId, opts.clientId, opts.externalSystem, opts.externalRecordId,
    opts.externalEmail || null, opts.confidence ?? 1, opts.method || 'manual',
    opts.metadata ? JSON.stringify(opts.metadata) : null,
  ).run();
}
