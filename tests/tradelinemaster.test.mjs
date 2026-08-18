/**
 * TradelineMaster helpers
 * Run: npx tsx tests/tradelinemaster.test.mjs
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
  applyMarkup,
  enrichTradeline,
  filterTradelines,
  TRADELINE_MARKUP_RATE,
  accountAgeParts,
} = await import(pathToFileURL(path.join(root, 'src/lib/tradelinemaster-client.ts')).href);

const { matchTradelinesForClient } = await import(
  pathToFileURL(path.join(root, 'src/engine/tradeline-matcher.ts')).href
);

assert(TRADELINE_MARKUP_RATE === 0.125, 'markup rate');
const m = applyMarkup(400);
assert(m.retailPrice === 450, '12.5% of 400 = 450');
assert(m.markupAmount === 50, 'markup amount');

const enriched = enrichTradeline({
  Id: 1,
  Price: 400,
  SpotsAvailable: 2,
  Lender: 'BARCLAYS',
  Cycles: 2,
  Limit: 20000,
  DateOpened: '2015-01-01T00:00:00',
  StatementDate: '2026-08-10T00:00:00',
  PostingDate: '2026-08-25T00:00:00',
});
assert(enriched.retailPrice === 450, 'enriched retail');
assert(enriched.lender === 'BARCLAYS', 'lender');
assert(enriched.statementDay === 10, 'statement day');
assert(enriched.postingWindowLabel.includes('Aug'), 'posting window');
assert(enriched.accountAgeYears >= 10, 'age years');

const age = accountAgeParts('2020-01-15T00:00:00', new Date('2026-08-09T00:00:00Z'));
assert(age.years === 6, 'age calc years');

const filtered = filterTradelines([enriched], { lender: 'BARCLAYS', minLimit: 10000 });
assert(filtered.length === 1, 'filter pass');
assert(filterTradelines([enriched], { lender: 'CHASE' }).length === 0, 'filter reject');

const matched = matchTradelinesForClient(
  { avgScore: 580, accountCount: 1, goal: 'mortgage', firstName: 'Test' },
  [enriched],
  5,
);
assert(matched.matches.length === 1, 'match count');
assert(matched.matches[0].tier === 'best' || matched.matches[0].matchScore > 40, 'match score');
assert(matched.agentBrief.includes('tradelines@smartfcra.com'), 'ops email in brief');

{
  const { listTradelineEducation } = await import(
    pathToFileURL(path.join(root, 'src/data/tradeline-education.ts')).href
  );
  const blob = JSON.stringify(listTradelineEducation());
  assert(!blob.includes('12.5%'), 'education must not advertise markup %');
}

console.log('tradelinemaster tests passed');
