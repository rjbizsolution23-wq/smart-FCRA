/**
 * Lender matching + curated catalog tests
 * Run: npx tsx tests/lender-matching.test.mjs
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
  LENDER_CATALOG,
  LENDER_CATALOG_META,
  catalogStats,
} = await import(pathToFileURL(path.join(root, 'src/data/funding/lenders-catalog.ts')).href);

const { matchLenders, looksLikeRealLenderName } = await import(
  pathToFileURL(path.join(root, 'src/data/funding/lender-matching.ts')).href
);

assert(LENDER_CATALOG.length === 65, `expected 65 curated lenders, got ${LENDER_CATALOG.length}`);
assert(LENDER_CATALOG_META.dumpClaimedTotal === 1656, 'dump claim documented');
assert(LENDER_CATALOG_META.curatedTotal === 65, 'curated total meta');

const stats = catalogStats();
assert(stats.byType.RENT_REPORTER === 3, '3 rent reporters');
assert(stats.byType.PRIMARY_TRADELINE === 6, '6 builders');
assert(stats.byType.BUSINESS_CARD === 6, '6 business cards');
assert(stats.rejectedFromDump === 1591, 'rejected count');

// Thin-file / rebuild profile — prefer reporters + builders
const low = matchLenders({ avgScore: 540, accountCount: 1, collectionCount: 2, goal: 'rebuild', limit: 10 });
assert(low.matches.length >= 5, 'low score returns matches');
assert(low.matches[0].type === 'RENT_REPORTER' || low.matches[0].type === 'PRIMARY_TRADELINE', 'low score tops builders/reporters');
assert(low.matches.every((m) => m.minCreditScore <= 300 || !m.eligible || m.type !== 'BUSINESS_CARD'), 'no high-bar business cards forced as top eligible for 540');
assert(low.byBucket.rentReporters.length >= 1, 'rent bucket filled');
assert(low.byBucket.builders.length >= 1, 'builder bucket filled');

// Business goal + strong score
const biz = matchLenders({ avgScore: 720, accountCount: 8, collectionCount: 0, goal: 'business', limit: 12 });
const bizTop = biz.matches.filter((m) => m.type === 'BUSINESS_CARD' && m.eligible);
assert(bizTop.length >= 3, 'business cards eligible at 720');
assert(biz.matches.some((m) => m.name.includes('Chase Ink')), 'includes Chase Ink');

// Mortgage near CU threshold
const mort = matchLenders({ avgScore: 655, accountCount: 5, collectionCount: 0, goal: 'mortgage', limit: 15 });
assert(mort.matches.some((m) => m.type === 'CREDIT_UNION' || m.type === 'FINANCIAL_INSTITUTION'), 'CUs in mortgage matches');
assert(mort.meta.eligible >= 1, 'some eligible at 655');

// Name sanity filter rejects dump pollution
assert(!looksLikeRealLenderName('Week 1-2: Foundation'), 'reject week heading');
assert(!looksLikeRealLenderName('6 pc Shrimp Basket - $13.99'), 'reject shrimp');
assert(!looksLikeRealLenderName('Punch'), 'reject punch');
assert(!looksLikeRealLenderName('Framer Motion'), 'reject framer');
assert(looksLikeRealLenderName('Navy Federal Credit Union (NFCU)'), 'accept NFCU');
assert(looksLikeRealLenderName('Self Credit Builder Account'), 'accept Self');

console.log('lender-matching.test.mjs OK');
