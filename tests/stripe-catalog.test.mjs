/**
 * SaaS Stripe catalog amounts + public plan payload
 * Run: npx tsx tests/stripe-catalog.test.mjs
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
  STRIPE_CATALOG,
  envPriceIdForPlan,
  isSaaSPlanId,
  staticPublicPlans,
  publicPlansFromCatalog,
  subscribePathForPlan,
  resolveFrontendUrl,
  formatPlanAmount,
  stripeSecretMode,
  stripePublishableMode,
  stripeSecretKind,
  isProductionRuntime,
  productionStripeBlockReason,
} = await import(pathToFileURL(path.join(root, 'src/lib/stripe-catalog.ts')).href);

assert(STRIPE_CATALOG.length === 3, 'three plans');
assert(STRIPE_CATALOG[0].id === 'professional' && STRIPE_CATALOG[0].amountCents === 49700, 'professional $497');
assert(STRIPE_CATALOG[1].id === 'unlimited' && STRIPE_CATALOG[1].amountCents === 250000, 'unlimited $2500');
assert(STRIPE_CATALOG[2].id === 'enterprise' && STRIPE_CATALOG[2].amountCents === 999700, 'enterprise $9997');
assert(STRIPE_CATALOG.every((p) => p.interval === 'month'), 'monthly');
assert(STRIPE_CATALOG.every((p) => p.productName.startsWith('Smart FCRA')), 'product names');
assert(!STRIPE_CATALOG.some((p) => p.productName.includes('Basic')), 'no Basic Plan leftover');

assert(isSaaSPlanId('professional') && isSaaSPlanId('unlimited') && isSaaSPlanId('enterprise'), 'valid ids');
assert(!isSaaSPlanId('free') && !isSaaSPlanId('basic') && !isSaaSPlanId(''), 'invalid ids rejected');

assert(envPriceIdForPlan({ STRIPE_PROFESSIONAL_PRICE_ID: 'price_pro' }, 'professional') === 'price_pro', 'env pro');
assert(envPriceIdForPlan({ STRIPE_UNLIMITED_PRICE_ID: 'price_unl' }, 'unlimited') === 'price_unl', 'env unl');
assert(envPriceIdForPlan({ STRIPE_ENTERPRISE_PRICE_ID: 'price_ent' }, 'enterprise') === 'price_ent', 'env ent');
assert(envPriceIdForPlan({}, 'professional') === undefined, 'missing env');

assert(subscribePathForPlan('professional') === '/login?mode=register&plan=professional', 'subscribe path');
assert(formatPlanAmount(49700) === '$497', 'format 497');
assert(formatPlanAmount(250000).replace(/,/g, '') === '$2500', 'format 2500');

const staticPlans = staticPublicPlans();
assert(staticPlans.every((p) => p.live === false && p.priceId === null && p.paymentLink === null), 'static not live');
assert(staticPlans.every((p) => p.subscribeUrl.includes(`plan=${p.id}`)), 'static subscribe urls');

const publicLive = publicPlansFromCatalog({
  mode: 'live',
  plans: STRIPE_CATALOG.map((p) => ({
    ...p,
    productId: `prod_${p.id}`,
    priceId: `price_${p.id}`,
    paymentLinkUrl: `https://buy.stripe.com/${p.id}`,
    paymentLinkId: `plink_${p.id}`,
    createdProduct: false,
    createdPrice: false,
    createdPaymentLink: false,
  })),
});
assert(publicLive.every((p) => p.live && p.priceId && p.productId && p.paymentLink), 'live payload has ids');
assert(publicLive.every((p) => p.subscribeUrl.startsWith('/login?mode=register')), 'checkout still via register');

const publicTest = publicPlansFromCatalog({ mode: 'test', plans: publicLive.map((p, i) => ({
  ...STRIPE_CATALOG[i],
  productId: p.productId,
  priceId: p.priceId,
  paymentLinkUrl: p.paymentLink,
  paymentLinkId: `plink_${p.id}`,
  createdProduct: false,
  createdPrice: false,
  createdPaymentLink: false,
})) });
assert(publicTest.every((p) => p.live === false), 'test catalog is not advertised as live');

assert(stripeSecretKind('  rk_live_abc') === 'rk_live', 'kind rk_live');
assert(stripeSecretKind('sk_live_abc') === 'sk_live', 'kind sk_live');
assert(stripeSecretMode('  sk_live_abc\n') === 'live', 'trimmed live secret');
assert(stripeSecretMode('"sk_live_abc"') === 'live', 'quoted live secret');
assert(stripeSecretMode('rk_live_abc') === 'live', 'restricted live secret');
assert(stripeSecretMode('sk_test_abc') === 'test', 'test secret');
assert(stripeSecretMode('rk_test_abc') === 'test', 'restricted test secret');
assert(stripePublishableMode(' pk_live_x ') === 'live', 'live pk');
assert(stripePublishableMode('pk_test_x') === 'test', 'test pk');
assert(isProductionRuntime({ ENVIRONMENT: 'production' }), 'prod runtime');
assert(!isProductionRuntime({ ENVIRONMENT: 'development' }), 'dev runtime');
assert(productionStripeBlockReason({ ENVIRONMENT: 'production', STRIPE_API_KEY: 'sk_test_x' }), 'prod blocks test secret');
assert(!productionStripeBlockReason({ ENVIRONMENT: 'production', STRIPE_API_KEY: 'sk_live_x', STRIPE_PUBLISHABLE_KEY: 'pk_live_x' }), 'prod allows live pair');
assert(!productionStripeBlockReason({ ENVIRONMENT: 'production', STRIPE_API_KEY: ' rk_live_x ', STRIPE_PUBLISHABLE_KEY: 'pk_live_x' }), 'prod allows restricted live');
assert(productionStripeBlockReason({ ENVIRONMENT: 'production', STRIPE_API_KEY: 'sk_live_x', STRIPE_PUBLISHABLE_KEY: 'pk_test_x' }), 'prod blocks mismatched pk_test');
assert(!productionStripeBlockReason({ ENVIRONMENT: 'development', STRIPE_API_KEY: 'sk_test_x' }), 'dev allows test');

assert(resolveFrontendUrl({ FRONTEND_URL: 'https://smartfcra.com/' }) === 'https://smartfcra.com', 'strip slash');
assert(resolveFrontendUrl({ FRONTEND_URL: 'https://smart-fcra-v2.pages.dev/' }) === 'https://smartfcra.com', 'pages.dev env');
assert(resolveFrontendUrl({}, 'https://example.com/api/public/plans') === 'https://example.com', 'from request');
assert(resolveFrontendUrl({}, 'http://localhost:3000/api') === 'https://smartfcra.com', 'localhost fallback');
assert(resolveFrontendUrl({}, 'https://www.smartfcra.com/api') === 'https://smartfcra.com', 'www request');

console.log('stripe-catalog.test.mjs OK');
