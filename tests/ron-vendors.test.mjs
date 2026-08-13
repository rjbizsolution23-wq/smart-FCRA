/**
 * Proof / BlueNotary RON vendor adapters
 * Run: npx tsx tests/ron-vendors.test.mjs
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
  defaultRonApiUrl,
  PROOF_API_BASE,
  BLUENOTARY_API_BASE,
  createRonVendorSession,
  verifyRonWebhookSignature,
  extractRonWebhookIds,
  webhookMarksComplete,
  hmacSha256Hex,
  ceremonyUrlFromMeta,
} = await import(pathToFileURL(path.join(root, 'src/lib/ron-vendors.ts')).href);

assert(defaultRonApiUrl('proof') === PROOF_API_BASE, 'proof default URL');
assert(defaultRonApiUrl('bluenotary') === BLUENOTARY_API_BASE, 'bluenotary default URL');
assert(defaultRonApiUrl('custom') === '', 'custom needs override');
assert(defaultRonApiUrl('custom', 'https://vendor.example/v1/') === 'https://vendor.example/v1', 'strip slash');

const proofFetch = async (url, init) => {
  assert(String(url).endsWith('/transactions'), 'proof posts to /transactions');
  const headers = init.headers;
  assert(headers.ApiKey === 'prf_test_key', 'ApiKey header');
  const body = JSON.parse(init.body);
  assert(body.signers[0].email === 'salisha@example.com', 'signer email');
  assert(body.documents[0].requirement === 'notarization', 'notarization requirement');
  return {
    ok: true,
    json: async () => ({
      id: 'ot_live_1',
      transaction_access_link: 'https://app.proof.com/activate-transaction?transaction_id=ot_live_1',
      signers: [{ email: 'salisha@example.com' }],
    }),
  };
};

const proof = await createRonVendorSession({
  vendor: 'proof',
  apiKey: 'prf_test_key',
  sessionId: 'sess1',
  principalState: 'TX',
  callbackUrl: 'https://smart-fcra-v2.pages.dev/api/webhooks/ron',
  signer: { email: 'salisha@example.com', firstName: 'Salisha', lastName: 'McDowell' },
}, proofFetch);
assert(proof.vendorSessionId === 'ot_live_1', 'proof session id');
assert(proof.ceremonyUrl.includes('activate-transaction'), 'proof ceremony url');

const bnFetch = async (url, init) => {
  assert(String(url).includes('/sessions'), 'bluenotary posts sessions');
  assert(String(init.headers.Authorization).startsWith('Bearer '), 'bearer');
  const body = JSON.parse(init.body);
  assert(body.signing_type === 'ron', 'ron signing type');
  assert(body.notarization_id === 'sess2', 'external notarization id');
  return {
    ok: true,
    json: async () => ({
      response: 'Pass',
      bn_session_id: 'bn_abc',
      full_signing_url: 'https://app.bluenotary.us/sign-in?sessionid=bn_abc',
    }),
  };
};

const bn = await createRonVendorSession({
  vendor: 'bluenotary',
  apiKey: 'bn_key',
  sessionId: 'sess2',
  principalState: 'NM',
  callbackUrl: 'https://smart-fcra-v2.pages.dev/api/webhooks/ron',
  signer: { email: 'salisha@example.com', firstName: 'Salisha', lastName: 'McDowell' },
}, bnFetch);
assert(bn.vendorSessionId === 'bn_abc', 'bluenotary session id');
assert(bn.ceremonyUrl.includes('bluenotary.us'), 'bluenotary ceremony url');

const hex = await hmacSha256Hex('whsec', '{"ok":true}');
assert(hex.length === 64, 'hmac hex');
assert(await verifyRonWebhookSignature({ secret: 'whsec', signature: hex, rawBody: '{"ok":true}' }), 'hmac verifies');
assert(await verifyRonWebhookSignature({ secret: 'whsec', signature: 'sha256=' + hex, rawBody: '{"ok":true}' }), 'sha256= prefix');
assert(await verifyRonWebhookSignature({ secret: 'shared', signature: 'shared', rawBody: '{}' }), 'shared secret');
assert(!(await verifyRonWebhookSignature({ secret: 'whsec', signature: 'nope', rawBody: '{"ok":true}' })), 'rejects bad sig');
assert(await verifyRonWebhookSignature({ rawBody: '{}' }), 'no secret skips verify');

const ids = extractRonWebhookIds({ event: 'transaction.completed', data: { id: 'ot_live_1' } });
assert(ids.sessionHint === 'ot_live_1', 'proof webhook id');
assert(webhookMarksComplete(ids.event, { event: 'transaction.completed' }), 'complete event');

const bnIds = extractRonWebhookIds({ notarization_id: 'sess2', response: 'completed' });
assert(bnIds.sessionHint === 'sess2', 'bluenotary notarization_id');

assert(ceremonyUrlFromMeta(JSON.stringify({ ceremonyUrl: 'https://app.proof.com/x' })) === 'https://app.proof.com/x', 'meta ceremony');

console.log('ron-vendors.test.mjs: OK');
