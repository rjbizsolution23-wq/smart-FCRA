/**
 * Lob postage billing — prepaid wallets for orgs and clients.
 * Balance is USD cents. Sends deduct postage; Stripe Checkout funds wallets.
 * @see https://docs.lob.com/
 */
import { generateId } from './auth';

export type MailPostagePayerMode = 'org' | 'client' | 'org_then_client' | 'client_then_org';
export type MailPostagePayer = 'org' | 'client' | 'comped';

/** Retail postage rates (covers Lob print+mail + platform margin). */
export const MAIL_POSTAGE_RATES_CENTS = {
  STANDARD: 99,
  FIRST_CLASS: 149,
  CERTIFIED: 899,
} as const;

export type PostageMailClass = keyof typeof MAIL_POSTAGE_RATES_CENTS;

/** Org prepaid packs (cents credited = face value; growth/scale include bonus). */
export const ORG_MAIL_CREDIT_PACKS = [
  { id: 'mail_starter', creditCents: 2500, amountCents: 2500, label: 'Postage $25 — 25 first-class letters*' },
  { id: 'mail_growth', creditCents: 11000, amountCents: 10000, label: 'Postage $100 — $110 wallet (10% bonus)' },
  { id: 'mail_scale', creditCents: 60000, amountCents: 50000, label: 'Postage $500 — $600 wallet (20% bonus)' },
] as const;

/** Client prepaid packs. */
export const CLIENT_MAIL_CREDIT_PACKS = [
  { id: 'client_mail_5', creditCents: 750, amountCents: 750, label: '5 letters · $7.50' },
  { id: 'client_mail_15', creditCents: 2200, amountCents: 1999, label: '15 letters · $19.99' },
  { id: 'client_mail_40', creditCents: 6000, amountCents: 4999, label: '40 letters · $49.99' },
] as const;

export function normalizePostageMailClass(raw?: string | null): PostageMailClass {
  const u = String(raw || 'FIRST_CLASS').toUpperCase().replace(/[\s-]+/g, '_');
  if (u === 'STANDARD' || u === 'STD' || u === 'usps_standard'.toUpperCase()) return 'STANDARD';
  if (u === 'CERTIFIED' || u.includes('CERTIFIED') || u.includes('RETURN_RECEIPT')) return 'CERTIFIED';
  return 'FIRST_CLASS';
}

export function postageCostCents(mailClass?: string | null): number {
  const cls = normalizePostageMailClass(mailClass);
  return MAIL_POSTAGE_RATES_CENTS[cls];
}

export function parseOrgMailSettings(settingsRaw: unknown): {
  mailPostagePayer: MailPostagePayerMode;
  postageComped: boolean;
  billingComped: boolean;
  defaultMailClass: string;
} {
  let settings: any = {};
  if (typeof settingsRaw === 'string') {
    try { settings = JSON.parse(settingsRaw || '{}'); } catch { settings = {}; }
  } else if (settingsRaw && typeof settingsRaw === 'object') {
    settings = settingsRaw;
  }
  const modeRaw = String(settings.mail_postage_payer || settings.mailPostagePayer || 'org_then_client').toLowerCase();
  const allowed: MailPostagePayerMode[] = ['org', 'client', 'org_then_client', 'client_then_org'];
  const mailPostagePayer = (allowed.includes(modeRaw as MailPostagePayerMode)
    ? modeRaw
    : 'org_then_client') as MailPostagePayerMode;
  return {
    mailPostagePayer,
    postageComped: !!(settings.mail_postage_comped || settings.mailPostageComped),
    billingComped: !!(settings.billing_comped || settings.billingComped),
    defaultMailClass: String(settings.default_mail_class || 'FIRST_CLASS'),
  };
}

export function payerOrder(mode: MailPostagePayerMode, preferred?: string | null): Array<'org' | 'client'> {
  const pref = String(preferred || '').toLowerCase();
  if (pref === 'org' || pref === 'client') {
    if (mode === 'org' && pref === 'client') return ['org'];
    if (mode === 'client' && pref === 'org') return ['client'];
    if (pref === 'org') return mode.includes('client') ? ['org', 'client'] : ['org'];
    return mode.includes('org') ? ['client', 'org'] : ['client'];
  }
  if (mode === 'org') return ['org'];
  if (mode === 'client') return ['client'];
  if (mode === 'client_then_org') return ['client', 'org'];
  return ['org', 'client'];
}

export async function getOrgMailCredits(db: D1Database, orgId: string) {
  const row = await db.prepare(
    'SELECT balance_cents, lifetime_purchased_cents, lifetime_used_cents, postage_comped FROM org_mail_credits WHERE org_id = ?',
  ).bind(orgId).first() as any;
  if (!row) {
    await db.prepare(
      'INSERT OR IGNORE INTO org_mail_credits (org_id, balance_cents) VALUES (?, 0)',
    ).bind(orgId).run().catch(() => null);
    return { balanceCents: 0, lifetimePurchasedCents: 0, lifetimeUsedCents: 0, postageComped: false };
  }
  return {
    balanceCents: Number(row.balance_cents || 0),
    lifetimePurchasedCents: Number(row.lifetime_purchased_cents || 0),
    lifetimeUsedCents: Number(row.lifetime_used_cents || 0),
    postageComped: !!row.postage_comped,
  };
}

export async function getClientMailCredits(db: D1Database, orgId: string, clientId: string) {
  const row = await db.prepare(
    'SELECT balance_cents, lifetime_purchased_cents, lifetime_used_cents FROM client_mail_credits WHERE org_id = ? AND client_id = ?',
  ).bind(orgId, clientId).first() as any;
  if (!row) {
    return { balanceCents: 0, lifetimePurchasedCents: 0, lifetimeUsedCents: 0 };
  }
  return {
    balanceCents: Number(row.balance_cents || 0),
    lifetimePurchasedCents: Number(row.lifetime_purchased_cents || 0),
    lifetimeUsedCents: Number(row.lifetime_used_cents || 0),
  };
}

export async function setOrgMailPostageComped(db: D1Database, orgId: string, enabled: boolean) {
  await db.prepare(
    `INSERT INTO org_mail_credits (org_id, balance_cents, postage_comped) VALUES (?, 0, ?)
     ON CONFLICT(org_id) DO UPDATE SET postage_comped = excluded.postage_comped, updated_at = datetime('now')`,
  ).bind(orgId, enabled ? 1 : 0).run();
}

export async function addOrgMailCredits(db: D1Database, orgId: string, creditCents: number, meta?: {
  actorUserId?: string | null;
  stripeSessionId?: string | null;
  note?: string;
  packId?: string;
}) {
  const cents = Math.max(0, Math.floor(Number(creditCents) || 0));
  if (cents <= 0) return getOrgMailCredits(db, orgId);
  await db.prepare(
    `INSERT INTO org_mail_credits (org_id, balance_cents, lifetime_purchased_cents) VALUES (?, ?, ?)
     ON CONFLICT(org_id) DO UPDATE SET
       balance_cents = balance_cents + excluded.balance_cents,
       lifetime_purchased_cents = lifetime_purchased_cents + excluded.lifetime_purchased_cents,
       updated_at = datetime('now')`,
  ).bind(orgId, cents, cents).run();
  const after = await getOrgMailCredits(db, orgId);
  await writeMailPostageLedger(db, {
    orgId,
    payer: 'org',
    eventType: 'purchase',
    amountCents: cents,
    balanceAfterCents: after.balanceCents,
    actorUserId: meta?.actorUserId || null,
    stripeSessionId: meta?.stripeSessionId || null,
    note: meta?.note || (meta?.packId ? `pack:${meta.packId}` : 'org postage purchase'),
  });
  return after;
}

export async function addClientMailCredits(db: D1Database, orgId: string, clientId: string, creditCents: number, meta?: {
  actorUserId?: string | null;
  stripeSessionId?: string | null;
  note?: string;
  packId?: string;
}) {
  const cents = Math.max(0, Math.floor(Number(creditCents) || 0));
  if (cents <= 0) return getClientMailCredits(db, orgId, clientId);
  await db.prepare(
    `INSERT INTO client_mail_credits (org_id, client_id, balance_cents, lifetime_purchased_cents) VALUES (?, ?, ?, ?)
     ON CONFLICT(org_id, client_id) DO UPDATE SET
       balance_cents = balance_cents + excluded.balance_cents,
       lifetime_purchased_cents = lifetime_purchased_cents + excluded.lifetime_purchased_cents,
       updated_at = datetime('now')`,
  ).bind(orgId, clientId, cents, cents).run();
  const after = await getClientMailCredits(db, orgId, clientId);
  await writeMailPostageLedger(db, {
    orgId,
    clientId,
    payer: 'client',
    eventType: 'purchase',
    amountCents: cents,
    balanceAfterCents: after.balanceCents,
    actorUserId: meta?.actorUserId || null,
    stripeSessionId: meta?.stripeSessionId || null,
    note: meta?.note || (meta?.packId ? `pack:${meta.packId}` : 'client postage purchase'),
  });
  return after;
}

async function writeMailPostageLedger(db: D1Database, row: {
  orgId: string;
  clientId?: string | null;
  payer: MailPostagePayer;
  eventType: string;
  mailClass?: string | null;
  amountCents: number;
  balanceAfterCents?: number | null;
  documentId?: string | null;
  disputeId?: string | null;
  mailingId?: string | null;
  stripeSessionId?: string | null;
  actorUserId?: string | null;
  note?: string | null;
}) {
  await db.prepare(
    `INSERT INTO mail_postage_ledger (
      id, org_id, client_id, payer, event_type, mail_class, amount_cents, balance_after_cents,
      document_id, dispute_id, mailing_id, stripe_session_id, actor_user_id, note
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    generateId(),
    row.orgId,
    row.clientId || null,
    row.payer,
    row.eventType,
    row.mailClass || null,
    row.amountCents,
    row.balanceAfterCents ?? null,
    row.documentId || null,
    row.disputeId || null,
    row.mailingId || null,
    row.stripeSessionId || null,
    row.actorUserId || null,
    row.note || null,
  ).run().catch(() => null);
}

async function deductOrg(db: D1Database, orgId: string, cost: number) {
  const before = await getOrgMailCredits(db, orgId);
  if (before.balanceCents < cost) return null;
  await db.prepare(
    `UPDATE org_mail_credits SET balance_cents = balance_cents - ?, lifetime_used_cents = lifetime_used_cents + ?, updated_at = datetime('now') WHERE org_id = ? AND balance_cents >= ?`,
  ).bind(cost, cost, orgId, cost).run();
  const after = await getOrgMailCredits(db, orgId);
  if (after.balanceCents !== before.balanceCents - cost) return null;
  return after;
}

async function deductClient(db: D1Database, orgId: string, clientId: string, cost: number) {
  const before = await getClientMailCredits(db, orgId, clientId);
  if (before.balanceCents < cost) return null;
  await db.prepare(
    `INSERT INTO client_mail_credits (org_id, client_id, balance_cents, lifetime_used_cents) VALUES (?, ?, 0, 0)
     ON CONFLICT(org_id, client_id) DO UPDATE SET updated_at = datetime('now')`,
  ).bind(orgId, clientId).run().catch(() => null);
  await db.prepare(
    `UPDATE client_mail_credits SET balance_cents = balance_cents - ?, lifetime_used_cents = lifetime_used_cents + ?, updated_at = datetime('now')
     WHERE org_id = ? AND client_id = ? AND balance_cents >= ?`,
  ).bind(cost, cost, orgId, clientId, cost).run();
  const after = await getClientMailCredits(db, orgId, clientId);
  if (after.balanceCents !== before.balanceCents - cost) return null;
  return after;
}

export type ChargePostageResult =
  | {
      ok: true;
      costCents: number;
      mailClass: PostageMailClass;
      payer: MailPostagePayer;
      orgBalanceCents: number;
      clientBalanceCents: number;
      freeOverride?: boolean;
    }
  | {
      ok: false;
      code: 'MAIL_POSTAGE_REQUIRED';
      error: string;
      costCents: number;
      mailClass: PostageMailClass;
      orgBalanceCents: number;
      clientBalanceCents: number;
      payerMode: MailPostagePayerMode;
      canPayOrg: boolean;
      canPayClient: boolean;
    };

export async function chargeMailPostage(opts: {
  db: D1Database;
  orgId: string;
  clientId?: string | null;
  mailClass?: string | null;
  preferredPayer?: string | null;
  orgSettingsRaw?: unknown;
  actorUserId?: string | null;
  documentId?: string | null;
  disputeId?: string | null;
}): Promise<ChargePostageResult> {
  const mailClass = normalizePostageMailClass(opts.mailClass);
  const costCents = postageCostCents(mailClass);
  const settings = parseOrgMailSettings(opts.orgSettingsRaw);
  const orgCredits = await getOrgMailCredits(opts.db, opts.orgId);
  const clientCredits = opts.clientId
    ? await getClientMailCredits(opts.db, opts.orgId, opts.clientId)
    : { balanceCents: 0, lifetimePurchasedCents: 0, lifetimeUsedCents: 0 };

  if (settings.postageComped || settings.billingComped || orgCredits.postageComped) {
    await writeMailPostageLedger(opts.db, {
      orgId: opts.orgId,
      clientId: opts.clientId || null,
      payer: 'comped',
      eventType: 'send_comped',
      mailClass,
      amountCents: 0,
      balanceAfterCents: orgCredits.balanceCents,
      documentId: opts.documentId,
      disputeId: opts.disputeId,
      actorUserId: opts.actorUserId,
      note: 'comped postage',
    });
    return {
      ok: true,
      costCents: 0,
      mailClass,
      payer: 'comped',
      orgBalanceCents: orgCredits.balanceCents,
      clientBalanceCents: clientCredits.balanceCents,
      freeOverride: true,
    };
  }

  const order = payerOrder(settings.mailPostagePayer, opts.preferredPayer);
  for (const who of order) {
    if (who === 'org') {
      const after = await deductOrg(opts.db, opts.orgId, costCents);
      if (after) {
        await writeMailPostageLedger(opts.db, {
          orgId: opts.orgId,
          clientId: opts.clientId || null,
          payer: 'org',
          eventType: 'send',
          mailClass,
          amountCents: -costCents,
          balanceAfterCents: after.balanceCents,
          documentId: opts.documentId,
          disputeId: opts.disputeId,
          actorUserId: opts.actorUserId,
        });
        return {
          ok: true,
          costCents,
          mailClass,
          payer: 'org',
          orgBalanceCents: after.balanceCents,
          clientBalanceCents: clientCredits.balanceCents,
        };
      }
    }
    if (who === 'client' && opts.clientId) {
      const after = await deductClient(opts.db, opts.orgId, opts.clientId, costCents);
      if (after) {
        await writeMailPostageLedger(opts.db, {
          orgId: opts.orgId,
          clientId: opts.clientId,
          payer: 'client',
          eventType: 'send',
          mailClass,
          amountCents: -costCents,
          balanceAfterCents: after.balanceCents,
          documentId: opts.documentId,
          disputeId: opts.disputeId,
          actorUserId: opts.actorUserId,
        });
        const orgAfter = await getOrgMailCredits(opts.db, opts.orgId);
        return {
          ok: true,
          costCents,
          mailClass,
          payer: 'client',
          orgBalanceCents: orgAfter.balanceCents,
          clientBalanceCents: after.balanceCents,
        };
      }
    }
  }

  const canPayOrg = settings.mailPostagePayer !== 'client';
  const canPayClient = settings.mailPostagePayer !== 'org' && !!opts.clientId;
  return {
    ok: false,
    code: 'MAIL_POSTAGE_REQUIRED',
    error: 'Insufficient postage credits. Buy a postage pack or pay for this letter with a card.',
    costCents,
    mailClass,
    orgBalanceCents: orgCredits.balanceCents,
    clientBalanceCents: clientCredits.balanceCents,
    payerMode: settings.mailPostagePayer,
    canPayOrg,
    canPayClient,
  };
}

export function mailPostagePublicCatalog() {
  return {
    ratesCents: MAIL_POSTAGE_RATES_CENTS,
    orgPacks: ORG_MAIL_CREDIT_PACKS,
    clientPacks: CLIENT_MAIL_CREDIT_PACKS,
    note: 'Rates cover Lob print & mail plus platform margin. Certified includes return receipt.',
  };
}
