/**
 * Client journey + daily motivation engine
 * Run: npx tsx tests/client-journey.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const {
  resolveJourneyPhase,
  buildJourneySuggestions,
  buildJourneyPlan,
  buildDailyMotivation,
  nextStreak,
} = await import(pathToFileURL(path.join(root, 'src/data/client-journey.ts')).href);

// Phase resolution
assert(resolveJourneyPhase({ firstName: 'A', reportCount: 0 }) === 'get_started', 'no report → get_started');
assert(
  resolveJourneyPhase({ firstName: 'A', reportCount: 1, violationCount: 3, documentCount: 0, signedDocCount: 0 }) === 'discover',
  'violations without letters → discover',
);
assert(
  resolveJourneyPhase({
    firstName: 'A',
    reportCount: 1,
    violationCount: 2,
    documentCount: 1,
    signedDocCount: 1,
    fundabilityOverall: 50,
  }) === 'dispute',
  'signed letters + violations → dispute',
);
assert(
  resolveJourneyPhase({
    firstName: 'A',
    reportCount: 1,
    signedDocCount: 1,
    fundabilityOverall: 80,
    revolvingUtilPct: 20,
    collectionCount: 0,
  }) === 'fund_ready',
  'high fundability → fund_ready',
);

// Suggestions are situation-aware
const utilSuggestions = buildJourneySuggestions(
  { firstName: 'Sam', reportCount: 1, signedDocCount: 1, revolvingUtilPct: 55, fundabilityOverall: 55, focusGoal: 'mortgage' },
  'rebuild',
);
assert(utilSuggestions.some((s) => s.id === 'crush-util'), 'high util suggests crush-util');
assert(utilSuggestions[0].ctaPage, 'suggestions have CTA pages');

const plan = buildJourneyPlan({
  firstName: 'Jordan',
  preferredLanguage: 'en',
  reportCount: 1,
  violationCount: 4,
  documentCount: 2,
  signedDocCount: 0,
  eqScore: 620,
  exScore: 615,
  tuScore: 630,
  sendDate: '2026-07-29',
  streakDays: 4,
  focusGoal: 'mortgage',
});
assert(plan.phase === 'discover' || plan.phase === 'dispute' || plan.phase === 'rebuild', 'plan has active phase');
assert(plan.progressPct >= 0 && plan.progressPct <= 100, 'progress pct in range');
assert(plan.today.title.toLowerCase().includes('jordan'), 'motivation greets by name');
assert(plan.today.body.length > 40, 'motivation body present');
assert(plan.today.quote && plan.today.quote.length > 10, 'daily quote present');
assert(plan.today.quoteAttribution, 'quote attribution present');
assert(plan.today.statusSummary.includes('Dispute') || plan.today.statusSummary.includes('stage') || plan.today.statusSummary.length > 10, 'status summary present');
assert(plan.today.ritualBody.includes(plan.today.quote), 'ritual body includes quote');
assert(plan.suggestions.length >= 1, 'has suggestions');
assert(plan.milestones.length >= 4, 'has milestones');

const es = buildDailyMotivation(
  { firstName: 'Maria', preferredLanguage: 'es', sendDate: '2026-07-29', streakDays: 1 },
  'discover',
  plan.suggestions,
);
assert(es.title.toLowerCase().includes('maria') || es.greeting.toLowerCase().includes('maria'), 'ES greeting uses name');
assert(/ánimo|hola|etapa|camino/i.test(es.body + es.encouragement), 'ES motivation uses Spanish copy');

// Streak continuity
assert(nextStreak(null, 0, '2026-07-29').streak === 1, 'first check-in streak 1');
assert(nextStreak('2026-07-28', 3, '2026-07-29').streak === 4, 'consecutive day increments');
assert(nextStreak('2026-07-29', 4, '2026-07-29').streak === 4, 'same day keeps streak');
assert(nextStreak('2026-07-20', 10, '2026-07-29').streak === 1, 'gap resets streak');

console.log('PASS: client journey + daily motivation engine');
