/**
 * Attach Stripe SaaS payments to real organizations — never to demo/sandbox hosts.
 */
import { DEMO_ORG_ID, DEMO_STAFF_EMAIL } from '../engine/demo-experience';
import { isSaaSPlanId, type SaaSPlanId } from './stripe-catalog';

export const PROTECTED_ORG_IDS = new Set([DEMO_ORG_ID, 'org_platform_master']);

const DEMO_EMAILS = new Set([
  DEMO_STAFF_EMAIL.toLowerCase(),
  'salisha.mcdowell@example.com',
  'demo@example.com',
]);

export function normalizePayEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

export function isDemoSandboxEmail(email: string): boolean {
  const e = normalizePayEmail(email);
  if (!e) return true;
  if (DEMO_EMAILS.has(e)) return true;
  return false;
}

export function isProtectedOrgId(orgId: string | null | undefined): boolean {
  if (!orgId) return true;
  return PROTECTED_ORG_IDS.has(orgId);
}

export function planIdFromCheckoutSession(session: {
  metadata?: Record<string, string | undefined>;
} | null | undefined): SaaSPlanId | null {
  const raw = session?.metadata?.planId || session?.metadata?.smartfcra_plan;
  return isSaaSPlanId(raw) ? raw : null;
}

type Db = {
  prepare: (sql: string) => {
    bind: (...args: any[]) => {
      first: () => Promise<any>;
      all: () => Promise<{ results?: any[] }>;
      run: () => Promise<any>;
    };
    first?: () => Promise<any>;
    all?: () => Promise<{ results?: any[] }>;
    run?: () => Promise<any>;
  };
};

export async function lookupOrgByUserEmail(db: Db, email: string): Promise<{ orgId: string; userId: string } | null> {
  const e = normalizePayEmail(email);
  if (!e || isDemoSandboxEmail(e)) return null;
  const row = await db.prepare(
    `SELECT id, org_id FROM users WHERE lower(email) = ? ORDER BY created_at ASC LIMIT 1`,
  ).bind(e).first() as any;
  if (!row?.org_id || isProtectedOrgId(row.org_id)) return null;
  return { orgId: row.org_id, userId: row.id };
}

export async function applyPaidPlanToOrg(
  db: Db,
  opts: {
    orgId: string;
    plan: SaaSPlanId;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    email?: string | null;
  },
): Promise<boolean> {
  if (isProtectedOrgId(opts.orgId)) return false;
  await db.prepare(
    `UPDATE organizations SET plan = ?, stripe_customer_id = COALESCE(?, stripe_customer_id), stripe_subscription_id = COALESCE(?, stripe_subscription_id) WHERE id = ?`,
  ).bind(opts.plan, opts.stripeCustomerId || null, opts.stripeSubscriptionId || null, opts.orgId).run();
  const email = normalizePayEmail(opts.email);
  if (email) {
    await db.prepare(`UPDATE users SET is_active = 1 WHERE org_id = ? AND lower(email) = ?`).bind(opts.orgId, email).run();
  }
  return true;
}

export async function recordSaasEntitlement(
  db: Db,
  row: {
    id: string;
    email: string;
    plan: SaaSPlanId;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeSessionId?: string | null;
    orgId?: string | null;
    status: 'pending' | 'applied' | 'skipped_demo';
  },
): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO saas_entitlements (id, email, plan, stripe_customer_id, stripe_subscription_id, stripe_session_id, org_id, status, created_at, applied_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), CASE WHEN ? = 'applied' THEN datetime('now') ELSE NULL END)`,
    ).bind(
      row.id,
      normalizePayEmail(row.email),
      row.plan,
      row.stripeCustomerId || null,
      row.stripeSubscriptionId || null,
      row.stripeSessionId || null,
      row.orgId || null,
      row.status,
      row.status,
    ).run();
  } catch (e: any) {
    if (String(e?.message || '').includes('no such table')) return;
    if (String(e?.message || '').includes('UNIQUE')) {
      await db.prepare(
        `UPDATE saas_entitlements SET status = ?, org_id = COALESCE(?, org_id), plan = ?, applied_at = CASE WHEN ? = 'applied' THEN datetime('now') ELSE applied_at END
         WHERE stripe_session_id = ? OR (email = ? AND status = 'pending')`,
      ).bind(row.status, row.orgId || null, row.plan, row.status, row.stripeSessionId || '', normalizePayEmail(row.email)).run().catch(() => {});
      return;
    }
    throw e;
  }
}

export async function claimPendingSaasEntitlement(
  db: Db,
  opts: { email: string; orgId: string },
): Promise<{ applied: boolean; plan: SaaSPlanId | null }> {
  if (isProtectedOrgId(opts.orgId) || isDemoSandboxEmail(opts.email)) {
    return { applied: false, plan: null };
  }
  const email = normalizePayEmail(opts.email);
  let pending: any = null;
  try {
    pending = await db.prepare(
      `SELECT * FROM saas_entitlements WHERE email = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
    ).bind(email).first();
  } catch (e: any) {
    if (String(e?.message || '').includes('no such table')) return { applied: false, plan: null };
    throw e;
  }
  if (!pending || !isSaaSPlanId(pending.plan)) return { applied: false, plan: null };
  const ok = await applyPaidPlanToOrg(db, {
    orgId: opts.orgId,
    plan: pending.plan,
    stripeCustomerId: pending.stripe_customer_id,
    stripeSubscriptionId: pending.stripe_subscription_id,
    email,
  });
  if (!ok) return { applied: false, plan: null };
  await db.prepare(
    `UPDATE saas_entitlements SET status = 'applied', org_id = ?, applied_at = datetime('now') WHERE id = ?`,
  ).bind(opts.orgId, pending.id).run();
  return { applied: true, plan: pending.plan };
}

export async function fulfillSaasCheckout(
  db: Db,
  opts: {
    generateId: () => string;
    orgIdHint?: string | null;
    email?: string | null;
    plan: SaaSPlanId;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    stripeSessionId?: string | null;
  },
): Promise<{ status: 'applied' | 'pending' | 'skipped_demo'; orgId: string | null }> {
  const email = normalizePayEmail(opts.email);
  if (isDemoSandboxEmail(email)) {
    await recordSaasEntitlement(db, {
      id: opts.generateId(),
      email: email || 'demo',
      plan: opts.plan,
      stripeCustomerId: opts.stripeCustomerId,
      stripeSubscriptionId: opts.stripeSubscriptionId,
      stripeSessionId: opts.stripeSessionId,
      orgId: null,
      status: 'skipped_demo',
    });
    return { status: 'skipped_demo', orgId: null };
  }

  let orgId = opts.orgIdHint && !isProtectedOrgId(opts.orgIdHint) ? opts.orgIdHint : null;
  if (orgId) {
    const exists = await db.prepare('SELECT id FROM organizations WHERE id = ?').bind(orgId).first() as any;
    if (!exists) orgId = null;
  }
  if (!orgId && email) {
    const found = await lookupOrgByUserEmail(db, email);
    orgId = found?.orgId || null;
  }

  if (orgId) {
    await applyPaidPlanToOrg(db, {
      orgId,
      plan: opts.plan,
      stripeCustomerId: opts.stripeCustomerId,
      stripeSubscriptionId: opts.stripeSubscriptionId,
      email,
    });
    await recordSaasEntitlement(db, {
      id: opts.generateId(),
      email,
      plan: opts.plan,
      stripeCustomerId: opts.stripeCustomerId,
      stripeSubscriptionId: opts.stripeSubscriptionId,
      stripeSessionId: opts.stripeSessionId,
      orgId,
      status: 'applied',
    });
    return { status: 'applied', orgId };
  }

  await recordSaasEntitlement(db, {
    id: opts.generateId(),
    email,
    plan: opts.plan,
    stripeCustomerId: opts.stripeCustomerId,
    stripeSubscriptionId: opts.stripeSubscriptionId,
    stripeSessionId: opts.stripeSessionId,
    orgId: null,
    status: 'pending',
  });
  return { status: 'pending', orgId: null };
}
