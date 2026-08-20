/**
 * Mail postage billing routes — org/client wallets + Stripe Checkout.
 */
import type { Hono } from 'hono';
import Stripe from 'stripe';
import { generateId } from './auth';
import {
  ORG_MAIL_CREDIT_PACKS,
  CLIENT_MAIL_CREDIT_PACKS,
  MAIL_POSTAGE_RATES_CENTS,
  getOrgMailCredits,
  getClientMailCredits,
  addOrgMailCredits,
  addClientMailCredits,
  postageCostCents,
  normalizePostageMailClass,
  parseOrgMailSettings,
  mailPostagePublicCatalog,
  setOrgMailPostageComped,
  markOrgMailCardUnlocked,
} from './mail-postage';
import { productionStripeBlockReason } from './stripe-catalog';

type RegisterOpts = { authMiddleware: any };

function adminOnly(user: any): string | null {
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) return 'Admin only';
  return null;
}

function staffOnly(user: any): string | null {
  if (!user || user.role === 'client') return 'Staff access required';
  return null;
}

function appBase(env: any): string {
  return String(env.FRONTEND_URL || env.APP_BASE_URL || 'https://smartfcra.com').replace(/\/$/, '');
}

function stripeClient(env: any): Stripe | null {
  if (!env.STRIPE_API_KEY) return null;
  return new Stripe(env.STRIPE_API_KEY, { httpClient: Stripe.createFetchHttpClient() });
}

/** Ensure org has a Stripe customer (card lives in Stripe — never in repo/secrets files). */
export async function ensureOrgStripeCustomer(opts: {
  stripe: Stripe;
  db: D1Database;
  orgId: string;
  email?: string | null;
  name?: string | null;
}): Promise<string> {
  const org = await opts.db.prepare(
    'SELECT name, stripe_customer_id FROM organizations WHERE id = ?',
  ).bind(opts.orgId).first() as any;
  if (org?.stripe_customer_id) return String(org.stripe_customer_id);
  const customer = await opts.stripe.customers.create({
    email: opts.email || undefined,
    name: opts.name || org?.name || undefined,
    metadata: { orgId: opts.orgId, source: 'smart_fcra_mail_postage' },
  });
  await opts.db.prepare(
    'UPDATE organizations SET stripe_customer_id = ?, updated_at = datetime("now") WHERE id = ?',
  ).bind(customer.id, opts.orgId).run();
  return customer.id;
}

export async function chargeOrgSavedCardPostage(opts: {
  stripe: Stripe;
  customerId: string;
  amountCents: number;
  mailClass: string;
  orgId: string;
  paymentMethodId?: string | null;
  documentId?: string | null;
  disputeId?: string | null;
}): Promise<{ ok: true; paymentIntentId: string } | { ok: false; error: string }> {
  try {
    let pmId = opts.paymentMethodId || null;
    if (!pmId) {
      const methods = await opts.stripe.paymentMethods.list({ customer: opts.customerId, type: 'card', limit: 5 });
      pmId = methods.data[0]?.id || null;
    }
    if (!pmId) return { ok: false, error: 'No card on file. Add a card to unlock mailing.' };
    const pi = await opts.stripe.paymentIntents.create({
      amount: opts.amountCents,
      currency: 'usd',
      customer: opts.customerId,
      payment_method: pmId,
      off_session: true,
      confirm: true,
      description: `Smart FCRA postage — ${opts.mailClass}`,
      metadata: {
        type: 'mail_postage_card_charge',
        orgId: opts.orgId,
        mailClass: opts.mailClass,
        documentId: opts.documentId || '',
        disputeId: opts.disputeId || '',
      },
    });
    if (pi.status !== 'succeeded' && pi.status !== 'processing') {
      return { ok: false, error: `Card charge status: ${pi.status}` };
    }
    return { ok: true, paymentIntentId: String(pi.id) };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Card charge failed' };
  }
}

export async function refreshOrgMailCardFromStripe(opts: {
  stripe: Stripe;
  db: D1Database;
  orgId: string;
  customerId?: string | null;
}) {
  if (!opts.customerId) {
    return { cardOnFile: false, mailUnlocked: false, brand: null as string | null, last4: null as string | null };
  }
  try {
    const methods = await opts.stripe.paymentMethods.list({ customer: opts.customerId, type: 'card', limit: 5 });
    const card = methods.data[0];
    if (card) {
      await markOrgMailCardUnlocked(opts.db, opts.orgId, {
        paymentMethodId: card.id,
        cardOnFile: true,
        unlocked: true,
      });
      return {
        cardOnFile: true,
        mailUnlocked: true,
        brand: (card.card as any)?.brand || null,
        last4: (card.card as any)?.last4 || null,
      };
    }
    await markOrgMailCardUnlocked(opts.db, opts.orgId, {
      paymentMethodId: null,
      cardOnFile: false,
      unlocked: false,
    });
  } catch { /* soft */ }
  const credits = await getOrgMailCredits(opts.db, opts.orgId);
  return {
    cardOnFile: credits.cardOnFile,
    mailUnlocked: credits.mailUnlocked,
    brand: null as string | null,
    last4: null as string | null,
  };
}

async function resolveMailClient(db: D1Database, user: any, clientIdHint?: string | null) {
  if (user.role === 'client') {
    return db.prepare('SELECT * FROM clients WHERE email = ? AND org_id = ?').bind(user.email, user.org_id).first();
  }
  const clientId = String(clientIdHint || '').trim();
  if (!clientId) return null;
  return db.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first();
}

export function registerMailPostageRoutes(app: Hono<any>, opts: RegisterOpts) {
  const { authMiddleware } = opts;

  app.get('/api/mail-postage/catalog', authMiddleware, async (c) => {
    return c.json(mailPostagePublicCatalog());
  });

  app.get('/api/mail-postage/org', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = staffOnly(user);
    if (err) return c.json({ error: err }, 403);
    const org = await c.env.DB.prepare(
      'SELECT name, settings, stripe_customer_id FROM organizations WHERE id = ?',
    ).bind(user.org_id).first() as any;
    const settings = parseOrgMailSettings(org?.settings);
    let credits = await getOrgMailCredits(c.env.DB, user.org_id);
    let cardMeta = { brand: null as string | null, last4: null as string | null };

    const stripe = stripeClient(c.env);
    if (stripe && org?.stripe_customer_id) {
      const refreshed = await refreshOrgMailCardFromStripe({
        stripe,
        db: c.env.DB,
        orgId: user.org_id,
        customerId: org.stripe_customer_id,
      });
      credits = await getOrgMailCredits(c.env.DB, user.org_id);
      cardMeta = { brand: refreshed.brand, last4: refreshed.last4 };
    }

    const ledger = await c.env.DB.prepare(
      `SELECT id, payer, event_type, mail_class, amount_cents, balance_after_cents, note, created_at
       FROM mail_postage_ledger WHERE org_id = ? ORDER BY created_at DESC LIMIT 30`,
    ).bind(user.org_id).all().catch(() => ({ results: [] }));

    const unlocked = !!(credits.mailUnlocked || credits.cardOnFile || settings.billingComped || settings.postageComped || credits.postageComped);
    return c.json({
      credits,
      unlocked,
      card: {
        onFile: !!credits.cardOnFile,
        brand: cardMeta.brand,
        last4: cardMeta.last4,
        customerId: org?.stripe_customer_id || null,
      },
      settings: {
        mailPostagePayer: settings.mailPostagePayer,
        postageComped: settings.postageComped || credits.postageComped,
        billingComped: settings.billingComped,
        defaultMailClass: settings.defaultMailClass,
      },
      ratesCents: MAIL_POSTAGE_RATES_CENTS,
      packs: ORG_MAIL_CREDIT_PACKS,
      recent: ledger.results || [],
      selfServe: true,
      hint: unlocked
        ? 'Mailing unlocked. Letters charge your saved card (or prepaid wallet) automatically.'
        : 'Add your firm card below to unlock mailing. You add the card yourself in Stripe Checkout — the platform never stores card numbers in files or secrets.',
    });
  });

  /** Firm adds their own card → unlocks mailing (card stored only in Stripe). */
  app.post('/api/mail-postage/org/add-card', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);

    const blocked = productionStripeBlockReason(c.env);
    if (blocked) return c.json({ error: blocked, code: 'STRIPE_LIVE_REQUIRED' }, 503);
    const stripe = stripeClient(c.env);
    if (!stripe) return c.json({ error: 'Stripe is not configured' }, 503);

    const org = await c.env.DB.prepare('SELECT name FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    const customerId = await ensureOrgStripeCustomer({
      stripe,
      db: c.env.DB,
      orgId: user.org_id,
      email: user.email,
      name: org?.name,
    });
    const base = appBase(c.env);
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'setup',
        payment_method_types: ['card'],
        customer: customerId,
        success_url: `${base}/app?page=settings&mailCard=unlocked`,
        cancel_url: `${base}/app?page=settings&mailCard=cancelled`,
        client_reference_id: user.org_id,
        metadata: {
          type: 'mail_postage_card_setup',
          orgId: user.org_id,
        },
      });
      return c.json({
        ok: true,
        url: session.url,
        message: 'Add your card in Stripe. When saved, mailing unlocks and each letter is charged automatically.',
      });
    } catch (e: any) {
      return c.json({ error: e.message || 'Could not start card setup' }, 500);
    }
  });

  app.put('/api/mail-postage/org/settings', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const body = await c.req.json().catch(() => ({}));
    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    let settings: any = {};
    try { settings = JSON.parse(org?.settings || '{}'); } catch { settings = {}; }

    if (body.mailPostagePayer || body.mail_postage_payer) {
      const mode = String(body.mailPostagePayer || body.mail_postage_payer).toLowerCase();
      const allowed = ['org', 'client', 'org_then_client', 'client_then_org'];
      if (!allowed.includes(mode)) return c.json({ error: 'Invalid mailPostagePayer' }, 400);
      settings.mail_postage_payer = mode;
    }
    if (typeof body.mailPostageComped === 'boolean' || typeof body.mail_postage_comped === 'boolean') {
      const on = !!(body.mailPostageComped ?? body.mail_postage_comped);
      settings.mail_postage_comped = on;
      await setOrgMailPostageComped(c.env.DB, user.org_id, on);
    }

    await c.env.DB.prepare(
      'UPDATE organizations SET settings = ?, updated_at = datetime("now") WHERE id = ?',
    ).bind(JSON.stringify(settings), user.org_id).run();

    return c.json({ ok: true, settings: parseOrgMailSettings(settings) });
  });

  app.post('/api/mail-postage/org/credits/purchase', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const body = await c.req.json().catch(() => ({}));
    const pack = ORG_MAIL_CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) return c.json({ error: 'Invalid postage pack' }, 400);

    const blocked = productionStripeBlockReason(c.env);
    if (blocked) return c.json({ error: blocked, code: 'STRIPE_LIVE_REQUIRED', pack }, 503);
    const stripe = stripeClient(c.env);
    if (!stripe) {
      return c.json({ error: 'Stripe is not configured for postage purchases', pack }, 503);
    }

    const org = await c.env.DB.prepare('SELECT stripe_customer_id FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    const base = appBase(c.env);
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: pack.amountCents,
            product_data: {
              name: pack.label,
              metadata: { type: 'mail_postage_pack', packId: pack.id },
            },
          },
          quantity: 1,
        }],
        success_url: `${base}/app?page=settings&mailPostage=success&pack=${pack.id}`,
        cancel_url: `${base}/app?page=settings&mailPostage=cancelled`,
        client_reference_id: user.org_id,
        customer: org?.stripe_customer_id || undefined,
        customer_email: org?.stripe_customer_id ? undefined : user.email,
        metadata: {
          type: 'mail_postage_pack',
          packId: pack.id,
          orgId: user.org_id,
          creditCents: String(pack.creditCents),
          payer: 'org',
        },
      });
      return c.json({ ok: true, url: session.url, pack });
    } catch (e: any) {
      return c.json({ error: e.message || 'Stripe checkout failed', pack }, 500);
    }
  });

  app.get('/api/mail-postage/client', authMiddleware, async (c) => {
    const user = c.get('user');
    const client = await resolveMailClient(c.env.DB, user, c.req.query('clientId'));
    if (!client) return c.json({ error: user.role === 'client' ? 'Client profile not found' : 'clientId required' }, 404);

    const org = await c.env.DB.prepare('SELECT settings FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    const settings = parseOrgMailSettings(org?.settings);
    const credits = await getClientMailCredits(c.env.DB, user.org_id, client.id);
    return c.json({
      clientId: client.id,
      credits,
      ratesCents: MAIL_POSTAGE_RATES_CENTS,
      packs: CLIENT_MAIL_CREDIT_PACKS,
      payerMode: settings.mailPostagePayer,
      canPurchase: settings.mailPostagePayer !== 'org',
    });
  });

  app.post('/api/mail-postage/client/credits/purchase', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    if (user.role !== 'client') {
      const staffErr = staffOnly(user);
      if (staffErr) return c.json({ error: staffErr }, 403);
    }
    const client = await resolveMailClient(c.env.DB, user, body.clientId);
    if (!client) return c.json({ error: 'Client not found' }, 404);
    const clientId = client.id;

    const org = await c.env.DB.prepare('SELECT settings, stripe_customer_id FROM organizations WHERE id = ?').bind(user.org_id).first() as any;
    const settings = parseOrgMailSettings(org?.settings);
    if (settings.mailPostagePayer === 'org') {
      return c.json({ error: 'This firm pays postage from its own wallet. Client postage purchase is disabled.' }, 400);
    }

    const pack = CLIENT_MAIL_CREDIT_PACKS.find((p) => p.id === body.packId);
    if (!pack) return c.json({ error: 'Invalid postage pack' }, 400);

    const blocked = productionStripeBlockReason(c.env);
    if (blocked) return c.json({ error: blocked, code: 'STRIPE_LIVE_REQUIRED', pack }, 503);
    const stripe = stripeClient(c.env);
    if (!stripe) return c.json({ error: 'Stripe is not configured', pack }, 503);

    const base = appBase(c.env);
    const successPage = user.role === 'client' ? 'client-billing' : 'clients';
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: pack.amountCents,
            product_data: {
              name: pack.label,
              metadata: { type: 'mail_postage_client_pack', packId: pack.id },
            },
          },
          quantity: 1,
        }],
        success_url: `${base}/app?page=${successPage}&mailPostage=success&pack=${pack.id}`,
        cancel_url: `${base}/app?page=${successPage}&mailPostage=cancelled`,
        client_reference_id: user.org_id,
        customer: client.stripe_customer_id || undefined,
        customer_email: client.stripe_customer_id ? undefined : (client.email || user.email),
        metadata: {
          type: 'mail_postage_client_pack',
          packId: pack.id,
          orgId: user.org_id,
          clientId,
          creditCents: String(pack.creditCents),
          payer: 'client',
        },
      });
      return c.json({ ok: true, url: session.url, pack });
    } catch (e: any) {
      return c.json({ error: e.message || 'Stripe checkout failed', pack }, 500);
    }
  });

  /** One-shot: client (or staff on behalf) pays exact postage for one letter. */
  app.post('/api/mail-postage/client/pay-letter', authMiddleware, async (c) => {
    const user = c.get('user');
    const body = await c.req.json().catch(() => ({}));
    if (user.role !== 'client') {
      const staffErr = staffOnly(user);
      if (staffErr) return c.json({ error: staffErr }, 403);
    }
    const client = await resolveMailClient(c.env.DB, user, body.clientId);
    if (!client) return c.json({ error: 'Client not found' }, 404);
    const clientId = client.id;

    const mailClass = normalizePostageMailClass(body.mailClass);
    const costCents = postageCostCents(mailClass);
    const blocked = productionStripeBlockReason(c.env);
    if (blocked) return c.json({ error: blocked, code: 'STRIPE_LIVE_REQUIRED' }, 503);
    const stripe = stripeClient(c.env);
    if (!stripe) return c.json({ error: 'Stripe is not configured' }, 503);

    const base = appBase(c.env);
    const successPage = user.role === 'client' ? 'client-disputes' : 'documents';
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            unit_amount: costCents,
            product_data: {
              name: `USPS ${mailClass} postage — Smart FCRA mailing`,
              metadata: { type: 'mail_postage_letter', mailClass },
            },
          },
          quantity: 1,
        }],
        success_url: `${base}/app?page=${successPage}&mailPostage=letter_paid&class=${mailClass}`,
        cancel_url: `${base}/app?page=${successPage}&mailPostage=cancelled`,
        customer: client.stripe_customer_id || undefined,
        customer_email: client.stripe_customer_id ? undefined : (client.email || user.email),
        metadata: {
          type: 'mail_postage_letter',
          orgId: user.org_id,
          clientId,
          creditCents: String(costCents),
          mailClass,
          payer: 'client',
          documentId: String(body.documentId || ''),
          disputeId: String(body.disputeId || ''),
        },
      });
      return c.json({ ok: true, url: session.url, costCents, mailClass });
    } catch (e: any) {
      return c.json({ error: e.message || 'Stripe checkout failed' }, 500);
    }
  });

  /** Staff grant / top-up without Stripe (admin). */
  app.post('/api/mail-postage/org/credits/grant', authMiddleware, async (c) => {
    const user = c.get('user');
    const err = adminOnly(user);
    if (err) return c.json({ error: err }, 403);
    const body = await c.req.json().catch(() => ({}));
    const cents = Math.floor(Number(body.creditCents || body.amountCents || 0));
    if (cents <= 0 || cents > 500000) return c.json({ error: 'creditCents must be 1–500000' }, 400);
    const after = await addOrgMailCredits(c.env.DB, user.org_id, cents, {
      actorUserId: user.id,
      note: body.note || 'manual grant',
    });
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description) VALUES (?, ?, ?, ?, ?)',
    ).bind(generateId(), user.org_id, user.id, 'mail_postage_granted', `Granted $${(cents / 100).toFixed(2)} postage`).run().catch(() => null);
    return c.json({ ok: true, credits: after });
  });
}

/** Fulfill Stripe Checkout sessions for mail postage. Returns true if handled. */
export async function fulfillMailPostageCheckout(db: D1Database, sessionObj: any): Promise<boolean> {
  const type = sessionObj?.metadata?.type;
  const orgId = sessionObj?.metadata?.orgId;
  if (!orgId) return false;

  if (type === 'mail_postage_card_setup') {
    await markOrgMailCardUnlocked(db, orgId, {
      paymentMethodId: null,
      cardOnFile: true,
      unlocked: true,
    });
    if (sessionObj?.customer) {
      await db.prepare(
        'UPDATE organizations SET stripe_customer_id = COALESCE(stripe_customer_id, ?), updated_at = datetime("now") WHERE id = ?',
      ).bind(String(sessionObj.customer), orgId).run().catch(() => null);
    }
    await db.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      generateId(),
      orgId,
      null,
      'mail_card_unlocked',
      'Firm card saved — mailing unlocked (card stored in Stripe only)',
      JSON.stringify({
        sessionId: sessionObj.id,
        customer: sessionObj.customer || null,
        setupIntent: sessionObj.setup_intent || null,
      }),
    ).run().catch(() => null);
    return true;
  }

  const creditCents = Number(sessionObj?.metadata?.creditCents || 0);
  if (creditCents <= 0) return false;

  if (type === 'mail_postage_pack') {
    await addOrgMailCredits(db, orgId, creditCents, {
      stripeSessionId: String(sessionObj.id || ''),
      packId: sessionObj.metadata?.packId,
      note: `stripe pack ${sessionObj.metadata?.packId || ''}`.trim(),
    });
    await markOrgMailCardUnlocked(db, orgId, { cardOnFile: true, unlocked: true });
    await db.prepare(
      'INSERT INTO activity_log (id, org_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?)',
    ).bind(
      generateId(),
      orgId,
      null,
      'mail_postage_purchased',
      `Org postage pack ${sessionObj.metadata?.packId} — $${(creditCents / 100).toFixed(2)}`,
      JSON.stringify({
        packId: sessionObj.metadata?.packId,
        creditCents,
        paymentIntent: sessionObj.payment_intent || sessionObj.id,
      }),
    ).run().catch(() => null);
    return true;
  }

  if (type === 'mail_postage_client_pack' || type === 'mail_postage_letter') {
    const clientId = sessionObj?.metadata?.clientId;
    if (!clientId) return false;
    await addClientMailCredits(db, orgId, clientId, creditCents, {
      stripeSessionId: String(sessionObj.id || ''),
      packId: sessionObj.metadata?.packId || type,
      note: type === 'mail_postage_letter'
        ? `pay-letter ${sessionObj.metadata?.mailClass || ''}`
        : `client pack ${sessionObj.metadata?.packId || ''}`,
    });
    await db.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).bind(
      generateId(),
      orgId,
      clientId,
      null,
      'mail_postage_purchased',
      type === 'mail_postage_letter'
        ? `Client paid $${(creditCents / 100).toFixed(2)} for ${sessionObj.metadata?.mailClass || 'letter'} postage`
        : `Client postage pack ${sessionObj.metadata?.packId} — $${(creditCents / 100).toFixed(2)}`,
      JSON.stringify({
        type,
        packId: sessionObj.metadata?.packId,
        creditCents,
        mailClass: sessionObj.metadata?.mailClass,
        paymentIntent: sessionObj.payment_intent || sessionObj.id,
      }),
    ).run().catch(() => null);
    return true;
  }

  return false;
}
