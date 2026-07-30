/**
 * Retrievable knowledge base — case law + statute chunks in D1.
 * Uses Cloudflare Workers AI embeddings when available; keyword fallback otherwise.
 * Never invents citations — retrieval only returns seeded corpus rows.
 */
import { CASE_LAW_DATABASE, type CaseLawCitation } from '../data/case-law-database';

export type KnowledgeEnv = {
  DB: any;
  AI?: any;
};

export type KnowledgeChunk = {
  id: string;
  source: string;
  title: string;
  citation?: string;
  body: string;
  statutes_json: string;
  tags_json: string;
  embedding_json?: string | null;
};

const EMBED_MODEL = '@cf/baai/bge-base-en-v1.5';

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9§\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
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

export async function embedText(env: KnowledgeEnv, text: string): Promise<number[] | null> {
  if (!env.AI) return null;
  try {
    const res = await env.AI.run(EMBED_MODEL, { text: [text.slice(0, 8000)] });
    const vec = res?.data?.[0] || res?.[0] || res?.result?.data?.[0];
    if (Array.isArray(vec) && typeof vec[0] === 'number') return vec as number[];
    return null;
  } catch {
    return null;
  }
}

function chunkId(prefix: string, key: string): string {
  let h = 0;
  const s = `${prefix}:${key}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `kb_${prefix}_${h.toString(16)}`;
}

export function buildCaseLawChunks(): KnowledgeChunk[] {
  return (CASE_LAW_DATABASE || []).map((c: CaseLawCitation) => ({
    id: chunkId('case', c.citation || c.caseName),
    source: 'case_law',
    title: c.caseName,
    citation: c.citation,
    body: [
      c.keyHolding,
      c.quote ? `Quote: ${c.quote}` : '',
      `Court: ${c.court} (${c.year})`,
      `Statutes: ${(c.relevantStatutes || []).join(', ')}`,
      `Applies to: ${(c.applicableViolations || []).join(', ')}`,
    ].filter(Boolean).join('\n'),
    statutes_json: JSON.stringify(c.relevantStatutes || []),
    tags_json: JSON.stringify(c.applicableViolations || []),
  }));
}

const STATUTE_CHUNKS: KnowledgeChunk[] = [
  {
    id: 'kb_stat_1681e_b',
    source: 'statute',
    title: 'FCRA § 1681e(b) — Reasonable procedures for accuracy',
    citation: '15 U.S.C. § 1681e(b)',
    body: 'Consumer reporting agencies must follow reasonable procedures to assure maximum possible accuracy of the information concerning the individual about whom the report relates.',
    statutes_json: JSON.stringify(['15 U.S.C. § 1681e(b)']),
    tags_json: JSON.stringify(['accuracy', 'mixed-file', 'inaccurate-information']),
  },
  {
    id: 'kb_stat_1681i',
    source: 'statute',
    title: 'FCRA § 1681i — Reinvestigation',
    citation: '15 U.S.C. § 1681i',
    body: 'Upon dispute of completeness or accuracy, the CRA shall conduct a reasonable reinvestigation within 30 days (45 in limited cases) and delete or modify information that cannot be verified.',
    statutes_json: JSON.stringify(['15 U.S.C. § 1681i']),
    tags_json: JSON.stringify(['reinvestigation', 'dispute', 'deletion']),
  },
  {
    id: 'kb_stat_1681s2',
    source: 'statute',
    title: 'FCRA § 1681s-2 — Furnisher duties',
    citation: '15 U.S.C. § 1681s-2',
    body: 'Furnishers must provide accurate information and investigate disputes after receiving notice from a CRA. Willful/negligent failures create private rights of action under §1681n/§1681o after CRA notice path.',
    statutes_json: JSON.stringify(['15 U.S.C. § 1681s-2']),
    tags_json: JSON.stringify(['furnisher', 'accuracy', 'dispute']),
  },
  {
    id: 'kb_stat_1681c',
    source: 'statute',
    title: 'FCRA § 1681c — Obsolete information',
    citation: '15 U.S.C. § 1681c',
    body: 'Most adverse items older than 7 years (10 for certain bankruptcies) may not be reported. Obsolete reporting is a core accuracy/obsolescence violation.',
    statutes_json: JSON.stringify(['15 U.S.C. § 1681c']),
    tags_json: JSON.stringify(['obsolete', 'falloff', 'bankruptcy']),
  },
  {
    id: 'kb_stat_1692e',
    source: 'statute',
    title: 'FDCPA § 1692e — False or misleading representations',
    citation: '15 U.S.C. § 1692e',
    body: 'Debt collectors may not use false, deceptive, or misleading representations, including failing to communicate that a disputed debt is disputed (§1692e(8)).',
    statutes_json: JSON.stringify(['15 U.S.C. § 1692e']),
    tags_json: JSON.stringify(['fdcpa', 'collection', 'dispute']),
  },
];

export async function seedKnowledgeBase(env: KnowledgeEnv): Promise<{ upserted: number; embedded: number }> {
  const chunks = [...buildCaseLawChunks(), ...STATUTE_CHUNKS];
  let upserted = 0;
  let embedded = 0;
  for (const ch of chunks) {
    let embeddingJson: string | null = null;
    const vec = await embedText(env, `${ch.title}\n${ch.body}`);
    if (vec) {
      embeddingJson = JSON.stringify(vec);
      embedded++;
    }
    try {
      await env.DB.prepare(
        `INSERT INTO knowledge_chunks (id, source, title, citation, body, statutes_json, tags_json, embedding_json, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           body = excluded.body,
           statutes_json = excluded.statutes_json,
           tags_json = excluded.tags_json,
           embedding_json = COALESCE(excluded.embedding_json, knowledge_chunks.embedding_json),
           updated_at = datetime('now')`
      ).bind(ch.id, ch.source, ch.title, ch.citation || null, ch.body, ch.statutes_json, ch.tags_json, embeddingJson).run();
      upserted++;
    } catch (e) {
      console.warn('[kb] seed chunk failed', ch.id, e);
    }
  }
  return { upserted, embedded };
}

export async function retrieveKnowledge(
  env: KnowledgeEnv,
  query: string,
  limit = 6,
): Promise<{ results: Array<{ id: string; title: string; citation?: string; body: string; source: string; score: number; method: string }>; method: string; seededHint?: string }> {
  let rows: any[] = [];
  try {
    const all = await env.DB.prepare(`SELECT * FROM knowledge_chunks`).all();
    rows = all?.results || [];
  } catch {
    return { results: [], method: 'unavailable', seededHint: 'Run POST /api/admin/knowledge/seed after migration 0012' };
  }

  if (!rows.length) {
    // Auto-seed once if empty
    await seedKnowledgeBase(env);
    const all = await env.DB.prepare(`SELECT * FROM knowledge_chunks`).all().catch(() => ({ results: [] }));
    rows = all?.results || [];
  }

  const qEmbed = await embedText(env, query);
  if (qEmbed) {
    const scored = rows.map((r) => {
      let score = 0;
      try {
        const vec = r.embedding_json ? JSON.parse(r.embedding_json) : null;
        score = vec ? cosine(qEmbed, vec) : 0;
      } catch { score = 0; }
      return {
        id: r.id,
        title: r.title,
        citation: r.citation || undefined,
        body: r.body,
        source: r.source,
        score,
        method: 'embedding',
      };
    }).filter((r) => r.score > 0.25);
    scored.sort((a, b) => b.score - a.score);
    if (scored.length) return { results: scored.slice(0, limit), method: 'embedding' };
  }

  // Keyword fallback (deterministic, zero hallucination)
  const qTokens = tokenize(query);
  const scored = rows.map((r) => {
    const hay = tokenize(`${r.title} ${r.citation || ''} ${r.body} ${r.tags_json || ''}`);
    let score = 0;
    for (const t of qTokens) if (hay.includes(t)) score += 1;
    return {
      id: r.id,
      title: r.title,
      citation: r.citation || undefined,
      body: r.body,
      source: r.source,
      score,
      method: 'keyword',
    };
  }).filter((r) => r.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return { results: scored.slice(0, limit), method: 'keyword' };
}
