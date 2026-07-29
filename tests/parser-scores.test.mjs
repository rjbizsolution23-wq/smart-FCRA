/**
 * Parser score extraction + revolving utilization tests
 * Run: npx tsx tests/parser-scores.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { extractCreditScores, computeRevolvingUtilization } = await import(
  pathToFileURL(path.join(root, 'src/engine/parser.ts')).href
);
const { estimateViolationScoreLift } = await import(
  pathToFileURL(path.join(root, 'src/data/fundability-engine.ts')).href
);

const sampleText = `
Equifax Credit Report
FICO Score 8: 642
VantageScore 3.0: 638
Your credit score is 642
`;

const scores = extractCreditScores(sampleText, 'Equifax');
assert(scores.fico === 642, 'extracts FICO score from report text');
assert(scores.vantage === 638, 'extracts Vantage score');

const util = computeRevolvingUtilization([
  { accountType: 'Credit Card', accountStatus: 'Open', creditLimit: 5000, currentBalance: 500, isCollection: false },
  { accountType: 'Credit Card', accountStatus: 'Open', creditLimit: 3000, currentBalance: 1500, isCollection: false },
  { accountType: 'Auto Loan', accountStatus: 'Open', creditLimit: 0, currentBalance: 12000, isCollection: false },
]);
assert(util.totalLimit === 8000, 'sums revolving limits only');
assert(util.totalBalance === 2000, 'sums revolving balances only');
assert(util.utilPct === 25, 'computes utilization percentage');

const liftLow = estimateViolationScoreLift(700, 'high');
const liftHigh = estimateViolationScoreLift(580, 'critical');
assert(liftHigh > liftLow, 'lower scores get higher projected lift for critical violations');
assert(liftLow >= 4 && liftLow <= 45, 'lift is bounded');

console.log('PASS: parser scores + utilization + fundability lift tests');
