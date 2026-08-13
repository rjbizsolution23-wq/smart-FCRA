/**
 * FCRA § 611 (15 U.S.C. § 1681i) investigation clocks.
 * Statutory target is 30 days from mailing/receipt. Operational target adds a
 * 5-day mail-transit buffer (35 days) used by existing reminder jobs.
 * A CRA may take 15 extra days in limited cases — exception_possible=1.
 */

export const FCRA_611_DAYS = 30;
export const MAIL_TRANSIT_BUFFER_DAYS = 5;
export const FCRA_611_OPERATIONAL_DAYS = FCRA_611_DAYS + MAIL_TRANSIT_BUFFER_DAYS; // 35
export const FCRA_611_EXCEPTION_DAYS = 15;

export const CRA_MAILING_ADDRESSES: Record<string, string> = {
  equifax: 'Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374',
  experian: 'Experian Information Solutions, Inc.\nP.O. Box 4500\nAllen, TX 75013',
  transunion: 'TransUnion LLC\nP.O. Box 2000\nChester, PA 19016',
};

export type MailingAddress = {
  name: string;
  address1: string;
  city: string;
  state: string;
  zip: string;
  block: string;
};

export function addUtcDays(from: Date, days: number): Date {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function computeFcra611Clock(mailingDate: Date | string = new Date()) {
  const mailed = typeof mailingDate === 'string' ? new Date(mailingDate) : mailingDate;
  const statutory = addUtcDays(mailed, FCRA_611_DAYS);
  const operational = addUtcDays(mailed, FCRA_611_OPERATIONAL_DAYS);
  const exception = addUtcDays(mailed, FCRA_611_DAYS + FCRA_611_EXCEPTION_DAYS);
  return {
    mailingDate: isoDate(mailed),
    statutoryTarget: isoDate(statutory),
    operationalTarget: isoDate(operational),
    exceptionTarget: isoDate(exception),
    deadlineType: 'FCRA_611',
    ruleBasis: '15 U.S.C. § 1681i(a)(1)(A) — 30 days from receipt; 15-day extension possible',
    exceptionPossible: 1 as const,
  };
}

export function parseMailingAddress(block: string): MailingAddress {
  const lines = String(block || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const name = lines[0] || '';
  const last = lines[lines.length - 1] || '';
  const m = last.match(/^(.+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  const address1 = lines.length >= 3 ? lines.slice(1, -1).join(', ') : (m ? (lines[1] || '') : (lines[1] || ''));
  return {
    name,
    address1,
    city: m ? m[1] : '',
    state: m ? m[2].toUpperCase() : '',
    zip: m ? m[3] : '',
    block: lines.join('\n'),
  };
}

export function craAddressForRecipient(recipient: string | null | undefined): MailingAddress {
  const key = String(recipient || '').toLowerCase().replace(/\s+/g, '');
  let block = CRA_MAILING_ADDRESSES.experian;
  if (key.includes('equifax') || key === 'eq' || key === 'efx') block = CRA_MAILING_ADDRESSES.equifax;
  else if (key.includes('transunion') || key === 'tu' || key === 'trans') block = CRA_MAILING_ADDRESSES.transunion;
  else if (key.includes('experian') || key === 'ex' || key === 'exp') block = CRA_MAILING_ADDRESSES.experian;
  return parseMailingAddress(block);
}

export async function persistInvestigationClock(opts: {
  db: D1Database;
  id: string;
  orgId: string;
  clientId: string;
  disputeId?: string | null;
  documentId?: string | null;
  mailingDate?: Date | string;
}): Promise<{ clockId: string; statutoryTarget: string; operationalTarget: string }> {
  const clock = computeFcra611Clock(opts.mailingDate);
  try {
    await opts.db.prepare(
      `INSERT INTO investigation_clocks (
         id, org_id, client_id, dispute_id, received_date, calculated_target_date, deadline_type, rule_basis,
         exception_possible, document_id, mailing_date, operational_target_date, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, 'OPEN')`
    ).bind(
      opts.id, opts.orgId, opts.clientId, opts.disputeId || null,
      clock.mailingDate, clock.statutoryTarget, clock.deadlineType, clock.ruleBasis,
      opts.documentId || null, clock.mailingDate, clock.operationalTarget,
    ).run();
  } catch (e) {
    console.warn('[investigation-clock] insert skipped', e);
  }
  if (opts.documentId) {
    try {
      await opts.db.prepare(
        `UPDATE documents SET response_due_date = ?, investigation_clock_id = ?, sent_date = COALESCE(sent_date, ?) WHERE id = ? AND org_id = ?`
      ).bind(clock.operationalTarget, opts.id, clock.mailingDate, opts.documentId, opts.orgId).run();
    } catch { /* soft */ }
  }
  return { clockId: opts.id, statutoryTarget: clock.statutoryTarget, operationalTarget: clock.operationalTarget, mailingDate: clock.mailingDate };
}

export async function closeInvestigationClock(db: D1Database, opts: {
  documentId?: string;
  disputeId?: string;
  orgId: string;
  responseDate?: string;
}): Promise<void> {
  const when = opts.responseDate || isoDate(new Date());
  try {
    if (opts.documentId) {
      await db.prepare(
        `UPDATE investigation_clocks SET actual_response_date = ?, status = 'RESPONDED' WHERE document_id = ? AND org_id = ? AND actual_response_date IS NULL`
      ).bind(when, opts.documentId, opts.orgId).run();
    }
    if (opts.disputeId) {
      await db.prepare(
        `UPDATE investigation_clocks SET actual_response_date = ?, status = 'RESPONDED' WHERE dispute_id = ? AND org_id = ? AND actual_response_date IS NULL`
      ).bind(when, opts.disputeId, opts.orgId).run();
    }
  } catch { /* soft */ }
}
