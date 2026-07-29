/**
 * Roadmap progress + comparison matrix unit-ish helpers
 * Run: npx tsx tests/roadmap-progress.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { buildFundabilityReport, estimateViolationScoreLift } = await import(
  pathToFileURL(path.join(root, 'src/data/fundability-engine.ts')).href
);

const report = buildFundabilityReport({
  eqScore: 640,
  exScore: 635,
  tuScore: 650,
  accounts: 5,
  collections: 1,
  inquiries: 2,
  violations: 3,
  revolvingUtilPct: 42,
});

assert(report.roadmaps.mortgage?.steps?.length >= 3, 'mortgage roadmap has steps');
assert(report.roadmaps.auto?.docsNeeded?.length >= 2, 'auto roadmap has docs');
assert(report.blockers.some((b) => b.toLowerCase().includes('utilization')), 'utilization blocker when util > 30');
assert(estimateViolationScoreLift(600, 'critical') > estimateViolationScoreLift(720, 'low'), 'lift scales with severity/gap');

console.log('PASS: roadmap + fundability progress helpers');
