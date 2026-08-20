/**
 * Tutor growth engine — companion levels with the client
 * Run: npx tsx tests/tutor-growth.test.mjs
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
  computeTutorXp,
  xpToLevel,
  resolveTutorRank,
  buildTutorGrowthProfile,
  buildTutorFallbackReply,
  buildTutorSystemAddendum,
} = await import(pathToFileURL(path.join(root, 'src/data/tutor-growth.ts')).href);

const beginner = buildTutorGrowthProfile({
  firstName: 'Sam',
  reportCount: 0,
  journeyPhase: 'get_started',
  phaseLabel: 'Getting Started',
  sessionsCount: 0,
  educationCompleted: 0,
  focusGoal: 'mortgage',
});
assert(beginner.level === 1, 'new client starts near level 1');
assert(beginner.rank === 'newcomer', 'newcomer rank');
assert(beginner.suggestedPrompts.length >= 2, 'has prompts');
assert(beginner.greeting.toLowerCase().includes('sam'), 'greets by name');

const advanced = buildTutorGrowthProfile({
  firstName: 'Salisha',
  journeyPhase: 'dispute',
  phaseLabel: 'Dispute Campaign',
  sessionsCount: 8,
  educationCompleted: 3,
  streakDays: 5,
  journeyProgressPct: 45,
  violationCount: 14,
  signedDocCount: 1,
  fundabilityOverall: 53,
  roadmapCompletedSteps: 4,
  milestonesDone: 3,
  focusGoal: 'mortgage',
  eqScore: 640,
  exScore: 635,
  tuScore: 650,
});
assert(advanced.level >= 3, 'active client levels up');
assert(['explorer', 'builder', 'strategist', 'fundability_coach'].includes(advanced.rank), 'rank advances');
assert(advanced.curriculumFocus.toLowerCase().includes('dispute') || advanced.curriculumFocus.length > 20, 'curriculum matches journey');

const fundReady = buildTutorGrowthProfile({
  firstName: 'Alex',
  journeyPhase: 'fund_ready',
  sessionsCount: 20,
  educationCompleted: 6,
  streakDays: 14,
  journeyProgressPct: 90,
  signedDocCount: 2,
  fundabilityOverall: 82,
  milestonesDone: 5,
  focusGoal: 'auto',
});
assert(fundReady.rank === 'fundability_coach' || fundReady.level >= 7, 'fund-ready unlocks coach tier');

const xp = computeTutorXp({ sessionsCount: 5, educationCompleted: 2, streakDays: 3 });
assert(xp > computeTutorXp({ sessionsCount: 0 }), 'more activity → more XP');
assert(xpToLevel(0).level === 1, '0 xp is level 1');
assert(resolveTutorRank(1, 'get_started') === 'newcomer', 'rank map');

const fallback = buildTutorFallbackReply(advanced, 'Quiz me on FICO', advanced);
assert(fallback.toLowerCase().includes('quiz') || fallback.includes('utilization'), 'fallback quiz content');
assert(buildTutorSystemAddendum(advanced, advanced).includes('GROWTH STATE'), 'system addendum present');
{
  const withBank = buildTutorFallbackReply({ ...advanced, financialSummary: 'DTI 32% · income $6200' }, 'walk me through my bank statement', advanced);
  assert(withBank.includes('6200') || withBank.includes('DTI'), 'fallback uses uploaded financial numbers');
}

console.log('PASS: tutor growth engine');
