/**
 * Live Stripe catalog for Smart FCRA SaaS plans.
 * Products/prices are created idempotently via metadata.smartfcra_plan.
 */
import Stripe from 'stripe';
import { CANONICAL_ORIGIN, resolvePublicOrigin } from './public-origin';

export type SaaSPlanId = 'professional' | 'unlimited' | 'enterprise';

export type StripeCatalogPlan = {
  id: SaaSPlanId;
  name: string;
  description: string;
  amountCents: number;
  interval: 'month';
  seats: string;
  productName: string;
};

export const STRIPE_CATALOG: StripeCatalogPlan[] = [
  {
    id: 'professional',
    name: 'Professional',
    description: 'Unlimited disputes, Metro 2, e-OSCAR, 5 users',
    amountCents: 49700,
    interval: 'month',
    seats: '5 users',
    productName: 'Smart FCRA Professional',
  },
  {
    id: 'unlimited',
    name: 'Unlimited',
    description: 'Everything in Professional, plus unlimited users and white-label',
    amountCents: 250000,
    interval: 'month',
    seats: 'Unlimited users',
    productName: 'Smart FCRA Unlimited',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Dedicated instance, custom SLA, API, on-prem option',
    amountCents: 999700,
    interval: 'month',
    seats: 'Custom',
    productName: 'Smart FCRA Enterprise',
  },
];

export type EnsuredPlan = StripeCatalogPlan & {
  productId: string;
  priceId: string;
  paymentLinkUrl: string | null;
  paymentLinkId: string | null;
  createdProduct: boolean;
  createdPrice: boolean;
  createdPaymentLink: boolean;
};

export type EnsuredCatalog = {
  mode: 'live' | 'test';
  plans: EnsuredPlan[];
};

export type PublicPlanView = {
  id: SaaSPlanId;
  name: string;
  description: string;
  amountCents: number;
  amountDisplay: string;
  interval: 'month';
  seats: string;
  subscribeUrl: string;
  live: boolean;
  priceId: string | null;
  productId: string | null;
  paymentLink: string | null;
};

const META_PLAN = 'smartfcra_plan';
const CATALOG_TTL_MS = 5 * 60 * 1000;

let catalogMemo: { keyTail: string; at: number; data: EnsuredCatalog } | null = null;

export function isSaaSPlanId(value: unknown): value is SaaSPlanId {
  return value === 'professional' || value === 'unlimited' || value === 'enterprise';
}

export function formatPlanAmount(amountCents: number): string {
  return `$${(amountCents / 100).toLocaleString('en-US')}`;
}

export function subscribePathForPlan(planId: SaaSPlanId): string {
  return `/login?mode=register&plan=${planId}`;
}

export function resolveFrontendUrl(env: { FRONTEND_URL?: string; APP_BASE_URL?: string }, requestUrl?: string): string {
  return resolvePublicOrigin(env, requestUrl);
}

export function staticPublicPlans(): PublicPlanView[] {
  return STRIPE_CATALOG.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    amountCents: p.amountCents,
    amountDisplay: formatPlanAmount(p.amountCents),
    interval: p.interval,
    seats: p.seats,
    subscribeUrl: subscribePathForPlan(p.id),
    live: false,
    priceId: null,
    productId: null,
    paymentLink: null,
  }));
}

export function publicPlansFromCatalog(catalog: EnsuredCatalog): PublicPlanView[] {
  return catalog.plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    amountCents: p.amountCents,
    amountDisplay: formatPlanAmount(p.amountCents),
    interval: p.interval,
    seats: p.seats,
    subscribeUrl: subscribePathForPlan(p.id),
    live: catalog.mode === 'live',
    priceId: p.priceId,
    productId: p.productId,
    paymentLink: p.paymentLinkUrl,
  }));
}

export function clearStripeCatalogCache(): void {
  catalogMemo = null;
}

export function stripeSecretMode(secretKey?: string | null): 'live' | 'test' | 'unconfigured' {
  const k = String(secretKey || '');
  if (k.startsWith('sk_live_')) return 'live';
  if (k.startsWith('sk_test_')) return 'test';
  return 'unconfigured';
}

export function stripePublishableMode(publishableKey?: string | null): 'live' | 'test' | 'unconfigured' {
  const k = String(publishableKey || '');
  if (k.startsWith('pk_live_')) return 'live';
  if (k.startsWith('pk_test_')) return 'test';
  return 'unconfigured';
}

export function isProductionRuntime(env?: { ENVIRONMENT?: string } | null): boolean {
  return String(env?.ENVIRONMENT || '').toLowerCase() === 'production';
}

/** Production must charge real cards. Test keys stay allowed in development/preview. */
export function productionStripeBlockReason(env?: {
  ENVIRONMENT?: string;
  STRIPE_API_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
} | null): string | null {
  if (!isProductionRuntime(env)) return null;
  const secret = stripeSecretMode(env?.STRIPE_API_KEY);
  if (secret !== 'live') {
    return 'Production billing requires a live Stripe secret (sk_live_...) in Cloudflare Pages. Test keys (sk_test_) cannot take real payments.';
  }
  const pub = stripePublishableMode(env?.STRIPE_PUBLISHABLE_KEY);
  if (pub === 'test') {
    return 'STRIPE_PUBLISHABLE_KEY is still pk_test_. Set the matching pk_live_ key in Cloudflare Pages.';
  }
  return null;
}

function stripeMode(secretKey: string): 'live' | 'test' {
  return secretKey.startsWith('sk_live_') ? 'live' : 'test';
}

async function findProductByPlan(stripe: Stripe, planId: SaaSPlanId): Promise<Stripe.Product | null> {
  try {
    const search = await stripe.products.search({
      query: `metadata['${META_PLAN}']:'${planId}' AND active:'true'`,
      limit: 1,
    });
    if (search.data[0]) return search.data[0];
  } catch {
    /* Product Search API is not enabled on every Stripe account */
  }
  let startingAfter: string | undefined;
  for (let page = 0; page < 8; page++) {
    const list = await stripe.products.list({
      active: true,
      limit: 100,
      starting_after: startingAfter,
    });
    const match = list.data.find((p) => p.metadata?.[META_PLAN] === planId);
    if (match) return match;
    if (!list.has_more || !list.data.length) break;
    startingAfter = list.data[list.data.length - 1].id;
  }
  return null;
}

async function findMatchingPrice(stripe: Stripe, productId: string, amountCents: number): Promise<Stripe.Price | null> {
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  return (
    prices.data.find(
      (p) =>
        p.unit_amount === amountCents &&
        p.currency === 'usd' &&
        p.recurring?.interval === 'month' &&
        p.type === 'recurring',
    ) || null
  );
}

export function envPriceIdForPlan(env: { STRIPE_PROFESSIONAL_PRICE_ID?: string; STRIPE_UNLIMITED_PRICE_ID?: string; STRIPE_ENTERPRISE_PRICE_ID?: string }, planId: SaaSPlanId): string | undefined {
  if (planId === 'professional') return env.STRIPE_PROFESSIONAL_PRICE_ID || undefined;
  if (planId === 'unlimited') return env.STRIPE_UNLIMITED_PRICE_ID || undefined;
  return env.STRIPE_ENTERPRISE_PRICE_ID || undefined;
}

export async function ensureStripeCatalogCached(
  stripe: Stripe,
  opts: { frontendUrl?: string; secretKey: string },
): Promise<EnsuredCatalog> {
  const keyTail = opts.secretKey.slice(-8);
  if (catalogMemo && catalogMemo.keyTail === keyTail && Date.now() - catalogMemo.at < CATALOG_TTL_MS) {
    return catalogMemo.data;
  }
  const data = await ensureStripeCatalog(stripe, opts);
  catalogMemo = { keyTail, at: Date.now(), data };
  return data;
}

export async function ensureStripeCatalog(
  stripe: Stripe,
  opts: { frontendUrl?: string; secretKey: string },
): Promise<EnsuredCatalog> {
  const successBase = (opts.frontendUrl || CANONICAL_ORIGIN).replace(/\/$/, '');
  const plans: EnsuredPlan[] = [];

  for (const spec of STRIPE_CATALOG) {
    let createdProduct = false;
    let createdPrice = false;
    let createdPaymentLink = false;

    let product = await findProductByPlan(stripe, spec.id);
    if (!product) {
      product = await stripe.products.create({
        name: spec.productName,
        description: spec.description,
        active: true,
        metadata: { [META_PLAN]: spec.id, smartfcra: '1' },
      });
      createdProduct = true;
    } else if (!product.active) {
      product = await stripe.products.update(product.id, { active: true });
    }

    let price = await findMatchingPrice(stripe, product.id, spec.amountCents);
    if (!price) {
      price = await stripe.prices.create({
        product: product.id,
        currency: 'usd',
        unit_amount: spec.amountCents,
        recurring: { interval: 'month' },
        nickname: `${spec.name} monthly`,
        metadata: { [META_PLAN]: spec.id },
      });
      createdPrice = true;
    }

    let paymentLinkUrl = product.metadata?.smartfcra_payment_link_url || null;
    let paymentLinkId = product.metadata?.smartfcra_payment_link_id || null;
    const afterUrl = `${successBase}/login?mode=register&billing=success&plan=${spec.id}`;

    if (paymentLinkId) {
      try {
        await stripe.paymentLinks.update(paymentLinkId, {
          after_completion: { type: 'redirect', redirect: { url: afterUrl } },
          active: true,
        });
      } catch {
        /* keep stored URL */
      }
    }

    if (!paymentLinkUrl || !paymentLinkId) {
      try {
        const link = await stripe.paymentLinks.create({
          line_items: [{ price: price.id, quantity: 1 }],
          after_completion: {
            type: 'redirect',
            redirect: { url: afterUrl },
          },
          metadata: { [META_PLAN]: spec.id },
          subscription_data: { metadata: { [META_PLAN]: spec.id, planId: spec.id } },
          allow_promotion_codes: true,
        });
        paymentLinkUrl = link.url;
        paymentLinkId = link.id;
        createdPaymentLink = true;
        await stripe.products.update(product.id, {
          metadata: {
            ...product.metadata,
            [META_PLAN]: spec.id,
            smartfcra_payment_link_url: link.url,
            smartfcra_payment_link_id: link.id,
          },
        });
      } catch {
        paymentLinkUrl = null;
        paymentLinkId = null;
      }
    }

    plans.push({
      ...spec,
      productId: product.id,
      priceId: price.id,
      paymentLinkUrl,
      paymentLinkId,
      createdProduct,
      createdPrice,
      createdPaymentLink,
    });
  }

  return { mode: stripeMode(opts.secretKey), plans };
}

export async function resolveCheckoutPriceId(
  stripe: Stripe,
  env: {
    STRIPE_API_KEY: string;
    STRIPE_PROFESSIONAL_PRICE_ID?: string;
    STRIPE_UNLIMITED_PRICE_ID?: string;
    STRIPE_ENTERPRISE_PRICE_ID?: string;
    FRONTEND_URL?: string;
  },
  planId: SaaSPlanId,
): Promise<{ priceId: string; productName: string; amountCents: number }> {
  const spec = STRIPE_CATALOG.find((p) => p.id === planId);
  if (!spec) throw new Error('Unknown plan');
  const envId = envPriceIdForPlan(env, planId);
  if (envId) {
    try {
      const price = await stripe.prices.retrieve(envId);
      if (price?.id && price.active !== false) {
        return { priceId: envId, productName: spec.productName, amountCents: spec.amountCents };
      }
    } catch {
      /* Stale test price IDs after switching to sk_live_ — rebuild from catalog */
    }
  }
  const catalog = await ensureStripeCatalogCached(stripe, {
    frontendUrl: env.FRONTEND_URL,
    secretKey: env.STRIPE_API_KEY,
  });
  const ensured = catalog.plans.find((p) => p.id === planId);
  if (!ensured) throw new Error('Catalog missing plan');
  return { priceId: ensured.priceId, productName: spec.productName, amountCents: spec.amountCents };
}

export async function planIdFromStripePrice(
  stripe: Stripe,
  env: {
    STRIPE_PROFESSIONAL_PRICE_ID?: string;
    STRIPE_UNLIMITED_PRICE_ID?: string;
    STRIPE_ENTERPRISE_PRICE_ID?: string;
  },
  priceId: string | undefined,
): Promise<SaaSPlanId | null> {
  if (!priceId) return null;
  if (env.STRIPE_PROFESSIONAL_PRICE_ID && priceId === env.STRIPE_PROFESSIONAL_PRICE_ID) return 'professional';
  if (env.STRIPE_UNLIMITED_PRICE_ID && priceId === env.STRIPE_UNLIMITED_PRICE_ID) return 'unlimited';
  if (env.STRIPE_ENTERPRISE_PRICE_ID && priceId === env.STRIPE_ENTERPRISE_PRICE_ID) return 'enterprise';
  try {
    const price = await stripe.prices.retrieve(priceId);
    const meta = price.metadata?.[META_PLAN];
    if (meta === 'professional' || meta === 'unlimited' || meta === 'enterprise') return meta;
  } catch {
    /* ignore */
  }
  return null;
}
