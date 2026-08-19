/**
 * Pay-per-delete billing — invoice on verified DELETED credit events (CROA-gated).
 */
import Stripe from 'stripe';
import { assertCoveredChargeAllowed, writeBillingLedger } from './service-ledger';

export type PpdSettings = {
  enabled?: boolean;
  amountCents?: number;
  requireApproval?: boolean;
};

export function parsePpdSettings(orgSettings: any): PpdSettings {
  const s = orgSettings?.ppd || {};
  return {
    enabled: !!s.enabled,
    amountCents: Number(s.amountCents || 0),
    requireApproval: s.requireApproval !== false,
  };
}

export async function queuePpdCharge(opts: {
  db: D1Database;
  env: { STRIPE_API_KEY?: string };
  orgId: string;
  clientId: string;
  creditEventId: string;
  accountKey: string;
  orgSettings: any;
  generateId: () => string;
  autoApprove?: boolean;
}): Promise<{ queued: boolean; chargeId?: string; reason?: string }> {
  const ppd = parsePpdSettings(opts.orgSettings);
  if (!ppd.enabled || !ppd.amountCents) {
    return { queued: false, reason: 'PPD not configured' };
  }

  const existing = await opts.db.prepare(
    'SELECT id FROM ppd_charges WHERE credit_event_id = ? AND org_id = ?',
  ).bind(opts.creditEventId, opts.orgId).first();
  if (existing) return { queued: false, reason: 'Already queued' };

  const client = await opts.db.prepare(
    'SELECT * FROM clients WHERE id = ? AND org_id = ?',
  ).bind(opts.clientId, opts.orgId).first() as any;
  if (!client) return { queued: false, reason: 'Client not found' };

  const chargeId = opts.generateId();
  const status = ppd.requireApproval && !opts.autoApprove ? 'pending' : 'approved';

  await opts.db.prepare(
    `INSERT INTO ppd_charges (id, org_id, client_id, credit_event_id, account_key, amount_cents, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(chargeId, opts.orgId, opts.clientId, opts.creditEventId, opts.accountKey, ppd.amountCents, status).run();

  if (status === 'approved' && opts.env.STRIPE_API_KEY?.startsWith('sk_')) {
    await invoicePpdCharge({ ...opts, chargeId, client });
  }

  return { queued: true, chargeId };
}

export async function invoicePpdCharge(opts: {
  db: D1Database;
  env: { STRIPE_API_KEY?: string };
  orgId: string;
  clientId: string;
  chargeId: string;
  client: any;
  generateId: () => string;
  approvedBy?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const charge = await opts.db.prepare(
    'SELECT * FROM ppd_charges WHERE id = ? AND org_id = ?',
  ).bind(opts.chargeId, opts.orgId).first() as any;
  if (!charge || charge.status === 'invoiced') return { ok: false, error: 'Invalid charge' };

  const gate = await assertCoveredChargeAllowed({
    db: opts.db,
    orgId: opts.orgId,
    clientId: opts.clientId,
    serviceType: 'pay_per_delete',
    contractSigned: opts.client.croa_contract_agreed === 1,
    croaDisclosuresAcknowledged: opts.client.permissible_purpose_consent === 1,
    generateId: opts.generateId,
  });
  if (!gate.allowed) {
    await opts.db.prepare(
      'UPDATE ppd_charges SET status = ? WHERE id = ?',
    ).bind('blocked_croa', opts.chargeId).run();
    return { ok: false, error: gate.eval.explanation.join('; ') };
  }

  if (!opts.env.STRIPE_API_KEY?.startsWith('sk_')) {
    await opts.db.prepare(
      `INSERT INTO client_invoices (id, org_id, client_id, amount_cents, status, invoice_type, description, ppd_event_id)
       VALUES (?, ?, ?, ?, 'manual', 'ppd', ?, ?)`,
    ).bind(
      opts.generateId(), opts.orgId, opts.clientId, charge.amount_cents,
      `Pay-per-delete: ${charge.account_key}`, charge.credit_event_id,
    ).run();
    await opts.db.prepare(
      'UPDATE ppd_charges SET status = ?, approved_by = ? WHERE id = ?',
    ).bind('invoiced', opts.approvedBy || 'system', opts.chargeId).run();
    return { ok: true };
  }

  const stripe = new Stripe(opts.env.STRIPE_API_KEY, { apiVersion: '2024-06-20' as any });
  let customerId = opts.client.stripe_customer_id;
  if (!customerId && opts.client.email) {
    const customer = await stripe.customers.create({
      email: opts.client.email,
      name: `${opts.client.first_name || ''} ${opts.client.last_name || ''}`.trim(),
      metadata: { orgId: opts.orgId, clientId: opts.clientId },
    });
    customerId = customer.id;
    await opts.db.prepare(
      'UPDATE clients SET stripe_customer_id = ? WHERE id = ?',
    ).bind(customerId, opts.clientId).run();
  }
  if (!customerId) return { ok: false, error: 'No Stripe customer' };

  const invoice = await stripe.invoices.create({
    customer: customerId,
    collection_method: 'send_invoice',
    days_until_due: 7,
    metadata: { type: 'ppd', orgId: opts.orgId, clientId: opts.clientId, chargeId: opts.chargeId },
  });
  await stripe.invoiceItems.create({
    customer: customerId,
    invoice: invoice.id,
    amount: charge.amount_cents,
    currency: 'usd',
    description: `Results-based fee — account ${charge.account_key} (deletion recorded in file)`,
  });
  const finalized = await stripe.invoices.finalizeInvoice(invoice.id!);

  await opts.db.prepare(
    `INSERT INTO client_invoices (id, org_id, client_id, stripe_invoice_id, amount_cents, status, invoice_type, description, ppd_event_id)
     VALUES (?, ?, ?, ?, ?, 'open', 'ppd', ?, ?)`,
  ).bind(
    opts.generateId(), opts.orgId, opts.clientId, finalized.id, charge.amount_cents,
    `PPD ${charge.account_key}`, charge.credit_event_id,
  ).run();
  await opts.db.prepare(
    'UPDATE ppd_charges SET status = ?, stripe_invoice_id = ?, approved_by = ? WHERE id = ?',
  ).bind('invoiced', finalized.id, opts.approvedBy || 'system', opts.chargeId).run();

  await writeBillingLedger({
    db: opts.db,
    id: opts.generateId(),
    orgId: opts.orgId,
    clientId: opts.clientId,
    stripeObjectId: finalized.id,
    eventType: 'ppd.invoice.created',
    amountCents: charge.amount_cents,
    serviceType: 'pay_per_delete',
    decision: 'ALLOW',
    status: 'INVOICED',
  });

  return { ok: true };
}
