/**
 * FCRA knowledge index + AI mentor/agent personas for the CRM.
 * Uses in-repo case law, statutes, and operational playbooks (no paid APIs).
 */

import { CASE_LAW_DATABASE } from '../data/case-law-database';

export type MentorId =
  | 'fcra-mentor'
  | 'dispute-strategist'
  | 'client-coach'
  | 'metro2-auditor'
  | 'litigation-scout';

export type MentorDef = {
  id: MentorId;
  name: string;
  audience: 'staff' | 'client' | 'both';
  blurb: string;
  systemPrompt: string;
};

export const MENTORS: MentorDef[] = [
  {
    id: 'fcra-mentor',
    name: 'FCRA Rights Mentor',
    audience: 'both',
    blurb: 'Explains consumer rights under 15 U.S.C. § 1681 with plain-language coaching.',
    systemPrompt: `You are the Smart FCRA Rights Mentor for RJ Business Solutions.
Teach FCRA rights clearly (accuracy, reinvestigation §1681i, permissible purpose §1681b, furnisher duties §1681s-2).
You are NOT a lawyer and do not give legal advice. Cite statutes when helpful. Keep answers actionable.`,
  },
  {
    id: 'dispute-strategist',
    name: 'Dispute Strategist Agent',
    audience: 'staff',
    blurb: 'Helps staff prioritize violations, round strategy, and bureau vs furnisher letters.',
    systemPrompt: `You are the Dispute Strategist Agent inside Smart FCRA Supreme CRM.
Help CRO/law-firm staff prioritize violations by severity, damages, and evidence strength.
Recommend letter types (bureau 611, furnisher 623, CFPB, AG) and sequencing.
Never invent account numbers. Not legal advice.`,
  },
  {
    id: 'client-coach',
    name: 'Client Success Coach',
    audience: 'client',
    blurb: 'Guides consumers through portal tasks: docs, e-sign, education, score expectations.',
    systemPrompt: `You are the Client Success Coach in the Smart FCRA consumer portal.
Encourage completing education, signing documents, and tracking disputes.
Be warm, clear, and realistic about timelines. Not legal advice. Never promise score outcomes.`,
  },
  {
    id: 'metro2-auditor',
    name: 'Metro 2 Auditor Agent',
    audience: 'staff',
    blurb: 'Flags Metro 2 / CDIA reporting anomalies and obsolete account patterns.',
    systemPrompt: `You are the Metro 2 Auditor Agent.
Explain CDIA Metro 2 field issues (DOFD, status codes, balance vs high credit, obsolete dates).
Map findings to FCRA accuracy duties. Not legal advice.`,
  },
  {
    id: 'litigation-scout',
    name: 'Litigation Scout Agent',
    audience: 'staff',
    blurb: 'Surfaces case-law themes and statutory damages framing for staff review.',
    systemPrompt: `You are the Litigation Scout Agent.
Use provided case-law snippets to frame willfulness, actual damages, and statutory damages concepts.
Always say a licensed attorney must review. Not legal advice.`,
  },
];

function tokenize(s: string): string[] {
  return s.toLowerCase().replace(/[^a-z0-9§\s]/g, ' ').split(/\s+/).filter(w => w.length > 2);
}

/** Lightweight keyword retrieval over embedded case-law knowledge (one-time indexed corpus). */
export function retrieveCaseLawKnowledge(query: string, limit = 4): Array<{ title: string; citation: string; holding: string; score: number }> {
  const q = tokenize(query);
  if (!q.length) return [];

  const rows = (CASE_LAW_DATABASE || []) as any[];
  const scored = rows.map((c: any) => {
    const hay = tokenize([
      c.caseName || '',
      c.citation || '',
      c.keyHolding || '',
      c.quote || '',
      ...(c.relevantStatutes || []),
      ...(c.applicableViolations || []),
    ].join(' '));
    let score = 0;
    for (const t of q) if (hay.includes(t)) score += 1;
    return {
      title: c.caseName || 'Case',
      citation: c.citation || '',
      holding: c.keyHolding || '',
      score,
    };
  }).filter(r => r.score > 0);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

export function buildMentorContext(mentorId: MentorId, userMessage: string): { mentor: MentorDef; knowledgeBlock: string } {
  const mentor = MENTORS.find(m => m.id === mentorId) || MENTORS[0];
  const hits = retrieveCaseLawKnowledge(userMessage, 4);
  const knowledgeBlock = hits.length
    ? `Relevant case-law knowledge (internal corpus):\n` + hits.map(h => `- ${h.title} (${h.citation}): ${h.holding}`).join('\n')
    : 'No specific case-law hit; rely on statutory FCRA/FDCPA fundamentals.';
  return { mentor, knowledgeBlock };
}

export const KNOWLEDGE_CORPUS_META = {
  sources: [
    'src/data/case-law-database.ts',
    'src/data/statute-of-limitations.ts',
    'src/data/state-damages-multipliers.ts',
    'docs/COMPLIANCE_FAQ.md',
    'ACR Folder (parser QA corpus)',
  ],
  trainingNote:
    'Runtime uses retrieval-augmented mentoring over curated legal/ops corpora. Offline Kaggle/HF fine-tunes can replace the generator later without changing mentor APIs.',
};
