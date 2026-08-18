/**
 * CROA completion ledger. Covered credit-repair charges require a service_records
 * row before Stripe checkout. Platform SaaS subscriptions are not covered repair.
 */
import { evaluateBillableEvent, isCoveredCreditRepairService, BILLING_POLICY_VERSION, type BillingEvalResult } from './billing-compliance';

export async function recordServiceCompleted(opts: {
  db: D1Database;
  id: string;
  orgId: string;
  clientId: string;
  serviceType: string;
  performedBy?: string | null;
  deliverableId?: string | null;
}): Promise<void> {
  try {
    await opts.db.prepare(
      `INSERT INTO service_records (id, org_id, client_id, service_type, performed_at, performed_by, deliverable_id, status)
       VALUES (?, ?, ?, ?, datetime('now'), ?, ?, 'COMPLETED')`
    ).bind(opts.id, opts.orgId, opts.clientId, opts.serviceType, opts.performedBy || 'system', opts.deliverableId || null).run();
  } catch (e) {
    console.warn('[service-ledger] service_records insert skipped', e);
  }
}

export async function hasCompletedService(db: D1Database, clientId: string, orgId: string, serviceType: string): Promise<{ yes: boolean; recordId: string | null }> {
  try {
    const row = await db.prepare(
      `SELECT id FROM service_records WHERE client_id = ? AND org_id = ? AND service_type = ? AND status = 'COMPLETED' ORDER BY performed_at DESC LIMIT 1`
    ).bind(clientId, orgId, serviceType).first() as any;
    return { yes: !!row?.id, recordId: row?.id || null };
  } catch {
    return { yes: false, recordId: null };
  }
}

export async function writeBillingLedger(opts: {
  db: D1Database;
  id: string;
  orgId: string;
  clientId?: string | null;
  stripeObjectId?: string | null;
  eventType: string;
  amountCents?: number | null;
  serviceType?: string | null;
  serviceRecordId?: string | null;
  decision: string;
  decisionId?: string | null;
  status?: string;
  explanation?: string[];
}): Promise<void> {
  try {
    await opts.db.prepare(
      `INSERT INTO billing_ledger (
         id, org_id, client_id, stripe_object_id, event_type, amount_cents, currency,
         service_type, service_record_id, decision, decision_id, status, explanation_json
       ) VALUES (?, ?, ?, ?, ?, ?, 'usd', ?, ?, ?, ?, ?, ?)`
    ).bind(
      opts.id, opts.orgId, opts.clientId || null, opts.stripeObjectId || null, opts.eventType,
      opts.amountCents ?? null, opts.serviceType || null, opts.serviceRecordId || null,
      opts.decision, opts.decisionId || null, opts.status || 'RECORDED',
      JSON.stringify(opts.explanation || []),
    ).run();
  } catch (e) {
    console.warn('[service-ledger] billing_ledger insert skipped', e);
  }
}

export async function assertCoveredChargeAllowed(opts: {
  db: D1Database;
  orgId: string;
  clientId: string;
  serviceType: string;
  salesChannel?: 'ONLINE' | 'TELEMARKETED' | 'IN_PERSON' | 'OTHER';
  contractSigned: boolean;
  croaDisclosuresAcknowledged: boolean;
  tsrApplies?: boolean;
  generateId: () => string;
}): Promise<{ allowed: boolean; eval: BillingEvalResult; decisionId: string; serviceRecordId: string | null }> {
  const covered = isCoveredCreditRepairService(opts.serviceType);
  const completed = covered ? await hasCompletedService(opts.db, opts.clientId, opts.orgId, opts.serviceType) : { yes: true, recordId: null };
  const evalResult = evaluateBillableEvent({
    serviceType: opts.serviceType,
    salesChannel: opts.salesChannel || 'ONLINE',
    contractSigned: opts.contractSigned,
    croaDisclosuresAcknowledged: opts.croaDisclosuresAcknowledged,
    serviceFullyPerformed: completed.yes,
    coveredCreditRepair: covered,
    tsrApplies: opts.tsrApplies,
  });
  const decisionId = opts.generateId();
  try {
    await opts.db.prepare(
      `INSERT INTO compliance_decisions (id, org_id, client_id, action_type, rules_evaluated_json, result, explanation_json, policy_version)
       VALUES (?, ?, ?, 'CHARGE_PAYMENT', ?, ?, ?, ?)`
    ).bind(
      decisionId, opts.orgId, opts.clientId,
      JSON.stringify(evalResult.requirements), evalResult.result,
      JSON.stringify(evalResult.explanation), evalResult.policyVersion || BILLING_POLICY_VERSION,
    ).run();
  } catch { /* soft */ }
  await writeBillingLedger({
    db: opts.db,
    id: opts.generateId(),
    orgId: opts.orgId,
    clientId: opts.clientId,
    eventType: 'CHARGE_ATTEMPT',
    serviceType: opts.serviceType,
    serviceRecordId: completed.recordId,
    decision: evalResult.result,
    decisionId,
    status: evalResult.result === 'ALLOW' ? 'CLEARED' : 'BLOCKED',
    explanation: evalResult.explanation,
  });
  return {
    allowed: evalResult.result === 'ALLOW',
    eval: evalResult,
    decisionId,
    serviceRecordId: completed.recordId,
  };
}
