/**
 * Intelligent AU tradeline matcher — scores inventory against client credit profile
 * and explains expected impact (education, not a score guarantee).
 */
import type { EnrichedTradeline } from '../lib/tradelinemaster-client';

export type ClientCreditProfile = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  eqScore?: number | null;
  exScore?: number | null;
  tuScore?: number | null;
  avgScore?: number | null;
  accountCount?: number | null;
  revolvingCount?: number | null;
  installmentCount?: number | null;
  collectionCount?: number | null;
  inquiryCount?: number | null;
  oldestAccountYears?: number | null;
  goal?: string | null;
  utilizationPct?: number | null;
  hasThinFile?: boolean;
};

export type TradelineMatch = {
  tradeline: EnrichedTradeline;
  matchScore: number;
  tier: 'best' | 'strong' | 'good' | 'stretch';
  reasons: string[];
  impact: {
    utilizationHelp: string;
    ageHelp: string;
    mixHelp: string;
    timingHelp: string;
    estimatedScoreBand: string;
    caveats: string[];
  };
};

function avgScore(p: ClientCreditProfile): number {
  if (p.avgScore != null && Number.isFinite(p.avgScore)) return Number(p.avgScore);
  const scores = [p.eqScore, p.exScore, p.tuScore].filter((n) => n != null && Number(n) > 0) as number[];
  if (!scores.length) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function isThin(p: ClientCreditProfile): boolean {
  if (p.hasThinFile) return true;
  const accounts = Number(p.accountCount || 0);
  const score = avgScore(p);
  return accounts < 3 || score > 0 && score < 640;
}

/**
 * Rough educational estimate of how an AU tradeline may help.
 * Not a FICO prediction — disclosed as educational guidance.
 */
export function estimateImpact(profile: ClientCreditProfile, t: EnrichedTradeline) {
  const score = avgScore(profile);
  const thin = isThin(profile);
  const util = Number(profile.utilizationPct || 0);
  const caveats = [
    'Authorized-user results vary by bureau scoring model and primary cardholder history.',
    'This is educational guidance from RJ Business Solutions — not a guaranteed score increase.',
    'Payment history on the primary account must remain positive for AU benefits to hold.',
  ];

  let utilPts = 0;
  if (util >= 50 && t.creditLimit >= 10000) utilPts = 25;
  else if (util >= 30 && t.creditLimit >= 5000) utilPts = 18;
  else if (t.creditLimit >= 15000) utilPts = 12;
  else utilPts = 6;

  let agePts = 0;
  if (t.accountAgeYears >= 10) agePts = 20;
  else if (t.accountAgeYears >= 5) agePts = 14;
  else if (t.accountAgeYears >= 2) agePts = 8;
  else agePts = 3;

  const mixPts = Number(profile.revolvingCount || 0) < 2 ? 10 : 4;
  const thinBonus = thin ? 15 : 0;
  const raw = utilPts + agePts + mixPts + thinBonus;
  const low = score > 0 ? Math.min(40, Math.round(raw * 0.35)) : null;
  const high = score > 0 ? Math.min(75, Math.round(raw * 0.7)) : null;

  return {
    utilizationHelp:
      t.creditLimit >= 20000
        ? `High limit ($${t.creditLimit.toLocaleString()}) can dilute revolving utilization if balances stay low.`
        : `Limit of $${t.creditLimit.toLocaleString()} may modestly improve utilization depending on current balances.`,
    ageHelp:
      t.accountAgeYears >= 7
        ? `Seasoned ${t.accountAgeLabel} account can support average age of accounts.`
        : `Account age ${t.accountAgeLabel} — prefer 5+ years when building age is a priority.`,
    mixHelp:
      Number(profile.revolvingCount || 0) < 2
        ? 'Adds revolving depth for thin/rebuild profiles.'
        : 'Adds another positive revolving line alongside existing cards.',
    timingHelp: `Statement ${t.statementLabel}; typical posting window ${t.postingWindowLabel}. Plan AU add before statement for best cycle timing.`,
    estimatedScoreBand:
      score > 0 && low != null && high != null
        ? `Educational band if AU posts cleanly: roughly +${low} to +${high} pts over 30–60 days (highly variable). Current avg ~${score}.`
        : 'Upload a credit report for a personalized educational impact band.',
    caveats,
  };
}

export function scoreTradelineForClient(
  profile: ClientCreditProfile,
  t: EnrichedTradeline,
): TradelineMatch {
  const score = avgScore(profile);
  const thin = isThin(profile);
  const goal = String(profile.goal || '').toLowerCase();
  const reasons: string[] = [];
  let pts = 0;

  // Limit / utilization leverage
  if (t.creditLimit >= 25000) { pts += 28; reasons.push('High credit limit ($25k+)'); }
  else if (t.creditLimit >= 15000) { pts += 22; reasons.push('Strong credit limit ($15k+)'); }
  else if (t.creditLimit >= 8000) { pts += 14; reasons.push('Solid mid-tier limit'); }
  else { pts += 6; reasons.push('Entry-level limit'); }

  // Age
  if (t.accountAgeYears >= 15) { pts += 26; reasons.push('Very seasoned (15+ yrs)'); }
  else if (t.accountAgeYears >= 8) { pts += 20; reasons.push('Well seasoned (8+ yrs)'); }
  else if (t.accountAgeYears >= 4) { pts += 12; reasons.push('Moderate age (4+ yrs)'); }
  else { pts += 4; reasons.push('Younger line — better for mix than age'); }

  // Spots / availability
  if (t.spotsAvailable >= 2) { pts += 8; reasons.push(`${t.spotsAvailable} spots open`); }
  else if (t.spotsAvailable === 1) { pts += 4; reasons.push('Last spot — act soon'); }

  // Lender preference (common AU-friendly banks)
  const preferred = ['BARCLAYS', 'CITIBANK', 'CHASE', 'AMEX', 'CAPITAL ONE', 'NFCU', 'USBANK', 'PNC', 'ELAN'];
  if (preferred.includes(t.lender)) { pts += 6; reasons.push(`${t.lender} commonly used for AU programs`); }

  // Price value (retail per $1k limit)
  const value = t.creditLimit > 0 ? t.retailPrice / (t.creditLimit / 1000) : 999;
  if (value < 25) { pts += 10; reasons.push('Strong value vs limit'); }
  else if (value < 40) { pts += 5; reasons.push('Fair value vs limit'); }

  // Profile fit
  if (thin && t.creditLimit >= 10000 && t.accountAgeYears >= 5) {
    pts += 18;
    reasons.push('Excellent thin-file / rebuild fit');
  }
  if (score > 0 && score < 620 && t.accountAgeYears >= 7) {
    pts += 10;
    reasons.push('Seasoned line supports rebuild path');
  }
  if ((goal.includes('mortgage') || goal.includes('home')) && t.accountAgeYears >= 5 && t.creditLimit >= 10000) {
    pts += 12;
    reasons.push('Aligned with mortgage-depth goals');
  }
  if ((goal.includes('auto') || goal.includes('car')) && t.creditLimit >= 5000) {
    pts += 6;
    reasons.push('Supports auto underwriting depth');
  }

  // Timing — sooner statement can post faster
  const daysToStatement = (() => {
    try {
      const s = new Date(t.statementDate).getTime();
      return Math.round((s - Date.now()) / 86400000);
    } catch { return 30; }
  })();
  if (daysToStatement >= 0 && daysToStatement <= 14) {
    pts += 8;
    reasons.push('Statement within 2 weeks — faster potential post');
  }

  // Soft penalty for expensive lines on low scores (budget awareness)
  if (score > 0 && score < 600 && t.retailPrice > 900) {
    pts -= 8;
    reasons.push('Premium price — confirm budget / payment plan');
  }

  let tier: TradelineMatch['tier'] = 'stretch';
  if (pts >= 70) tier = 'best';
  else if (pts >= 55) tier = 'strong';
  else if (pts >= 40) tier = 'good';

  return {
    tradeline: t,
    matchScore: pts,
    tier,
    reasons: reasons.slice(0, 6),
    impact: estimateImpact(profile, t),
  };
}

export function matchTradelinesForClient(
  profile: ClientCreditProfile,
  inventory: EnrichedTradeline[],
  limit = 12,
): {
  profileSummary: {
    avgScore: number;
    thinFile: boolean;
    goal: string;
    focus: string[];
  };
  matches: TradelineMatch[];
  agentBrief: string;
} {
  const score = avgScore(profile);
  const thin = isThin(profile);
  const goal = String(profile.goal || 'general credit building');
  const focus: string[] = [];
  if (thin) focus.push('Add seasoned revolving depth');
  if (Number(profile.utilizationPct || 0) >= 30) focus.push('Lower utilization with high-limit AU');
  if (Number(profile.oldestAccountYears || 0) < 3) focus.push('Prefer 5–10+ year aged lines');
  if (!focus.length) focus.push('Optimize limit + age + statement timing');

  const matches = inventory
    .filter((t) => t.spotsAvailable > 0)
    .map((t) => scoreTradelineForClient(profile, t))
    .sort((a, b) => b.matchScore - a.matchScore || b.tradeline.creditLimit - a.tradeline.creditLimit)
    .slice(0, limit);

  const top = matches[0];
  const agentBrief = top
    ? `RJ Tradeline Agent: For ${profile.firstName || 'this client'}` +
      (score ? ` (avg score ~${score})` : '') +
      `, I recommend starting with ${top.tradeline.lender} $${top.tradeline.creditLimit.toLocaleString()} ` +
      `(${top.tradeline.accountAgeLabel}, statement ${top.tradeline.statementLabel}) at $${top.tradeline.retailPrice.toFixed(2)}. ` +
      `${top.impact.estimatedScoreBand} Email ${'tradelines@smartfcra.com'} to arrange payment and placement.`
    : 'No open tradeline spots matched right now — refresh inventory or widen filters.';

  return {
    profileSummary: { avgScore: score, thinFile: thin, goal, focus },
    matches,
    agentBrief,
  };
}
