/**
 * Persist tradeline snapshots + credit events from a parsed report (digital twin).
 * Never overwrites prior snapshots.
 */
import { generateId } from './auth';
import {
  diffTradelineSnapshots,
  maskAccountNumber,
  tradelineAccountKey,
  type TradelineSnapshot,
} from '../engine/credit-events';
import { detectCrossBureauVariances, type BureauFieldRow } from '../engine/metro2-findings';
import type { CreditReportData } from '../engine/violations';

function toSnapshots(bureau: string, parsed: CreditReportData): TradelineSnapshot[] {
  const rows = [...(parsed.accounts || []), ...(parsed.collections || [])];
  return rows.map((a) => ({
    accountKey: tradelineAccountKey(bureau, a.creditorName, a.accountNumber),
    bureau,
    furnisherName: a.creditorName || 'Unknown',
    accountNumberMasked: maskAccountNumber(a.accountNumber),
    accountType: a.accountType,
    accountStatus: a.accountStatus,
    balance: a.currentBalance ?? null,
    creditLimit: a.creditLimit ?? null,
    pastDue: (a as any).pastDue ?? null,
    paymentStatus: a.paymentStatus,
    remarks: String((a as any).remarks || a.comments || ''),
    dateOpened: a.dateOpened,
    dateClosed: a.dateClosed,
    dateReported: a.dateReported,
    paymentHistory: a.paymentHistory,
  }));
}

export async function persistCreditTwinFromParsed(
  db: any,
  opts: {
    orgId: string;
    clientId: string;
    reportId: string;
    bureau: string;
    parsed: CreditReportData;
  },
): Promise<{ snapshots: number; events: number; findings: number }> {
  const current = toSnapshots(opts.bureau, opts.parsed);
  let prevRows: any[] = [];
  try {
    const prior = await db.prepare(
      `SELECT account_key, bureau, furnisher_name, account_number_masked, account_type, account_status,
              balance, credit_limit, past_due, payment_status, remarks, date_opened, date_closed, date_reported, payment_history
       FROM tradeline_snapshots
       WHERE client_id = ? AND org_id = ? AND bureau = ? AND report_id != ?
       AND created_at = (
         SELECT MAX(created_at) FROM tradeline_snapshots s2
         WHERE s2.client_id = tradeline_snapshots.client_id AND s2.org_id = tradeline_snapshots.org_id
           AND s2.bureau = tradeline_snapshots.bureau AND s2.account_key = tradeline_snapshots.account_key
           AND s2.report_id != ?
       )`
    ).bind(opts.clientId, opts.orgId, opts.bureau, opts.reportId, opts.reportId).all();
    prevRows = prior?.results || [];
  } catch {
    try {
      const fallback = await db.prepare(
        `SELECT account_key, bureau, furnisher_name, account_number_masked, account_type, account_status,
                balance, credit_limit, past_due, payment_status, remarks, date_opened, date_closed, date_reported, payment_history
         FROM tradeline_snapshots WHERE client_id = ? AND org_id = ? AND bureau = ? AND report_id != ?
         ORDER BY created_at DESC LIMIT 400`
      ).bind(opts.clientId, opts.orgId, opts.bureau, opts.reportId).all();
      const seen = new Set<string>();
      for (const r of fallback?.results || []) {
        if (seen.has(r.account_key)) continue;
        seen.add(r.account_key);
        prevRows.push(r);
      }
    } catch { /* table may not exist yet */ }
  }

  const previous: TradelineSnapshot[] = prevRows.map((r: any) => ({
    accountKey: r.account_key,
    bureau: r.bureau,
    furnisherName: r.furnisher_name,
    accountNumberMasked: r.account_number_masked,
    accountType: r.account_type,
    accountStatus: r.account_status,
    balance: r.balance,
    creditLimit: r.credit_limit,
    pastDue: r.past_due,
    paymentStatus: r.payment_status,
    remarks: r.remarks,
    dateOpened: r.date_opened,
    dateClosed: r.date_closed,
    dateReported: r.date_reported,
    paymentHistory: r.payment_history,
  }));

  const events = previous.length ? diffTradelineSnapshots(previous, current) : [];

  for (const s of current) {
    try {
      await db.prepare(
        `INSERT INTO tradeline_snapshots (
           id, org_id, client_id, report_id, account_key, bureau, furnisher_name, account_number_masked,
           account_type, account_status, balance, credit_limit, past_due, payment_status, remarks,
           date_opened, date_closed, date_reported, payment_history, raw_json
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        generateId(), opts.orgId, opts.clientId, opts.reportId, s.accountKey, s.bureau, s.furnisherName,
        s.accountNumberMasked || null, s.accountType || null, s.accountStatus || null,
        s.balance, s.creditLimit, s.pastDue, s.paymentStatus || null, s.remarks || null,
        s.dateOpened || null, s.dateClosed || null, s.dateReported || null, s.paymentHistory || null,
        JSON.stringify(s),
      ).run();
    } catch { /* soft */ }
  }

  for (const e of events) {
    try {
      await db.prepare(
        `INSERT INTO credit_events (
           id, org_id, client_id, report_id, account_key, bureau, event_type, field, previous_value, new_value, taxonomy
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        generateId(), opts.orgId, opts.clientId, opts.reportId, e.accountKey, e.bureau,
        e.eventType, e.field, e.previousValue == null ? null : String(e.previousValue),
        e.newValue == null ? null : String(e.newValue), e.taxonomy,
      ).run();
    } catch { /* soft */ }
  }

  let findings = 0;
  try {
    const allSnap = await db.prepare(
      `SELECT id, bureau, furnisher_name, account_key, balance, account_status, date_opened, past_due, credit_limit
       FROM tradeline_snapshots WHERE client_id = ? AND org_id = ? AND report_id IN (
         SELECT id FROM credit_reports WHERE client_id = ? AND org_id = ? AND COALESCE(is_current,1) = 1
       )`
    ).bind(opts.clientId, opts.orgId, opts.clientId, opts.orgId).all();
    const rows: BureauFieldRow[] = (allSnap?.results || []).map((r: any) => ({
      tradelineId: r.id,
      bureau: r.bureau,
      furnisherName: r.furnisher_name,
      accountKey: r.account_key,
      balance: r.balance,
      accountStatus: r.account_status,
      dateOpened: r.date_opened,
      pastDue: r.past_due,
      creditLimit: r.credit_limit,
    }));
    const detected = detectCrossBureauVariances(rows);
    for (const f of detected) {
      await db.prepare(
        `INSERT INTO case_findings (
           id, org_id, client_id, finding_type, field, severity, source_accounts_json, values_json,
           requires_consumer_confirmation, note
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        generateId(), opts.orgId, opts.clientId, f.findingType, f.field, f.severity,
        JSON.stringify(f.sourceAccounts), JSON.stringify(f.values),
        f.requiresConsumerConfirmation ? 1 : 0, f.note,
      ).run();
      findings += 1;
    }
  } catch { /* soft */ }

  return { snapshots: current.length, events: events.length, findings };
}
