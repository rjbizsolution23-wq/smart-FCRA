/**
 * FULL end-to-end Stripe TEST-MODE simulation of the pay-first tenant signup pipeline.
 *
 * This drives the REAL application code (the actual Hono app in src/index.tsx, the
 * real src/lib/tenant-signup-routes.ts, the real provisionTenant() engine) against a
 * REAL local D1 database (via wrangler's getPlatformProxy, same sqlite file wrangler
 * dev/deploy uses) with a REAL Stripe TEST-MODE secret key (sk_test_...), so Checkout
 * Session creation is a genuine round-trip to Stripe's test-mode API — no live card is
 * ever touched, no production data is touched (separate local D1), and the org/user
 * rows this creates only exist in the local sqlite database, never in production.
 *
 * Flow simulated:
 *   1. POST /api/public/tenant-signup/start with full branding payload
 *      -> writes pending_tenant_signups row (status=pending)
 *      -> creates a REAL Stripe test-mode Checkout Session
 *   2. Simulate the buyer completing checkout by fetching the just-created Stripe
 *      test session back from Stripe (would be 'open' since no real card was entered —
 *      Stripe test mode requires either a live browser filling in 4242 4242 4242 4242
 *      or the Stripe CLI's `stripe trigger`). Since neither is available headlessly in
 *      this sandbox, we construct a *bona fide* checkout.session.completed event object
 *      shaped exactly like Stripe would send it (same fields the webhook handler reads:
 *      id, metadata, customer, subscription), and deliver it to the REAL webhook route
 *      with a REAL HMAC signature computed via Stripe's own `stripe.webhooks.generateTestHeaderString`
 *      helper (the same helper Stripe's own SDK docs recommend for local webhook testing),
 *      signed with the STRIPE_WEBHOOK_SECRET configured for this run — so the webhook's
 *      signature verification (stripe.webhooks.constructEventAsync) is fully exercised,
 *      not bypassed.
 *   3. Assert: pending row -> status='provisioned', org created, user created, org
 *      branding matches submitted colors/logo, temp password generated, portal URL
 *      correct, Stripe customer/subscription id linked onto the org row.
 *   4. Re-deliver the SAME webhook event a second time -> assert idempotency (no
 *      duplicate org/user created, still exactly 1 org for this subdomain).
 *   5. Assert GET /status and GET /complete respond correctly post-provisioning.
 *
 * Requires: STRIPE_TEST_SECRET_KEY env var (sk_test_...) to actually create a Stripe
 * test-mode Checkout Session. If not provided, the script still runs everything except
 * step 1's live Stripe API call (it fabricates a session id instead) and clearly labels
 * that fallback in its output.
 *
 * Run: npx tsx tests/tenant-signup-e2e-stripe-test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import wrangler from 'wrangler';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error('FAIL: ' + msg);
  console.log('  \u2713 ' + msg);
}

const STRIPE_TEST_SECRET_KEY = process.env.STRIPE_TEST_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = 'whsec_test_' + 'e2e_simulated_secret_1234567890';
const hasLiveStripeTestKey = /^sk_test_/.test(STRIPE_TEST_SECRET_KEY);

console.log(`\n=== Tenant Signup — Full Stripe TEST-MODE E2E ===`);
console.log(hasLiveStripeTestKey
  ? '[mode] Using REAL Stripe test-mode secret key — Checkout Session will be created against Stripe\'s actual test API.'
  : '[mode] No STRIPE_TEST_SECRET_KEY provided — Checkout Session creation step will be skipped/faked; everything downstream (DB writes, webhook, provisioning, idempotency, emails) still runs for real.');

// ---------------------------------------------------------------------------
// 1. Boot a REAL local D1 + KV via wrangler's platform proxy (same engine
//    wrangler pages dev / deploy uses). remoteBindings:false keeps this fully
//    offline — no Cloudflare auth required for this step.
// ---------------------------------------------------------------------------
const proxy = await wrangler.getPlatformProxy({
  configPath: path.join(root, 'wrangler.jsonc'),
  remoteBindings: false,
});

const suffix = Date.now().toString(36);
const testSubdomain = `e2etest-${suffix}`;
const testEmail = `e2e-owner-${suffix}@example.com`;

const env = {
  ...proxy.env,
  ENVIRONMENT: 'test',
  FRONTEND_URL: 'https://smartfcra.com',
  APP_BASE_URL: 'https://smartfcra.com',
  STRIPE_API_KEY: hasLiveStripeTestKey ? STRIPE_TEST_SECRET_KEY : 'sk_test_placeholder_not_used_for_live_calls',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_placeholder',
  STRIPE_WEBHOOK_SECRET,
  STRIPE_PROFESSIONAL_PRICE_ID: process.env.STRIPE_TEST_PROFESSIONAL_PRICE_ID || '',
  PII_ENCRYPTION_KEY: 'local-dev-only-pii-key-min-32-chars!!',
  PLATFORM_OWNER_EMAILS: 'owner-alerts-e2e@example.com',
};

const appModule = await import(pathToFileURL(path.join(root, 'src/index.tsx')).href);
const app = appModule.default;

try {
  // -------------------------------------------------------------------------
  // 2. POST /api/public/tenant-signup/start — the real branding form submission.
  // -------------------------------------------------------------------------
  console.log('\n[1] Submitting branding form -> /api/public/tenant-signup/start');
  const tinyPngBase64 =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  const startBody = {
    businessName: 'E2E Test Credit Repair LLC',
    legalName: 'E2E Test Credit Repair LLC',
    ownerName: 'Jordan E2E Tester',
    ownerEmail: testEmail,
    phone: '5551234567',
    supportEmail: `support-${suffix}@example.com`,
    address: '123 Test Ave',
    city: 'Testville',
    state: 'TX',
    zip: '75001',
    subdomain: testSubdomain,
    primaryColor: '#7c3aed',
    secondaryColor: '#facc15',
    logoBase64: tinyPngBase64,
    timezone: 'America/Chicago',
    plan: 'professional',
    cfTurnstileToken: 'no-op-since-TURNSTILE_SECRET_KEY-unset',
  };

  const startRes = await app.request('/api/public/tenant-signup/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.5' },
    body: JSON.stringify(startBody),
  }, env);

  const startJson = await startRes.json();
  console.log('  response:', JSON.stringify(startJson).slice(0, 300));

  let pendingId;
  let sessionId;
  let sessionUrl;

  if (hasLiveStripeTestKey) {
    assert(startRes.status === 200, `start returns 200 (got ${startRes.status}: ${JSON.stringify(startJson)})`);
    assert(startJson.ok === true, 'start response ok=true');
    assert(typeof startJson.url === 'string' && startJson.url.includes('checkout.stripe.com'), 'start returns a real Stripe Checkout URL');
    pendingId = startJson.pendingId;
    // Pull the session back from Stripe test mode to get its real id.
    const stripeReadClient = new Stripe(STRIPE_TEST_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });
    const row = await env.DB.prepare('SELECT stripe_session_id FROM pending_tenant_signups WHERE id = ?').bind(pendingId).first();
    sessionId = row.stripe_session_id;
    const liveSession = await stripeReadClient.checkout.sessions.retrieve(sessionId);
    assert(liveSession.id === sessionId, 'Stripe test-mode session id round-trips correctly');
    assert(liveSession.mode === 'subscription', 'Stripe test-mode session mode=subscription');
    assert(liveSession.metadata?.type === 'tenant_signup', 'Stripe session metadata.type=tenant_signup');
    assert(liveSession.metadata?.pendingSignupId === pendingId, 'Stripe session metadata.pendingSignupId matches');
    console.log(`  [stripe] Live test-mode session created: ${sessionId} (status=${liveSession.status})`);
  } else {
    // Fallback: exercise everything except the live Stripe network call. We
    // still verify the route's own logic up to the point of calling Stripe by
    // checking the pending row got written. Without a real Stripe key the
    // outbound checkout.sessions.create() call itself fails (401 from Stripe),
    // and the route CORRECTLY marks the pending row status='failed' (fail-fast
    // design, verified below) rather than leaving it dangling as 'pending'.
    // To still exercise the webhook-fulfillment logic in isolation, we reset
    // the row back to 'pending' here (simulating "checkout succeeded") and
    // attach a fabricated session id of the same shape Stripe would issue.
    assert(startRes.status === 500, `start returns 500 when the Stripe API call itself fails (got ${startRes.status})`);
    assert(startJson.error?.includes('Stripe error'), 'error message correctly surfaces the Stripe failure reason');
    const row = await env.DB.prepare(
      'SELECT id, status, business_name, owner_email, subdomain, error_message FROM pending_tenant_signups WHERE subdomain = ?'
    ).bind(testSubdomain).first();
    assert(!!row, 'pending_tenant_signups row was written even though the Stripe call failed');
    assert(row.owner_email === testEmail, 'pending row owner_email matches submission');
    assert(row.status === 'failed', `route correctly fail-fasts the pending row to status=failed when Stripe errors (got ${row.status}) — no orphaned "pending" rows on checkout-creation failure`);
    assert(!!row.error_message, 'error_message captured on the failed row');
    pendingId = row.id;
    sessionId = `cs_test_fallback_${suffix}`;
    console.log('  [stripe] No live key — Stripe call correctly failed and marked the row failed=true. Resetting to pending to independently exercise webhook fulfillment logic below.');
    await env.DB.prepare(`UPDATE pending_tenant_signups SET status = 'pending', stripe_session_id = ?, error_message = NULL WHERE id = ?`)
      .bind(sessionId, pendingId).run();
  }

  // -------------------------------------------------------------------------
  // 3. Verify the pending row was captured correctly regardless of path taken.
  // -------------------------------------------------------------------------
  console.log('\n[2] Verifying pending_tenant_signups row');
  const pendingRow = await env.DB.prepare('SELECT * FROM pending_tenant_signups WHERE id = ?').bind(pendingId).first();
  assert(!!pendingRow, 'pending row exists');
  assert(pendingRow.business_name === 'E2E Test Credit Repair LLC', 'business_name persisted');
  assert(pendingRow.subdomain === testSubdomain, 'subdomain persisted');
  assert(pendingRow.primary_color === '#7c3aed', 'primary_color persisted');
  assert(pendingRow.secondary_color === '#facc15', 'secondary_color persisted');
  assert(!!pendingRow.logo_base64, 'logo_base64 persisted');
  assert(pendingRow.status === 'pending', 'status is pending, ready for webhook to fire (reset from failed in fallback mode above, or genuinely still pending in live-key mode)');

  // -------------------------------------------------------------------------
  // 4. Build a REAL, correctly-signed checkout.session.completed webhook event
  //    using Stripe's own SDK helper, and deliver it to the REAL webhook route.
  // -------------------------------------------------------------------------
  console.log('\n[3] Simulating signed checkout.session.completed webhook delivery');
  const fakeCustomerId = `cus_test_${suffix}`;
  const fakeSubscriptionId = `sub_test_${suffix}`;
  const stripeEvent = {
    id: `evt_test_${suffix}`,
    object: 'event',
    type: 'checkout.session.completed',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: {
      object: {
        id: sessionId,
        object: 'checkout.session',
        mode: 'subscription',
        customer: fakeCustomerId,
        subscription: fakeSubscriptionId,
        metadata: { type: 'tenant_signup', pendingSignupId: pendingId, plan: 'professional' },
      },
    },
  };
  const payload = JSON.stringify(stripeEvent);
  const signatureHeader = Stripe.webhooks.generateTestHeaderString({
    payload,
    secret: STRIPE_WEBHOOK_SECRET,
  });
  console.log('  [webhook] HMAC-signed via stripe.webhooks.generateTestHeaderString, secret=whsec_test_***');

  const webhookRes = await app.request('/api/billing/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signatureHeader },
    body: payload,
  }, env);
  const webhookText = await webhookRes.text();
  console.log(`  webhook response: ${webhookRes.status} ${webhookText.slice(0, 200)}`);
  assert(webhookRes.status === 200, `webhook accepted the signed event (got ${webhookRes.status}: ${webhookText}) — signature verification passed`);

  // -------------------------------------------------------------------------
  // 5. Assert full auto-provisioning happened.
  // -------------------------------------------------------------------------
  console.log('\n[4] Verifying tenant was fully auto-provisioned');
  const provisionedPending = await env.DB.prepare('SELECT * FROM pending_tenant_signups WHERE id = ?').bind(pendingId).first();
  assert(provisionedPending.status === 'provisioned', `pending row status=provisioned (got ${provisionedPending.status}, error=${provisionedPending.error_message || 'none'})`);
  assert(!!provisionedPending.org_id, 'pending row has org_id');
  assert(!!provisionedPending.user_id, 'pending row has user_id');
  assert(!!provisionedPending.provisioned_at, 'pending row has provisioned_at timestamp');

  const org = await env.DB.prepare('SELECT * FROM organizations WHERE id = ?').bind(provisionedPending.org_id).first();
  assert(!!org, 'organizations row exists');
  assert(org.subdomain === testSubdomain, 'org subdomain matches submitted subdomain');
  assert(org.name === 'E2E Test Credit Repair LLC' || org.business_name === 'E2E Test Credit Repair LLC', 'org business name matches submission');
  assert(org.stripe_customer_id === fakeCustomerId, 'org.stripe_customer_id linked from webhook session.customer');
  assert(org.stripe_subscription_id === fakeSubscriptionId, 'org.stripe_subscription_id linked from webhook session.subscription');
  assert(org.provisioned_by === 'system:stripe_tenant_signup' || !org.provisioned_by, 'org.provisioned_by uses the synthetic system actor (or column not tracked)');

  const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(provisionedPending.user_id).first();
  assert(!!user, 'users row exists for the new owner');
  assert(user.email?.toLowerCase() === testEmail, 'owner user email matches submission');
  assert(user.org_id === org.id, 'owner user is linked to the correct org');

  const activityRow = await env.DB.prepare(
    `SELECT * FROM activity_log WHERE org_id = ? AND action = 'tenant_self_signup_provisioned' LIMIT 1`
  ).bind(org.id).first();
  assert(!!activityRow, 'activity_log row recorded for the auto-provisioning event');

  console.log(`  [provisioned] org_id=${org.id} user_id=${user.id} subdomain=${org.subdomain}`);

  // -------------------------------------------------------------------------
  // 6. Re-deliver the SAME webhook event -> idempotency check.
  // -------------------------------------------------------------------------
  console.log('\n[5] Re-delivering the SAME webhook event (simulating a Stripe retry) — idempotency check');
  const webhookRes2 = await app.request('/api/billing/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': signatureHeader },
    body: payload,
  }, env);
  console.log(`  second delivery response: ${webhookRes2.status}`);
  assert(webhookRes2.status === 200, 'second (duplicate) webhook delivery still returns 200');

  const orgCountAfterRetry = await env.DB.prepare(
    'SELECT COUNT(*) as n FROM organizations WHERE subdomain = ?'
  ).bind(testSubdomain).first();
  assert(Number(orgCountAfterRetry.n) === 1, `exactly 1 organization exists for ${testSubdomain} after retry (got ${orgCountAfterRetry.n}) — no duplicate tenant created`);

  const userCountAfterRetry = await env.DB.prepare(
    'SELECT COUNT(*) as n FROM users WHERE lower(email) = ?'
  ).bind(testEmail).first();
  assert(Number(userCountAfterRetry.n) === 1, `exactly 1 user exists for ${testEmail} after retry (got ${userCountAfterRetry.n}) — no duplicate owner account`);

  // -------------------------------------------------------------------------
  // 7. Verify the public status + complete-page endpoints reflect success.
  // -------------------------------------------------------------------------
  console.log('\n[6] Verifying buyer-facing status/redirect endpoints');
  const statusRes = await app.request(`/api/public/tenant-signup/status?pending=${pendingId}`, {}, env);
  const statusJson = await statusRes.json();
  assert(statusJson.status === 'provisioned', 'GET /status reports provisioned');
  assert(statusJson.ownerEmail === testEmail, 'GET /status reports correct owner email');
  assert(typeof statusJson.portalUrl === 'string' && statusJson.portalUrl.includes(testSubdomain), 'GET /status reports correct portal URL');
  console.log('  portalUrl:', statusJson.portalUrl);

  const completeRes = await app.request(`/api/public/tenant-signup/complete?pending=${pendingId}`, {}, env);
  assert(completeRes.status === 200, 'GET /complete returns 200 (polling redirect page)');
  const completeHtml = await completeRes.text();
  assert(completeHtml.includes('tenant-signup/status'), 'complete page polls the status endpoint');

  // -------------------------------------------------------------------------
  // 8. Negative-path check: subdomain now correctly reports as taken.
  // -------------------------------------------------------------------------
  console.log('\n[7] Verifying anti-collision checks now correctly block reuse');
  const subCheckRes = await app.request(`/api/public/tenant-signup/subdomain-check?subdomain=${testSubdomain}`, {}, env);
  const subCheckJson = await subCheckRes.json();
  assert(subCheckJson.available === false, 'subdomain-check now reports the just-used subdomain as taken');

  // Same subdomain AND same email as the already-provisioned tenant -> the
  // subdomain check runs first in the route, so this is rejected as a taken
  // subdomain (still a pre-charge 409 block, just a different reason string).
  const dupSubdomainRes = await app.request('/api/public/tenant-signup/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.6' },
    body: JSON.stringify({ ...startBody, businessName: 'Different Co' }),
  }, env);
  assert(dupSubdomainRes.status === 409, 'reusing the same subdomain is rejected (409) BEFORE any Stripe charge would occur');
  const dupSubdomainJson = await dupSubdomainRes.json();
  assert(/subdomain/i.test(dupSubdomainJson.error || ''), 'rejection reason correctly names the subdomain conflict');

  // Different subdomain but the SAME email as the already-provisioned owner ->
  // now the email-uniqueness check (which runs after the subdomain check) is
  // what should trip, proving that guard independently works too.
  const dupEmailRes = await app.request('/api/public/tenant-signup/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7' },
    body: JSON.stringify({ ...startBody, businessName: 'Another Co', subdomain: `e2etest-${suffix}-b` }),
  }, env);
  assert(dupEmailRes.status === 409, 'reusing the same owner email (different subdomain) is rejected (409) BEFORE any Stripe charge would occur');
  const dupEmailJson = await dupEmailRes.json();
  assert(dupEmailJson.code === 'EMAIL_EXISTS', 'rejection reason is EMAIL_EXISTS when only the email collides');

  console.log('\n=== ALL CHECKS PASSED ===');
  console.log(hasLiveStripeTestKey
    ? 'Full round trip including a REAL Stripe test-mode Checkout Session was verified.'
    : 'Full pipeline verified end-to-end EXCEPT the live Stripe network call (no STRIPE_TEST_SECRET_KEY was provided).');
} finally {
  await proxy.dispose();
}
