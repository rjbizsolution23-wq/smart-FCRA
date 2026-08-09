/**
 * GHL helper unit tests
 * Run: npx tsx tests/ghl-client.test.mjs
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
  toE164Phone,
  clientToGhlCustom,
  ghlConfigured,
  buildGhlTagsForClient,
  normalizeGhlTags,
  mfsnMemberToGhlPayload,
  listGhlFieldCatalog,
} = await import(
  pathToFileURL(path.join(root, 'src/lib/ghl-client.ts')).href
);

assert(toE164Phone('(505) 555-0100') === '+15055550100', 'us phone');
assert(toE164Phone('+18667524618') === '+18667524618', 'e164');
assert(toE164Phone('') === null, 'empty');
assert(ghlConfigured({ GHL_PIT_TOKEN: 'pit-x', GHL_LOCATION_ID: 'loc' }) === true, 'configured');
assert(ghlConfigured({}) === false, 'not configured');

const custom = clientToGhlCustom(
  {
    id: 'cli_1',
    case_status: 'ONBOARDING',
    payment_status: 'pending',
    eq_score: 700,
    ex_score: 690,
    tu_score: 680,
    portal_analysis_unlocked: 0,
    signup_source: 'mfsn_public_signup',
    mfsn_affiliate_offer_code: 'B01A8289',
    mfsn_member_email: 'member@example.com',
  },
  {
    portalUrl: 'https://smart-fcra-v2.pages.dev/',
    violationCount: 12,
    analysisUnlocked: false,
    mfsnMember: {
      member_id: 99,
      account_status: 'ACTIVE',
      planName: '3B Soft Pull',
      publisher_id: 'B01A8289',
      customer_token: 'MAPIK#TEST',
    },
  },
);
assert(custom.smart_fcra_client_id === 'cli_1', 'client id');
assert(custom.smart_fcra_eq_score === 700, 'eq');
assert(custom.equifax_score === 700, 'legacy eq alias');
assert(custom.smart_fcra_violation_count === 12, 'violations');
assert(custom.fcra_violation_count === 12, 'legacy violation alias');
assert(custom.smart_fcra_analysis_unlocked === 'no', 'locked');
assert(custom.smart_fcra_affiliate_offer === 'B01A8289', 'offer');
assert(custom.mfsn_affiliate_offer_code === 'B01A8289', 'offer alias');
assert(custom.smart_fcra_mfsn_member_id === 99, 'member id');
assert(custom.smart_fcra_mfsn_customer_token === 'MAPIK#TEST', 'token');

const tags = buildGhlTagsForClient(
  {
    signup_source: 'mfsn_public_signup',
    mfsn_member_email: 'member@example.com',
    mfsn_affiliate_offer_code: 'B01A8289',
    payment_status: 'pending',
    case_status: 'ONBOARDING',
  },
  { analysisUnlocked: false, mfsnStatus: 'ACTIVE' },
);
assert(tags.includes('Smart FCRA'), 'tag brand');
assert(tags.includes('MFSN Signup'), 'tag signup');
assert(tags.includes('MFSN Active'), 'tag active');
assert(tags.includes('Offer B01A8289'), 'tag offer');
assert(tags.includes('Affiliate A8289'), 'tag affiliate');
assert(tags.includes('Portal Pending Unlock'), 'tag locked');
assert(normalizeGhlTags(['A', 'a', ' B ']).join(',') === 'A,B', 'normalize tags');

const catalog = listGhlFieldCatalog();
assert(catalog.length >= 20, 'field catalog size');
assert(catalog.some((f) => f.key === 'smart_fcra_mfsn_member_id'), 'member id field');

const payload = mfsnMemberToGhlPayload({
  email: 'lakeesha@example.com',
  first_name: 'Lakeesha',
  last_name: 'Collins',
  phone_number: '5055550199',
  account_status: 'ACTIVE',
  publisher_id: 'B01A8289',
  member_id: 123,
  planName: 'Plan',
  amount: '1.00',
});
assert(payload.email === 'lakeesha@example.com', 'mfsn email');
assert(payload.tags.includes('MFSN Bulk Sync'), 'bulk tag');
assert(payload.custom.smart_fcra_affiliate_offer === 'B01A8289', 'payload offer');

console.log('ghl-client tests passed');
