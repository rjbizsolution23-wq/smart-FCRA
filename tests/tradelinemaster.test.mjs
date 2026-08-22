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
  toPublicTradeline,
  TRADELINE_MARKUP_RATE,
  TRADELINE_FLAT_FEE,
  accountAgeParts,
} = await import(pathToFileURL(path.join(root, 'src/lib/tradelinemaster-client.ts')).href);

const { matchTradelinesForClient } = await import(
  pathToFileURL(path.join(root, 'src/engine/tradeline-matcher.ts')).href
);

assert(TRADELINE_MARKUP_RATE === 0.125, 'markup rate');
assert(TRADELINE_FLAT_FEE === 100, 'flat fee');
const m = applyMarkup(400);
assert(m.retailPrice === 550, '12.5% of 400 (=450) + $100 flat = 550');
assert(m.markupAmount === 150, 'markup amount (percent + flat)');
assert(m.flatFee === 100, 'flat fee on result');

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
assert(enriched.retailPrice === 550, 'enriched retail (12.5% + $100 flat)');
assert(!('wholesalePrice' in toPublicTradeline(enriched)), 'public payload hides wholesale');
assert(!('markupRate' in toPublicTradeline(enriched)), 'public payload hides markup rate');
assert(!('flatFee' in toPublicTradeline(enriched)), 'public payload hides flat fee');
assert(toPublicTradeline(enriched).retailPrice === 550, 'public still has retail');
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

const { listTradelineEducation } = await import(pathToFileURL(path.join(root, 'src/data/tradeline-education.ts')).href);
const eduText = listTradelineEducation().map((l) => `${l.body} ${l.summary} ${(l.bullets||[]).join(' ')}`).join(' ');
assert(!/12\.5/.test(eduText), 'education does not advertise a fee percent');

console.log('tradelinemaster tests passed');
