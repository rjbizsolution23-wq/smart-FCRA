/**
 * Tutor that grows with the client — level, rank, curriculum, and context
 * evolve with journey phase, education, sessions, and fundability progress.
 */

export type TutorGrowthInput = {
  firstName: string;
  preferredLanguage?: string | null;
  eqScore?: number | null;
  exScore?: number | null;
  tuScore?: number | null;
  journeyPhase?: string | null;
  phaseLabel?: string | null;
  focusGoal?: string | null;
  streakDays?: number;
  journeyProgressPct?: number;
  violationCount?: number;
  signedDocCount?: number;
  fundabilityOverall?: number | null;
  revolvingUtilPct?: number | null;
  collectionCount?: number;
  educationCompleted?: number;
  educationTotal?: number;
  sessionsCount?: number;
  roadmapCompletedSteps?: number;
  milestonesDone?: number;
  milestonesTotal?: number;
};

export type TutorRank =
  | 'newcomer'
  | 'explorer'
  | 'builder'
  | 'strategist'
  | 'fundability_coach';

export type TutorGrowthProfile = {
  level: number; // 1–10
  xp: number;
  xpToNext: number;
  rank: TutorRank;
  rankTitle: string;
  rankDescription: string;
  curriculumFocus: string;
  nextUnlock: string;
  greeting: string;
  suggestedPrompts: { label: string; prompt: string }[];
  growthNotes: string[];
  companionTone: string;
};

const RANK_META: Record<TutorRank, { title: string; description: string; minLevel: number }> = {
  newcomer: {
    title: 'Newcomer Guide',
    description: 'Getting to know you — credit basics and first steps.',
    minLevel: 1,
  },
  explorer: {
    title: 'Credit Explorer',
    description: 'Discovering your file, rights, and what lenders look for.',
    minLevel: 3,
  },
  builder: {
    title: 'Rebuild Partner',
    description: 'Working disputes, utilization, and weekly money habits together.',
    minLevel: 5,
  },
  strategist: {
    title: 'Fundability Strategist',
    description: 'Roadmaps, underwriting readiness, and profile-smart boosts.',
    minLevel: 7,
  },
  fundability_coach: {
    title: 'Approval Coach',
    description: 'Seasoning, doc packs, and staying approval-ready with you.',
    minLevel: 9,
  },
};

function avgScores(input: TutorGrowthInput): number | null {
  const scores = [input.eqScore, input.exScore, input.tuScore].filter((n) => typeof n === 'number' && n > 0) as number[];
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function computeTutorXp(input: TutorGrowthInput): number {
  const sessions = input.sessionsCount || 0;
  const edu = input.educationCompleted || 0;
  const streak = input.streakDays || 0;
  const journeyPct = input.journeyProgressPct || 0;
  const roadmap = input.roadmapCompletedSteps || 0;
  const milestones = input.milestonesDone || 0;
  const signed = input.signedDocCount || 0;
  const fund = input.fundabilityOverall || 0;

  return Math.round(
    sessions * 12 +
      edu * 25 +
      Math.min(streak, 30) * 4 +
      journeyPct * 0.8 +
      roadmap * 8 +
      milestones * 15 +
      signed * 20 +
      fund * 0.35,
  );
}

export function xpToLevel(xp: number): { level: number; xpIntoLevel: number; xpToNext: number } {
  // Soft curve: ~40 XP per early level, rising slightly
  let level = 1;
  let remaining = Math.max(0, xp);
  while (level < 10) {
    const need = 35 + level * 12;
    if (remaining < need) return { level, xpIntoLevel: remaining, xpToNext: need };
    remaining -= need;
    level++;
  }
  return { level: 10, xpIntoLevel: remaining, xpToNext: 0 };
}

export function resolveTutorRank(level: number, phase?: string | null): TutorRank {
  if (level >= 9 || phase === 'fund_ready') return 'fundability_coach';
  if (level >= 7 || phase === 'rebuild') return 'strategist';
  if (level >= 5 || phase === 'dispute') return 'builder';
  if (level >= 3 || phase === 'discover') return 'explorer';
  return 'newcomer';
}

function curriculumFor(phase: string | null | undefined, goal: string | null | undefined, rank: TutorRank): string {
  const g = (goal || 'mortgage').toLowerCase();
  const goalLabel = g.includes('auto')
    ? 'auto loan readiness'
    : g.includes('debt')
      ? 'debt-escape and cash-flow'
      : g.includes('student')
        ? 'student / education funding'
        : g.includes('rebuild')
          ? 'general credit rebuild'
          : 'mortgage readiness';

  switch (phase) {
    case 'get_started':
      return `Credit report upload, FICO vs Vantage basics, and how this portal works — then we aim toward ${goalLabel}.`;
    case 'discover':
      return `Understanding accuracy flags, FCRA rights in plain English, and what each violation means for ${goalLabel}.`;
    case 'dispute':
      return `Staying consistent during disputes, e-sign discipline, and weekly habits that support ${goalLabel}.`;
    case 'rebuild':
      return `Utilization, collections strategy awareness, positive data, and the ${goalLabel} roadmap.`;
    case 'fund_ready':
      return `Seasoning clean days, underwriting doc packs, avoiding new inquiries, and locking in ${goalLabel}.`;
    default:
      return RANK_META[rank].description;
  }
}

function promptsFor(input: TutorGrowthInput, rank: TutorRank): { label: string; prompt: string }[] {
  const phase = input.journeyPhase || 'get_started';
  const goal = (input.focusGoal || 'mortgage').toLowerCase();
  const goalAsk = goal.includes('auto')
    ? 'auto loan'
    : goal.includes('debt')
      ? 'getting out of debt'
      : goal.includes('student')
        ? 'student financing'
        : 'mortgage';

  const base: { label: string; prompt: string }[] = [];

  if (phase === 'get_started') {
    base.push(
      { label: 'Start here', prompt: 'What should I do first in my portal to start my credit journey?' },
      { label: 'FICO basics', prompt: 'Quiz me gently on FICO basics for beginners.' },
    );
  } else if (phase === 'discover' || phase === 'dispute') {
    base.push(
      { label: 'My flags', prompt: `I have about ${input.violationCount || 0} accuracy flags — explain what that means for me in plain English.` },
      { label: 'Stay consistent', prompt: 'Help me stay motivated while my dispute letters are in motion.' },
    );
  } else if (phase === 'rebuild') {
    base.push(
      { label: 'Utilization', prompt: `My revolving utilization is ${input.revolvingUtilPct != null ? input.revolvingUtilPct + '%' : 'unknown'} — coach me on getting under 30%.` },
      { label: 'Weekly plan', prompt: 'Build me a realistic weekly budget and credit action plan.' },
    );
  } else {
    base.push(
      { label: 'Stay ready', prompt: `I am close to ${goalAsk} ready — what should I do the next 30 days?` },
      { label: 'Doc pack', prompt: 'Walk me through the underwriting documents I should prepare.' },
    );
  }

  base.push({ label: `${goalAsk} next`, prompt: `What should I do next for ${goalAsk} readiness given where I am now?` });

  if (rank === 'strategist' || rank === 'fundability_coach') {
    base.push({ label: 'Quiz me deeper', prompt: 'Quiz me on underwriting and fundability — intermediate level.' });
  } else {
    base.push({ label: 'Quiz me', prompt: 'Quiz me on FICO basics.' });
  }

  return base.slice(0, 5);
}

function nextUnlock(level: number, rank: TutorRank): string {
  if (level >= 10) return 'Max level — keep sessions going to deepen your memory together.';
  if (rank === 'newcomer') return 'Complete a lesson + 2 tutor chats to unlock Credit Explorer.';
  if (rank === 'explorer') return 'Sign a letter or finish 2 education lessons to unlock Rebuild Partner.';
  if (rank === 'builder') return 'Grow your journey streak and roadmap steps to unlock Fundability Strategist.';
  if (rank === 'strategist') return 'Hit stronger fundability + keep check-ins to unlock Approval Coach.';
  return 'Keep showing up — your tutor memory gets sharper every session.';
}

export function buildTutorGrowthProfile(input: TutorGrowthInput): TutorGrowthProfile {
  const xp = computeTutorXp(input);
  const { level, xpIntoLevel, xpToNext } = xpToLevel(xp);
  const rank = resolveTutorRank(level, input.journeyPhase);
  const meta = RANK_META[rank];
  const lang = (input.preferredLanguage || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const name = input.firstName || (lang === 'es' ? 'amigo/a' : 'friend');
  const avg = avgScores(input);
  const phaseLabel = input.phaseLabel || input.journeyPhase || 'your journey';

  const growthNotes: string[] = [];
  if ((input.sessionsCount || 0) >= 1) growthNotes.push(`${input.sessionsCount} tutor session${(input.sessionsCount || 0) === 1 ? '' : 's'} together`);
  if ((input.educationCompleted || 0) > 0) growthNotes.push(`${input.educationCompleted} education lesson(s) completed`);
  if ((input.streakDays || 0) >= 2) growthNotes.push(`${input.streakDays}-day journey streak`);
  if ((input.signedDocCount || 0) > 0) growthNotes.push('Dispute letter progress unlocked deeper coaching');
  if ((input.fundabilityOverall || 0) >= 70) growthNotes.push('Fundability climbing — strategy mode available');
  if (!growthNotes.length) growthNotes.push('Just getting started — every chat helps me know you better');

  const greeting =
    lang === 'es'
      ? `Hola ${name} — soy Alex, tu tutor (nivel ${level}, ${meta.title}). Estamos en «${phaseLabel}».${avg != null ? ` Tu promedio de burós está cerca de ${avg}.` : ''} Pregúntame lo que necesites hoy.`
      : `Hi ${name} — I’m Alex, your tutor (Level ${level} · ${meta.title}). You’re in «${phaseLabel}».${avg != null ? ` Your average bureau score sits near ${avg}.` : ''} Ask me anything for where you are right now.`;

  const companionTone =
    rank === 'fundability_coach'
      ? 'Celebrate discipline; focus on seasoning and avoiding new risk.'
      : rank === 'strategist'
        ? 'Be tactical and roadmap-oriented; connect money habits to lender optics.'
        : rank === 'builder'
          ? 'Encourage consistency; keep dispute and utilization coaching practical.'
          : 'Be warm and foundational; explain simply and celebrate first wins.';

  return {
    level,
    xp,
    xpToNext: xpToNext || 100,
    rank,
    rankTitle: meta.title,
    rankDescription: meta.description,
    curriculumFocus: curriculumFor(input.journeyPhase, input.focusGoal, rank),
    nextUnlock: nextUnlock(level, rank),
    greeting,
    suggestedPrompts: promptsFor(input, rank),
    growthNotes,
    companionTone,
  };
}

/** Deterministic fallback reply when AI providers are unavailable — still journey-aware. */
export function buildTutorFallbackReply(input: TutorGrowthInput, message: string, growth: TutorGrowthProfile): string {
  const lower = message.toLowerCase();
  const name = input.firstName || 'friend';
  const goal = (input.focusGoal || 'mortgage').toLowerCase();

  if (lower.includes('quiz') || lower.includes('fico')) {
    return `Quick quiz for you, ${name} (Level ${growth.level}):\n1) What utilization % do most lenders prefer on revolving cards?\n2) About how many days do CRAs usually have to reinvestigate a dispute?\n3) Name one thing that does NOT help ${goal} readiness: new inquiries, on-time payments, or lower balances.\n\nReply with your answers and I’ll grade you. Hint: aim under 30% utilization, ~30 days for reinvestigation, and avoid unnecessary inquiries.`;
  }

  if (lower.includes('budget') || lower.includes('cash')) {
    return `${name}, here’s a Level ${growth.level} weekly money plan:\n• List every income deposit this month\n• Cap revolving spend so utilization trends under 30%\n• Automate at least one “credit health” payment mid-cycle\n• Keep a 1-page note of wins for our next session\n\nFocus right now: ${growth.curriculumFocus}`;
  }

  if (lower.includes('next') || lower.includes('mortgage') || lower.includes('auto') || lower.includes('should i')) {
    const phase = input.journeyPhase || 'get_started';
    if (phase === 'get_started') return `Next step: upload your credit report so we can personalize everything. Then meet me here again — I’ll level up with you.`;
    if (phase === 'discover' || phase === 'dispute') return `Next step: review your accuracy flags, e-sign any draft letters, and check in on My Journey today. That keeps your ${growth.rankTitle} path moving.`;
    if (phase === 'rebuild') return `Next step: crush utilization if it’s high, continue your ${goal} roadmap, and ask me for a mid-week check.`;
    return `Next step: season clean days, assemble your underwriting doc pack, and avoid new inquiries. You’re in Approval Coach territory — stay disciplined.`;
  }

  return `${growth.greeting}\n\nI’m growing with you as a ${growth.rankTitle}. Current focus: ${growth.curriculumFocus}\n\nYou asked: “${message.slice(0, 180)}”\n\nPractical take: take one small action from My Journey today, then come back and tell me what you did — I’ll remember and coach the next step. (AI chat may be offline; this guidance is still tailored to your progress.)`;
}

export function buildTutorSystemAddendum(input: TutorGrowthInput, growth: TutorGrowthProfile): string {
  return `GROWTH STATE (you evolve with this client — never ignore it):
- Tutor level ${growth.level}/10 · rank: ${growth.rankTitle} (${growth.rank})
- XP ${growth.xp} (next level needs ~${growth.xpToNext} more into-band XP)
- Journey phase: ${input.journeyPhase || 'unknown'} (${input.phaseLabel || ''}) · focus goal: ${input.focusGoal || 'mortgage'}
- Streak: ${input.streakDays || 0} days · education ${input.educationCompleted || 0}/${input.educationTotal || 8} · sessions ${input.sessionsCount || 0}
- Violations on file: ${input.violationCount || 0} · signed docs: ${input.signedDocCount || 0}
- Fundability: ${input.fundabilityOverall ?? 'n/a'} · util%: ${input.revolvingUtilPct ?? 'n/a'} · collections: ${input.collectionCount || 0}
- Curriculum focus: ${growth.curriculumFocus}
- Tone: ${growth.companionTone}
- Growth notes: ${growth.growthNotes.join('; ')}

Coach at THEIR level — beginner language for newcomers, tactical for strategists. Reference their journey phase and celebrate streak/education progress when relevant. Assign one concrete next action each reply.`;
}
