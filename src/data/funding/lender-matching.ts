/**
 * Deterministic lender / tradeline matching.
 * LLMs may explain results; this engine owns eligibility.
 */
import {
  LENDER_CATALOG,
  LENDER_CATALOG_META,
  type LenderProductType,
  type LenderRecord,
} from './lenders-catalog';

export type FundingGoal = 'rebuild' | 'thin_file' | 'mortgage' | 'auto' | 'business' | 'student' | 'debt';

export type LenderMatchProfile = {
  avgScore: number;
  accountCount?: number;
  collectionCount?: number;
  goal?: string;
  /** Soft filter — only return these product types when set */
  types?: LenderProductType[];
  limit?: number;
  /** Allow matches within this many points below min score (default 20) */
  scoreGrace?: number;
};

export type LenderMatch = LenderRecord & {
  matchScore: number;
  eligible: boolean;
  nearMiss: boolean;
  reasons: string[];
};

function normalizeGoal(goal?: string): FundingGoal | undefined {
  if (!goal) return undefined;
  const g = goal.toLowerCase().trim();
  if (g.includes('mortgage') || g.includes('home')) return 'mortgage';
  if (g.includes('auto') || g.includes('car') || g.includes('vehicle')) return 'auto';
  if (g.includes('business') || g.includes('ein') || g.includes('duns')) return 'business';
  if (g.includes('student') || g.includes('education')) return 'student';
  if (g.includes('debt') || g.includes('dti')) return 'debt';
  if (g.includes('rebuild') || g.includes('repair')) return 'rebuild';
  if (g.includes('thin')) return 'thin_file';
  return undefined;
}

function inferredTags(profile: LenderMatchProfile): Set<FundingGoal> {
  const tags = new Set<FundingGoal>();
  const avg = profile.avgScore || 0;
  const accounts = profile.accountCount ?? 0;
  const collections = profile.collectionCount ?? 0;

  if (avg < 640 || accounts < 3) tags.add('thin_file');
  if (collections > 0 || avg < 620) tags.add('rebuild');

  const goal = normalizeGoal(profile.goal);
  if (goal) tags.add(goal);
  // Default consumer funding path when no goal given
  if (!goal) {
    tags.add('mortgage');
    tags.add('auto');
  }
  return tags;
}

function typePriority(type: LenderProductType, tags: Set<FundingGoal>, avg: number): number {
  if (tags.has('thin_file') || tags.has('rebuild') || avg < 640) {
    if (type === 'RENT_REPORTER') return 12;
    if (type === 'PRIMARY_TRADELINE') return 10;
  }
  if (tags.has('business')) {
    if (type === 'BUSINESS_CARD') return 14;
  }
  if (tags.has('mortgage') || tags.has('auto') || tags.has('student')) {
    if (type === 'CREDIT_UNION' || type === 'FINANCIAL_INSTITUTION') return 8;
  }
  return 2;
}

/**
 * Rank curated lenders for a client profile.
 * Does not invent products — only scores LENDER_CATALOG.
 */
export function matchLenders(profile: LenderMatchProfile): {
  meta: typeof LENDER_CATALOG_META & { matched: number; eligible: number };
  matches: LenderMatch[];
  byBucket: {
    rentReporters: LenderMatch[];
    builders: LenderMatch[];
    creditUnions: LenderMatch[];
    businessCards: LenderMatch[];
  };
} {
  const avg = Math.max(0, Math.min(900, Math.round(profile.avgScore || 0)));
  const grace = profile.scoreGrace ?? 20;
  const tags = inferredTags(profile);
  const typeFilter = profile.types?.length ? new Set(profile.types) : null;
  const limit = Math.max(1, Math.min(65, profile.limit ?? 20));

  const scored: LenderMatch[] = [];

  for (const lender of LENDER_CATALOG) {
    if (typeFilter && !typeFilter.has(lender.type)) continue;

    const reasons: string[] = [];
    let matchScore = 0;

    const eligible = avg >= lender.minCreditScore;
    const nearMiss = !eligible && avg + grace >= lender.minCreditScore;

    if (eligible) {
      matchScore += 40;
      reasons.push(`Score ${avg} meets min ${lender.minCreditScore}`);
    } else if (nearMiss) {
      matchScore += 15;
      reasons.push(`Near miss: score ${avg} within ${grace} of min ${lender.minCreditScore}`);
    } else {
      reasons.push(`Below min score ${lender.minCreditScore}`);
    }

    const goalOverlap = lender.goals.filter((g) => tags.has(g));
    matchScore += goalOverlap.length * 12;
    if (goalOverlap.length) {
      reasons.push(`Goal fit: ${goalOverlap.join(', ')}`);
    }

    matchScore += typePriority(lender.type, tags, avg);

    // Prefer lower barriers when rebuilding / thin file
    if ((tags.has('rebuild') || tags.has('thin_file')) && lender.minCreditScore <= 300) {
      matchScore += 8;
      reasons.push('Low barrier builder / reporter');
    }

    // Soft-penalize high-bar business cards for low scores
    if (lender.type === 'BUSINESS_CARD' && avg < 680) {
      matchScore -= 20;
    }

    scored.push({
      ...lender,
      matchScore,
      eligible,
      nearMiss,
      reasons,
    });
  }

  scored.sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
    return a.minCreditScore - b.minCreditScore;
  });

  const matches = scored.slice(0, limit);
  const eligibleCount = scored.filter((m) => m.eligible).length;

  const pick = (types: LenderProductType[], n: number) =>
    scored.filter((m) => types.includes(m.type)).slice(0, n);

  return {
    meta: {
      ...LENDER_CATALOG_META,
      matched: matches.length,
      eligible: eligibleCount,
    },
    matches,
    byBucket: {
      rentReporters: pick(['RENT_REPORTER'], 5),
      builders: pick(['PRIMARY_TRADELINE'], 6),
      creditUnions: pick(['CREDIT_UNION', 'FINANCIAL_INSTITUTION'], 8),
      businessCards: pick(['BUSINESS_CARD'], 6),
    },
  };
}

/** Sanity filter for future dump imports — reject obvious non-lender names. */
export function looksLikeRealLenderName(name: string): boolean {
  const n = (name || '').trim();
  if (n.length < 4 || n.length > 120) return false;
  if (/^(week|layer|phase|track|stage|option|section|tier)\b/i.test(n)) return false;
  if (/^(repository|web portal|role|url|api|github|purpose|focus):?\s*$/i.test(n)) return false;
  if (/\b(shrimp|punch|kick|headbutt|piledriver|framer motion|openai sora|fhir|ehr)\b/i.test(n)) return false;
  if (/^[\d️⃣⚡🔍🎨🏆🚀]+\s*/u.test(n) && n.length < 40) return false;
  if (/credit union|federal|bank|visa|mastercard|amex|american express|chase|self|chime|rent|tradeline|card|loan|nfc u|penfed/i.test(n)) {
    return true;
  }
  // Require at least two word tokens for other institutions
  return /\w+\s+\w+/.test(n) && !/[:#®™]?\s*$/.test(n.slice(0, 3));
}
