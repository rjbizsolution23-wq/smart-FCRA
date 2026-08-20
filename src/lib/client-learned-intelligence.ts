/**
 * Client learned intelligence — persistent semantic memory in Cloudflare D1.
 * Grows with tutor sessions, uploads, credit events, and attestations.
 */
import { embedText, type KnowledgeEnv } from './knowledge-base';
import { generateId } from './auth';

export type MemoryCategory =
  | 'goal'
  | 'preference'
  | 'fact'
  | 'financial'
  | 'dispute'
  | 'education'
  | 'recommendation'
  | 'milestone';

export type MemorySource =
  | 'tutor_chat'
  | 'document_upload'
  | 'credit_event'
  | 'attestation'
  | 'education'
  | 'system'
  | 'staff_note';

export type ClientMemoryChunk = {
  id: string;
  org_id: string;
  client_id: string;
  source: MemorySource;
  category: MemoryCategory;
  content: string;
  embedding_json?: string | null;
  metadata_json?: string | null;
  importance: number;
  created_at: string;
  updated_at: string;
};

export type LearnedIntelligenceEnv = KnowledgeEnv;

const MAX_CHUNKS_PER_CLIENT = 200;
const RETRIEVAL_LIMIT = 8;

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
}

function cosine(a: number[], b: number[]): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function keywordScore(query: string, content: string): number {
  const q = new Set(tokenize(query));
  const words = tokenize(content);
  if (!q.size || !words.length) return 0;
  let hits = 0;
  for (const w of words) if (q.has(w)) hits++;
  return hits / Math.max(q.size, 1);
}

export async function loadClientMemoryChunks(
  env: LearnedIntelligenceEnv,
  orgId: string,
  clientId: string,
  limit = 100,
): Promise<ClientMemoryChunk[]> {
  try {
    const rows = await env.DB.prepare(
      `SELECT * FROM client_memory_chunks
       WHERE org_id = ? AND client_id = ?
       ORDER BY importance DESC, updated_at DESC
       LIMIT ?`,
    ).bind(orgId, clientId, limit).all();
    return (rows?.results || []) as ClientMemoryChunk[];
  } catch {
    return [];
  }
}

export async function storeClientMemoryChunk(
  env: LearnedIntelligenceEnv,
  opts: {
    orgId: string;
    clientId: string;
    source: MemorySource;
    category: MemoryCategory;
    content: string;
    importance?: number;
    metadata?: Record<string, unknown>;
    embed?: boolean;
  },
): Promise<ClientMemoryChunk | null> {
  const content = String(opts.content || '').trim().slice(0, 4000);
  if (content.length < 8) return null;

  let embedding: number[] | null = null;
  if (opts.embed !== false) {
    embedding = await embedText(env, content);
  }

  const id = generateId();
  const importance = Math.min(1, Math.max(0.1, opts.importance ?? 0.5));
  const metadataJson = opts.metadata ? JSON.stringify(opts.metadata) : null;
  const embeddingJson = embedding ? JSON.stringify(embedding) : null;

  try {
    await env.DB.prepare(
      `INSERT INTO client_memory_chunks
       (id, org_id, client_id, source, category, content, embedding_json, metadata_json, importance, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    ).bind(
      id, opts.orgId, opts.clientId, opts.source, opts.category, content, embeddingJson, metadataJson, importance,
    ).run();

    // Trim oldest low-importance rows
    await env.DB.prepare(
      `DELETE FROM client_memory_chunks
       WHERE org_id = ? AND client_id = ? AND id NOT IN (
         SELECT id FROM client_memory_chunks
         WHERE org_id = ? AND client_id = ?
         ORDER BY importance DESC, updated_at DESC
         LIMIT ?
       )`,
    ).bind(opts.orgId, opts.clientId, opts.orgId, opts.clientId, MAX_CHUNKS_PER_CLIENT).run().catch(() => {});

    return {
      id,
      org_id: opts.orgId,
      client_id: opts.clientId,
      source: opts.source,
      category: opts.category,
      content,
      embedding_json: embeddingJson,
      metadata_json: metadataJson,
      importance,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function retrieveClientMemory(
  env: LearnedIntelligenceEnv,
  orgId: string,
  clientId: string,
  query: string,
  limit = RETRIEVAL_LIMIT,
): Promise<ClientMemoryChunk[]> {
  const chunks = await loadClientMemoryChunks(env, orgId, clientId, 120);
  if (!chunks.length) return [];

  const q = String(query || '').trim();
  if (!q) return chunks.slice(0, limit);

  let queryVec: number[] | null = null;
  try {
    queryVec = await embedText(env, q);
  } catch { /* keyword fallback */ }

  const scored = chunks.map((c) => {
    let score = c.importance * 0.2;
    if (queryVec && c.embedding_json) {
      try {
        const vec = JSON.parse(c.embedding_json) as number[];
        score += cosine(queryVec, vec) * 0.7;
      } catch { /* */ }
    }
    score += keywordScore(q, c.content) * 0.3;
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.c);
}

export function buildLearnedMemoryContext(chunks: ClientMemoryChunk[]): string {
  if (!chunks.length) return '';
  const lines = chunks.map((c) => {
    const tag = `[${c.category}/${c.source}]`;
    return `${tag} ${c.content.slice(0, 500)}`;
  });
  return [
    'Persistent learned intelligence (retrieved from this client\'s history — treat as facts they shared):',
    ...lines,
  ].join('\n');
}

/** Extract storable facts from a tutor turn */
export async function recordTutorTurnMemory(
  env: LearnedIntelligenceEnv,
  opts: {
    orgId: string;
    clientId: string;
    userMessage: string;
    assistantReply: string;
    growthLevel?: number;
    rank?: string;
  },
): Promise<void> {
  const userMsg = opts.userMessage.trim();
  const reply = opts.assistantReply.trim();
  if (userMsg.length < 6) return;

  const tasks: Promise<unknown>[] = [];

  // Always store the exchange as a conversational chunk
  tasks.push(storeClientMemoryChunk(env, {
    orgId: opts.orgId,
    clientId: opts.clientId,
    source: 'tutor_chat',
    category: 'fact',
    content: `Client asked: ${userMsg.slice(0, 300)}. Tutor replied: ${reply.slice(0, 400)}`,
    importance: 0.55,
    metadata: { level: opts.growthLevel, rank: opts.rank },
  }));

  // Goal detection
  const goalPatterns = /\b(want to|trying to|goal is|need to|save for|buy a|get approved|fix my|pay off)\b/i;
  if (goalPatterns.test(userMsg)) {
    tasks.push(storeClientMemoryChunk(env, {
      orgId: opts.orgId,
      clientId: opts.clientId,
      source: 'tutor_chat',
      category: 'goal',
      content: userMsg.slice(0, 500),
      importance: 0.85,
    }));
  }

  // Preference detection
  const prefPatterns = /\b(prefer|don't like|hate|love|usually|always|never|rather)\b/i;
  if (prefPatterns.test(userMsg)) {
    tasks.push(storeClientMemoryChunk(env, {
      orgId: opts.orgId,
      clientId: opts.clientId,
      source: 'tutor_chat',
      category: 'preference',
      content: userMsg.slice(0, 400),
      importance: 0.75,
    }));
  }

  // Financial mention
  const finPatterns = /\b(income|budget|debt|payment|utilization|dti|rent|mortgage|car loan|credit card)\b/i;
  if (finPatterns.test(userMsg)) {
    tasks.push(storeClientMemoryChunk(env, {
      orgId: opts.orgId,
      clientId: opts.clientId,
      source: 'tutor_chat',
      category: 'financial',
      content: userMsg.slice(0, 500),
      importance: 0.8,
    }));
  }

  await Promise.allSettled(tasks);
}

export async function getLearnedIntelligenceSummary(
  env: LearnedIntelligenceEnv,
  orgId: string,
  clientId: string,
): Promise<{
  chunkCount: number;
  byCategory: Record<string, number>;
  latestAt: string | null;
  persistent: boolean;
}> {
  const chunks = await loadClientMemoryChunks(env, orgId, clientId, MAX_CHUNKS_PER_CLIENT);
  const byCategory: Record<string, number> = {};
  let latestAt: string | null = null;
  for (const c of chunks) {
    byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    if (!latestAt || c.updated_at > latestAt) latestAt = c.updated_at;
  }
  return {
    chunkCount: chunks.length,
    byCategory,
    latestAt,
    persistent: chunks.length > 0,
  };
}

export async function syncCreditEventMemory(
  env: LearnedIntelligenceEnv,
  orgId: string,
  clientId: string,
  eventType: string,
  description: string,
): Promise<void> {
  await storeClientMemoryChunk(env, {
    orgId,
    clientId,
    source: 'credit_event',
    category: 'milestone',
    content: `${eventType}: ${description}`.slice(0, 500),
    importance: 0.7,
  });
}

export async function syncEducationMemory(
  env: LearnedIntelligenceEnv,
  orgId: string,
  clientId: string,
  lessonTitle: string,
  score: number,
  total: number,
): Promise<void> {
  await storeClientMemoryChunk(env, {
    orgId,
    clientId,
    source: 'education',
    category: 'education',
    content: `Completed lesson "${lessonTitle}" with quiz score ${score}/${total}.`,
    importance: score >= total * 0.8 ? 0.65 : 0.5,
  });
}
