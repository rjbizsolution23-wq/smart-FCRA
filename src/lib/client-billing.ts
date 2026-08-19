/**
 * Client-facing recurring billing (CRO services) — separate from org SaaS billing.
 * CROA gates apply via service-ledger before charging covered repair fees.
 */
import Stripe from 'stripe';
import { assertCoveredChargeAllowed, writeBillingLedger } from './service-ledger';
import { evaluateBillableEvent } from './billing-compliance';

export type ClientBillingEnv = {
  STRIPE_API_KEY?: string;
};

export function clientBillingConfigured(env: ClientBillingEnv): boolean {
  return !!env.STRIPE_API_KEY?.startsWith('sk_');
}

export async function createClientSubscriptionCheckout(opts: {
  env: ClientBillingEnv;
  db: D1Database;
  orgId: string;
  clientId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
  generateId: () => string;
}): Promise<{ url: string; sessionId: string } | { error: string; status: number }> {
  if (!clientBillingConfigured(opts.env)) {
    return { error: 'Stripe is not configured', status: 503 };
  }

  const client = await opts.db.prepare(
    'SELECT * FROM clients WHERE id = ? AND org_id = ?',
  ).bind(opts.clientId, opts.orgId).first() as any;
  if (!client) return { error: 'Client not found', status: 404 };

  const plan = await opts.db.prepare(
    'SELECT * FROM client_billing_plans WHERE id = ? AND org_id = ? AND active = 1',
  ).bind(opts.planId, opts.orgId).first() as any;
  if (!plan) return { error: 'Billing plan not found', status: 404 };

  const gate = await assertCoveredChargeAllowed({
    db: opts.db,
    orgId: opts.orgId,
    clientId: opts.clientId,
    serviceType: 'monthly_credit_repair',
    contractSigned: client.croa_contract_agreed === 1,
    croaDisclosuresAcknowledged: client.permissible_purpose_consent === 1 && client.croa_contract_agreed === 1,
    generateId: opts.generateId,
  });
  if (!gate.allowed) {
    return { error: `CROA billing gate: ${gate.eval.explanation.join('; ')}`, status: 403 };
  }

  const stripe = new Stripe(opts.env.STRIPE_API_KEY!, { apiVersion: '2024-06-20' as any });

  let customerId = client.stripe_customer_id as string | null;
  if (!customerId && client.email) {
    const customer = await stripe.customers.create({
      email: client.email,
      name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
      metadata: { orgId: opts.orgId, clientId: opts.clientId, type: 'cro_client' },
    });
    customerId = customer.id;
    await opts.db.prepare(
      'UPDATE clients SET stripe_customer_id = ?, updated_at = datetime(\'now\') WHERE id = ? AND org_id = ?',
    ).bind(customerId, opts.clientId, opts.orgId).run();
  }
  if (!customerId) return { error: 'Client email required for billing', status: 400 };

  let priceId = plan.stripe_price_id as string | null;
  if (!priceId) {
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { orgId: opts.orgId, planId: plan.id },
    });
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.amount_cents,
      currency: 'usd',
      recurring: { interval: (plan.interval === 'year' ? 'year' : 'month') as 'month' | 'year' },
      metadata: { orgId: opts.orgId, planId: plan.id },
    });
    priceId = price.id;
    await opts.db.prepare(
      'UPDATE client_billing_plans SET stripe_price_id = ? WHERE id = ?',
    ).bind(priceId, plan.id).run();
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId!, quantity: 1 }],
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    metadata: {
      type: 'client_subscription',
      orgId: opts.orgId,
      clientId: opts.clientId,
      planId: plan.id,
    },
    subscription_data: {
      metadata: { type: 'client_subscription', orgId: opts.orgId, clientId: opts.clientId, planId: plan.id },
    },
  });

  return { url: session.url!, sessionId: session.id };
}

export async function handleClientBillingWebhook(opts: {
  db: D1Database;
  event: Stripe.Event;
  generateId: () => string;
}): Promise<boolean> {
  const obj = opts.event.data.object as any;

  if (opts.event.type === 'checkout.session.completed' && obj?.metadata?.type === 'client_subscription') {
    const subId = obj.subscription as string;
    await opts.db.prepare(
      `UPDATE clients SET stripe_subscription_id = ?, subscription_status = 'active', subscription_plan = ?,
       billing_amount_cents = ?, payment_status = 'current', dunning_stage = 0, updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`,
    ).bind(subId, obj.metadata.planId || 'monthly', obj.amount_total || null, obj.metadata.clientId, obj.metadata.orgId).run();
    await writeBillingLedger({
      db: opts.db,
      id: opts.generateId(),
      orgId: obj.metadata.orgId,
      clientId: obj.metadata.clientId,
      stripeObjectId: subId,
      eventType: 'client.subscription.started',
      amountCents: obj.amount_total,
      serviceType: 'monthly_credit_repair',
      decision: 'ALLOW',
      status: 'PAID',
    });
    return true;
  }

  if (opts.event.type === 'invoice.payment_failed' && obj?.subscription) {
    const subId = String(obj.subscription);
    const client = await opts.db.prepare(
      'SELECT id, org_id, dunning_stage, email, first_name FROM clients WHERE stripe_subscription_id = ?',
    ).bind(subId).first() as any;
    if (!client) return false;
    const stage = Number(client.dunning_stage || 0) + 1;
    const paymentStatus = stage >= 3 ? 'suspended' : 'past_due';
    await opts.db.prepare(
      `UPDATE clients SET dunning_stage = ?, payment_status = ?, subscription_status = ?,
       updated_at = datetime('now') WHERE stripe_subscription_id = ?`,
    ).bind(stage, paymentStatus, paymentStatus === 'suspended' ? 'past_due' : 'active', subId).run();
    await opts.db.prepare(
      `INSERT INTO client_invoices (id, org_id, client_id, stripe_invoice_id, amount_cents, status, invoice_type, description)
       VALUES (?, ?, ?, ?, ?, 'failed', 'subscription', ?)`,
    ).bind(
      opts.generateId(), client.org_id, client.id, obj.id, obj.amount_due || 0,
      `Payment failed (dunning stage ${stage})`,
    ).run();
    return true;
  }

  if (opts.event.type === 'invoice.paid' || opts.event.type === 'invoice.payment_succeeded') {
    await opts.db.prepare(
      `UPDATE clients SET dunning_stage = 0, payment_status = 'current', subscription_status = 'active',
       updated_at = datetime('now') WHERE stripe_subscription_id = ?`,
    ).bind(String(obj.subscription)).run();
    return true;
  }

  return false;
}

export async function listClientBillingPlans(db: D1Database, orgId: string) {
  const rows = await db.prepare(
    'SELECT * FROM client_billing_plans WHERE org_id = ? AND active = 1 ORDER BY amount_cents ASC',
  ).bind(orgId).all();
  return rows.results || [];
}
