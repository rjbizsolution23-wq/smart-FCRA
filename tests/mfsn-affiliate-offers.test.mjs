/**
 * MFSN affiliate offer catalog + allow-list
 * Run: npx tsx tests/mfsn-affiliate-offers.test.mjs
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
  MFSN_AFFILIATE_ID,
  MFSN_AFFILIATE_OFFERS,
  getAffiliateOffer,
  isAllowedAffiliateOfferCode,
  listPublicAffiliateOffers,
  offerBelongsToAffiliate,
  normalizeAffiliateOfferCode,
} = await import(pathToFileURL(path.join(root, 'src/data/mfsn-affiliate-offers.ts')).href);

assert(MFSN_AFFILIATE_ID === 'A8289', 'affiliate id');
assert(MFSN_AFFILIATE_OFFERS.length === 8, '8 offers');
assert(isAllowedAffiliateOfferCode('B01A8289'), 'B01 allowed');
assert(isAllowedAffiliateOfferCode('b01a8289'), 'case insensitive');
assert(!isAllowedAffiliateOfferCode('B01A9999'), 'other affiliate rejected');
assert(!isAllowedAffiliateOfferCode(''), 'empty rejected');
assert(getAffiliateOffer('C02A8289')?.monthlyCommission === 62.8, 'C02 commission');
assert(getAffiliateOffer('B05A8289')?.price === 24.97, 'B05 price');
assert(offerBelongsToAffiliate('B07A8289'), 'belongs');
assert(!offerBelongsToAffiliate('B07XXXXX'), 'not belongs');
assert(normalizeAffiliateOfferCode(' B01A8289 ') === 'B01A8289', 'normalize');

const pub = listPublicAffiliateOffers();
assert(pub.every((o) => !('monthlyCommission' in o)), 'public omits commission');
assert(pub.some((o) => o.recommended && o.code === 'B01A8289'), 'recommended B01');
assert(
  MFSN_AFFILIATE_OFFERS.every((o) => o.enrollUrl.includes(`/enroll/${o.code}`)),
  'enroll urls match codes',
);

console.log('mfsn-affiliate-offers.test.mjs OK');
