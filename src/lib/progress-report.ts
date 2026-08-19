/**
 * Monthly client progress report — auto-email after 2nd+ report import.
 */
import { tallyResultTaxonomy } from '../engine/credit-events';
import { generatePDFFromText } from '../engine/pdf-generator';

export type ProgressSummary = {
  periodKey: string;
  clientName: string;
  reportCount: number;
  eventsSummary: Record<string, number>;
  scores: { eq?: number; ex?: number; tu?: number };
  openDisputes: number;
  clocksOpen: number;
  disclaimer: string;
};

export async function buildClientProgressSummary(opts: {
  db: D1Database;
  orgId: string;
  clientId: string;
}): Promise<ProgressSummary | null> {
  const client = await opts.db.prepare(
    'SELECT * FROM clients WHERE id = ? AND org_id = ?',
  ).bind(opts.clientId, opts.orgId).first() as any;
  if (!client) return null;

  const reportCount = await opts.db.prepare(
    'SELECT COUNT(*) as c FROM credit_reports WHERE client_id = ? AND org_id = ?',
  ).bind(opts.clientId, opts.orgId).first() as any;
  if (Number(reportCount?.c || 0) < 2) return null;

  const events = await opts.db.prepare(
    `SELECT taxonomy FROM credit_events WHERE client_id = ? AND org_id = ?
     AND created_at >= datetime('now', '-35 days')`,
  ).bind(opts.clientId, opts.orgId).all();
  const eventsSummary = tallyResultTaxonomy(((events as any).results || []).map((r: any) => r.taxonomy));

  const openDisputes = await opts.db.prepare(
    `SELECT COUNT(*) as c FROM portal_disputes WHERE client_id = ? AND org_id = ? AND status NOT IN ('CLOSED','RESOLVED')`,
  ).bind(opts.clientId, opts.orgId).first() as any;

  const clocks = await opts.db.prepare(
    `SELECT COUNT(*) as c FROM investigation_clocks WHERE client_id = ? AND org_id = ? AND status = 'open'`,
  ).bind(opts.clientId, opts.orgId).first() as any;

  const periodKey = new Date().toISOString().slice(0, 7);

  return {
    periodKey,
    clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    reportCount: Number(reportCount.c),
    eventsSummary,
    scores: { eq: client.eq_score, ex: client.ex_score, tu: client.tu_score },
    openDisputes: Number(openDisputes?.c || 0),
    clocksOpen: Number(clocks?.c || 0),
    disclaimer: 'This progress summary describes changes observed in your credit file data. It is not a guarantee of score improvement, deletions, or legal outcomes.',
  };
}

export function progressReportPlainText(summary: ProgressSummary, orgName: string): string {
  const lines = [
    `${orgName} — Monthly Credit File Progress`,
    `Period: ${summary.periodKey}`,
    `Client: ${summary.clientName}`,
    '',
    'Score snapshot (named models on file):',
    `  Equifax: ${summary.scores.eq ?? '—'}`,
    `  Experian: ${summary.scores.ex ?? '—'}`,
    `  TransUnion: ${summary.scores.tu ?? '—'}`,
    '',
    `Reports on file: ${summary.reportCount}`,
    'Measured changes (last ~35 days):',
    ...Object.entries(summary.eventsSummary).map(([k, v]) => `  ${k}: ${v}`),
    '',
    `Open disputes: ${summary.openDisputes}`,
    `Open investigation clocks: ${summary.clocksOpen}`,
    '',
    summary.disclaimer,
  ];
  return lines.join('\n');
}

export async function generateProgressReportPdf(summary: ProgressSummary, orgName: string): Promise<Uint8Array> {
  return generatePDFFromText(`${orgName} Progress Report`, progressReportPlainText(summary, orgName));
}

export async function runMonthlyProgressReports(opts: {
  db: D1Database;
  orgId?: string;
  sendEmail: (args: { orgId: string; clientId: string; email: string; subject: string; body: string; pdf?: Uint8Array }) => Promise<void>;
}): Promise<{ processed: number; emailed: number }> {
  let sql = `SELECT DISTINCT c.id, c.org_id, c.email, c.first_name, c.last_name, c.last_progress_report_at
    FROM clients c
    JOIN credit_reports cr ON cr.client_id = c.id
    WHERE c.status = 'active' AND c.notify_email = 1`;
  const binds: string[] = [];
  if (opts.orgId) { sql += ' AND c.org_id = ?'; binds.push(opts.orgId); }
  sql += ` GROUP BY c.id HAVING COUNT(cr.id) >= 2`;

  const clients = await opts.db.prepare(sql).bind(...binds).all();
  let processed = 0;
  let emailed = 0;
  const periodKey = new Date().toISOString().slice(0, 7);

  for (const row of ((clients as any).results || []) as any[]) {
    if (row.last_progress_report_at?.startsWith(periodKey)) continue;
    const summary = await buildClientProgressSummary({ db: opts.db, orgId: row.org_id, clientId: row.id });
    if (!summary) continue;
    processed += 1;

    const org = await opts.db.prepare('SELECT name FROM organizations WHERE id = ?').bind(row.org_id).first() as any;
    const orgName = org?.name || 'Smart FCRA';
    const body = progressReportPlainText(summary, orgName);
    const email = row.email;
    if (!email || String(email).includes('@smartfcra.local')) continue;

    try {
      const pdf = await generateProgressReportPdf(summary, orgName);
      await opts.sendEmail({
        orgId: row.org_id,
        clientId: row.id,
        email,
        subject: `${orgName} — Your monthly credit file progress`,
        body,
        pdf,
      });
      await opts.db.prepare(
        `INSERT INTO client_progress_reports (id, org_id, client_id, period_key, summary_json, emailed)
         VALUES (?, ?, ?, ?, ?, 1)`,
      ).bind(crypto.randomUUID(), row.org_id, row.id, periodKey, JSON.stringify(summary)).run();
      await opts.db.prepare(
        'UPDATE clients SET last_progress_report_at = datetime(\'now\') WHERE id = ?',
      ).bind(row.id).run();
      emailed += 1;
    } catch { /* soft per client */ }
  }

  return { processed, emailed };
}
