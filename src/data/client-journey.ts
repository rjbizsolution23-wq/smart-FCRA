/**
 * Personalized client journey + daily motivational wake-up engine.
 * Deterministic, encouraging, situation-aware — no AI required for reliability.
 */

export type JourneyPhase = 'get_started' | 'discover' | 'dispute' | 'rebuild' | 'fund_ready';

export type JourneyInput = {
  firstName: string;
  preferredLanguage?: string | null;
  eqScore?: number | null;
  exScore?: number | null;
  tuScore?: number | null;
  reportCount?: number;
  violationCount?: number;
  documentCount?: number;
  signedDocCount?: number;
  collectionCount?: number;
  revolvingUtilPct?: number | null;
  fundabilityOverall?: number | null;
  mortgageReady?: number | null;
  autoReady?: number | null;
  blockers?: string[];
  roadmapCompletedSteps?: number;
  roadmapTotalSteps?: number;
  educationCompleted?: number;
  educationTotal?: number;
  focusGoal?: string | null;
  streakDays?: number;
  sendDate?: string; // YYYY-MM-DD UTC
};

export type JourneySuggestion = {
  id: string;
  title: string;
  detail: string;
  ctaPage: string;
  priority: number;
  tone: 'encourage' | 'action' | 'celebrate';
};

export type DailyMotivation = {
  title: string;
  greeting: string;
  body: string;
  focusAction: string;
  focusCta: string;
  suggestions: JourneySuggestion[];
  phase: JourneyPhase;
  phaseLabel: string;
  encouragement: string;
};

export type JourneyPlan = {
  phase: JourneyPhase;
  phaseLabel: string;
  phaseDescription: string;
  progressPct: number;
  milestones: { id: string; label: string; done: boolean }[];
  suggestions: JourneySuggestion[];
  today: DailyMotivation;
  avgScore: number | null;
};

const PHASE_META: Record<JourneyPhase, { label: string; description: string }> = {
  get_started: {
    label: 'Getting Started',
    description: 'Upload your first credit report so we can map your personalized path.',
  },
  discover: {
    label: 'Discovery',
    description: 'We found accuracy issues — review them and understand your rights.',
  },
  dispute: {
    label: 'Dispute Campaign',
    description: 'Letters and reinvestigations are in motion. Stay consistent.',
  },
  rebuild: {
    label: 'Rebuild & Fundability',
    description: 'Clean up utilization, add positive data, and season your profile.',
  },
  fund_ready: {
    label: 'Approval Ready',
    description: 'You are closing in on mortgage/auto readiness. Stay disciplined.',
  },
};

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function avgScores(input: JourneyInput): number | null {
  const scores = [input.eqScore, input.exScore, input.tuScore].filter((n) => typeof n === 'number' && n > 0) as number[];
  if (!scores.length) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function resolveJourneyPhase(input: JourneyInput): JourneyPhase {
  if (!input.reportCount) return 'get_started';
  const fund = input.fundabilityOverall ?? 0;
  const utilOk = input.revolvingUtilPct == null || input.revolvingUtilPct <= 30;
  const collections = input.collectionCount || 0;
  if (fund >= 75 && utilOk && collections === 0 && (input.signedDocCount || 0) > 0) return 'fund_ready';
  if ((input.signedDocCount || 0) > 0 || (input.documentCount || 0) > 0) {
    if ((input.violationCount || 0) > 0 && fund < 70) return 'dispute';
    return 'rebuild';
  }
  if ((input.violationCount || 0) > 0) return 'discover';
  return 'rebuild';
}

export function buildJourneySuggestions(input: JourneyInput, phase: JourneyPhase): JourneySuggestion[] {
  const suggestions: JourneySuggestion[] = [];
  const goal = (input.focusGoal || 'mortgage').toLowerCase();

  if (phase === 'get_started') {
    suggestions.push({
      id: 'upload-report',
      title: 'Upload your credit report',
      detail: 'This unlocks violation detection, fundability scoring, and your daily action plan.',
      ctaPage: 'client-self-onboard',
      priority: 1,
      tone: 'action',
    });
    suggestions.push({
      id: 'meet-tutor',
      title: 'Meet your personal finance tutor',
      detail: 'Ask Alex anything — budgeting, FICO basics, or what lenders look for.',
      ctaPage: 'client-tutor',
      priority: 2,
      tone: 'encourage',
    });
  }

  if (phase === 'discover' || phase === 'dispute') {
    if ((input.violationCount || 0) > 0) {
      suggestions.push({
        id: 'review-violations',
        title: `Review ${input.violationCount} accuracy flag${input.violationCount === 1 ? '' : 's'}`,
        detail: 'Each verified inaccuracy is leverage under the FCRA — pin items and generate dispute letters.',
        ctaPage: 'client-cockpit',
        priority: 1,
        tone: 'action',
      });
    }
    if ((input.signedDocCount || 0) === 0 && (input.documentCount || 0) > 0) {
      suggestions.push({
        id: 'esign-letters',
        title: 'E-sign your dispute letters',
        detail: 'Signed letters keep your campaign moving. Do not let drafts sit unsigned.',
        ctaPage: 'client-documents',
        priority: 2,
        tone: 'action',
      });
    }
    suggestions.push({
      id: 'learn-fcra',
      title: 'Learn your FCRA rights (5 min)',
      detail: 'A short lesson on reinvestigation timelines builds confidence for the journey ahead.',
      ctaPage: 'client-knowledge',
      priority: 3,
      tone: 'encourage',
    });
  }

  if (phase === 'rebuild' || phase === 'fund_ready' || phase === 'dispute') {
    if (input.revolvingUtilPct != null && input.revolvingUtilPct > 30) {
      suggestions.push({
        id: 'crush-util',
        title: `Bring utilization under 30% (now ${input.revolvingUtilPct}%)`,
        detail: 'Paying revolving balances down is one of the fastest score lifts lenders care about.',
        ctaPage: 'client-fundability',
        priority: 1,
        tone: 'action',
      });
    }
    if ((input.collectionCount || 0) > 0) {
      suggestions.push({
        id: 'collections',
        title: `Address ${input.collectionCount} collection(s)`,
        detail: 'Validate, dispute inaccuracies, or plan a counsel-approved pay-for-delete strategy.',
        ctaPage: 'client-fundability',
        priority: 2,
        tone: 'action',
      });
    }
    suggestions.push({
      id: 'roadmap',
      title: goal.includes('auto') ? 'Continue your auto loan roadmap' : goal.includes('debt') ? 'Continue your debt-escape roadmap' : 'Continue your mortgage roadmap',
      detail: 'Check off today’s steps and document checklist so progress is visible.',
      ctaPage: 'client-fundability',
      priority: 3,
      tone: 'encourage',
    });
    if ((input.fundabilityOverall || 0) < 70) {
      suggestions.push({
        id: 'boost-tools',
        title: 'Explore profile-smart boost tools',
        detail: 'Rent reporting and credit builders can deepen a thin file when used responsibly.',
        ctaPage: 'client-tradelines',
        priority: 4,
        tone: 'encourage',
      });
    }
  }

  if (phase === 'fund_ready') {
    suggestions.push({
      id: 'season',
      title: 'Season 30–60 more clean days',
      detail: 'You are close — avoid new inquiries and keep every payment on time before applying.',
      ctaPage: 'client-fundability',
      priority: 1,
      tone: 'celebrate',
    });
    suggestions.push({
      id: 'doc-pack',
      title: 'Assemble your underwriting doc pack',
      detail: 'ID, income, bank statements, and LOEs — be ready when the right lender call comes.',
      ctaPage: 'client-uploads',
      priority: 2,
      tone: 'action',
    });
  }

  // Always keep messaging path warm
  suggestions.push({
    id: 'message-team',
    title: 'Message your credit team',
    detail: 'Questions? Wins? Stuck? Your advisors are one tap away in Messages.',
    ctaPage: 'client-messages',
    priority: 9,
    tone: 'encourage',
  });

  return suggestions.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

const OPENERS_EN = [
  'Hang in there — consistent small steps win this race.',
  'You showed up today. That already puts you ahead.',
  'Credit healing is a journey, not a sprint. You’ve got this.',
  'Every accurate dispute and paid-down balance moves the needle.',
  'Proud of you for staying on the path. Let’s keep the momentum.',
  'Your future approvals are built by the choices you make this week.',
];

const OPENERS_ES = [
  'Ánimo — los pasos pequeños y constantes ganan esta carrera.',
  'Hoy te presentaste. Eso ya te pone adelante.',
  'Sanar el crédito es un viaje, no una carrera. Tú puedes.',
  'Cada disputa precisa y cada saldo bajado mueve la aguja.',
  'Orgullosos de que sigas en el camino. Mantengamos el impulso.',
  'Tus futuras aprobaciones se construyen con las decisiones de esta semana.',
];

function dayIndex(dateStr: string): number {
  const n = dateStr.replace(/-/g, '');
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 997;
  return h;
}

export function buildDailyMotivation(input: JourneyInput, phase: JourneyPhase, suggestions: JourneySuggestion[]): DailyMotivation {
  const date = input.sendDate || todayUtc();
  const lang = (input.preferredLanguage || 'en').toLowerCase().startsWith('es') ? 'es' : 'en';
  const name = input.firstName || (lang === 'es' ? 'amigo/a' : 'friend');
  const openers = lang === 'es' ? OPENERS_ES : OPENERS_EN;
  const opener = openers[dayIndex(date) % openers.length];
  const meta = PHASE_META[phase];
  const focus = suggestions[0];
  const avg = avgScores(input);
  const streak = input.streakDays || 0;

  const streakLine =
    streak >= 3
      ? lang === 'es'
        ? ` Llevas ${streak} días seguidos — ¡impresionante!`
        : ` You’re on a ${streak}-day streak — that’s real commitment.`
      : streak === 1
        ? lang === 'es'
          ? ' Tu racha comienza hoy.'
          : ' Your streak starts today.'
        : '';

  const scoreLine =
    avg != null
      ? lang === 'es'
        ? ` Tu promedio de burós está cerca de ${avg}.`
        : ` Your average bureau score sits near ${avg}.`
      : '';

  const focusAction = focus
    ? focus.title
    : lang === 'es'
      ? 'Abre tu portal y completa un paso pequeño hoy'
      : 'Open your portal and complete one small step today';

  const body =
    lang === 'es'
      ? `${opener}${streakLine}${scoreLine}\n\nHoy estás en la etapa «${meta.label}». Enfócate en: ${focusAction}.\n\nNo tienes que hacerlo todo de una vez — solo el siguiente paso correcto. Estamos contigo.`
      : `${opener}${streakLine}${scoreLine}\n\nYou’re in the «${meta.label}» stage. Today’s focus: ${focusAction}.\n\nYou don’t have to do everything at once — just the next right step. We’re with you.`;

  const encouragement =
    lang === 'es'
      ? 'Este portal es tu centro de mando. Vuelve cada día — tu equipo y tus herramientas están aquí.'
      : 'This portal is your command center. Come back every day — your team and tools are right here.';

  return {
    title: lang === 'es' ? `Buenos días, ${name}` : `Good morning, ${name}`,
    greeting: lang === 'es' ? `Hola ${name}` : `Hi ${name}`,
    body,
    focusAction,
    focusCta: focus?.ctaPage || 'client-fundability',
    suggestions: suggestions.slice(0, 4),
    phase,
    phaseLabel: meta.label,
    encouragement,
  };
}

export function buildJourneyPlan(input: JourneyInput): JourneyPlan {
  const phase = resolveJourneyPhase(input);
  const suggestions = buildJourneySuggestions(input, phase);
  const today = buildDailyMotivation(input, phase, suggestions);
  const meta = PHASE_META[phase];
  const avg = avgScores(input);

  const milestones = [
    { id: 'report', label: 'Credit report uploaded', done: (input.reportCount || 0) > 0 },
    { id: 'violations_reviewed', label: 'Violations reviewed', done: (input.violationCount || 0) > 0 && phase !== 'get_started' },
    { id: 'letter_signed', label: 'Dispute letter signed', done: (input.signedDocCount || 0) > 0 },
    { id: 'util_healthy', label: 'Utilization under 30%', done: input.revolvingUtilPct != null && input.revolvingUtilPct <= 30 },
    { id: 'education', label: 'Education lesson completed', done: (input.educationCompleted || 0) > 0 },
    { id: 'roadmap', label: 'Roadmap steps in progress', done: (input.roadmapCompletedSteps || 0) > 0 },
  ];

  const doneCount = milestones.filter((m) => m.done).length;
  const phaseBoost = { get_started: 5, discover: 25, dispute: 45, rebuild: 65, fund_ready: 90 }[phase];
  const progressPct = Math.min(100, Math.round(phaseBoost * 0.6 + (doneCount / milestones.length) * 40));

  return {
    phase,
    phaseLabel: meta.label,
    phaseDescription: meta.description,
    progressPct,
    milestones,
    suggestions,
    today,
    avgScore: avg,
  };
}

export function nextStreak(lastCheckInDate: string | null | undefined, currentStreak: number, today: string): { streak: number; longestBump: boolean } {
  if (lastCheckInDate === today) return { streak: currentStreak || 1, longestBump: false };
  if (!lastCheckInDate) return { streak: 1, longestBump: true };
  const last = new Date(lastCheckInDate + 'T00:00:00Z').getTime();
  const now = new Date(today + 'T00:00:00Z').getTime();
  const dayMs = 86400000;
  const diff = Math.round((now - last) / dayMs);
  if (diff === 1) return { streak: (currentStreak || 0) + 1, longestBump: true };
  return { streak: 1, longestBump: true };
}
