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

const { toE164Phone, clientToGhlCustom, ghlConfigured } = await import(
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
  },
  { portalUrl: 'https://smart-fcra-v2.pages.dev/', violationCount: 12, analysisUnlocked: false },
);
assert(custom.smart_fcra_client_id === 'cli_1', 'client id');
assert(custom.smart_fcra_eq_score === 700, 'eq');
assert(custom.smart_fcra_violation_count === 12, 'violations');
assert(custom.smart_fcra_analysis_unlocked === 'no', 'locked');
console.log('ghl-client tests passed');
