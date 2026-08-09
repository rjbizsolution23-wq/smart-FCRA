/**
 * Shared per-bureau credit report import pipeline (MFSN, SmartCredit, demo).
 * Always runs live detect → fact-check (no mock violation invention).
 */
import type { CreditReportData } from '../engine/violations';
import { detectViolations, calculateLitigationScore } from '../engine/violations';
import { analyzeReportLive } from '../engine/violation-factcheck';
import { normalizeBureau, type BureauName } from '../engine/bureau-utils';

export type BureauImportResult = {
  reportId: string;
  bureau: string;
  violationsFound: number;
  rawDetectorHits: number;
  rejectedCount: number;
  reasoningSummary: string;
  litigationScore: ReturnType<typeof calculateLitigationScore>;
  mode: 'created' | 'replaced';
  analysisMode: 'live_rules_engine';
};

export async function importBureauReportsBatch(
  c: any,
  deps: {
    generateId: () => string;
    encryptPII: (c: any, text: string) => Promise<string>;
    backpopulateClientInfo: (c: any, clientId: string, personal: any, orgId: string) => Promise<void>;
    saveViolationsForReport: (c: any, orgId: string, reportId: string, clientId: string, violations: any[]) => Promise<void>;
    persistBureauScores: (c: any, opts: any) => Promise<void>;
    markPriorBureauReportsStale: (c: any, clientId: string, orgId: string, bureau: BureauName, exceptId?: string) => Promise<string | null>;
    refreshBureauPackStatus: (c: any, clientId: string, orgId: string) => Promise<any>;
    computeAndStoreFundability: (env: any, opts: any) => Promise<any>;
  },
  opts: {
    clientId: string;
    bureauReports: CreditReportData[];
    rawPayload: unknown;
    sourceProvider: string;
    sourcePayloadType: string;
    fileNamePrefix: string;
    activityAction?: string;
    activityDescription?: string;
    /** Public signup / system imports — overrides session user */
    actingUser?: { id: string; org_id: string };
  },
): Promise<{
  results: BureauImportResult[];
  totalViolations: number;
  bureauPack: any;
  fundability: any;
}> {
  const user = opts.actingUser || c.get('user');
  if (!user?.org_id) throw new Error('bureau-import requires authenticated or acting user');
  const { clientId, bureauReports, rawPayload, sourceProvider, sourcePayloadType, fileNamePrefix } = opts;

  if (bureauReports.length > 0) {
    await deps.backpopulateClientInfo(c, clientId, bureauReports[0].personalInfo, user.org_id);
  }

  const encryptedRaw = await deps.encryptPII(c, JSON.stringify(rawPayload));
  const results: BureauImportResult[] = [];
  let totalViolations = 0;

  for (const report of bureauReports) {
    const bureau = normalizeBureau(report.bureau);
    const analysis = analyzeReportLive(report, detectViolations);
    const violations = analysis.violations;
    const litScore = calculateLitigationScore(violations);
    totalViolations += violations.length;

    let reportId = deps.generateId();
    let mode: 'created' | 'replaced' = 'created';

    if (bureau !== 'Unknown') {
      const existing = await c.env.DB.prepare(
        `SELECT id FROM credit_reports WHERE client_id = ? AND org_id = ? AND bureau = ? AND COALESCE(is_current, 1) = 1
         ORDER BY created_at DESC LIMIT 1`
      ).bind(clientId, user.org_id, bureau).first() as any;

      if (existing?.id) {
        reportId = existing.id;
        mode = 'replaced';
        await c.env.DB.prepare(
          `UPDATE credit_reports SET uploaded_by = ?, bureau = ?, report_date = ?, file_name = ?, raw_text = ?, parsed_data = ?,
           status = 'analyzed', total_accounts = ?, total_inquiries = ?, total_public_records = ?, total_collections = ?,
           analysis_started_at = datetime('now'), analysis_completed_at = datetime('now')
           WHERE id = ? AND org_id = ?`
        ).bind(
          user.id, bureau, report.reportDate, `${fileNamePrefix}-${bureau}.json`, encryptedRaw,
          await deps.encryptPII(c, JSON.stringify(report)),
          report.accounts.length, report.inquiries.length, report.publicRecords.length, report.collections.length,
          reportId, user.org_id,
        ).run();
      }
    }

    if (mode === 'created') {
      if (bureau !== 'Unknown') {
        await deps.markPriorBureauReportsStale(c, clientId, user.org_id, bureau, reportId);
      }
      await c.env.DB.prepare(
        `INSERT INTO credit_reports (id, org_id, client_id, uploaded_by, bureau, report_date, file_name, raw_text, parsed_data, status,
         total_accounts, total_inquiries, total_public_records, total_collections, analysis_started_at, analysis_completed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'analyzed', ?, ?, ?, ?, datetime('now'), datetime('now'))`
      ).bind(
        reportId, user.org_id, clientId, user.id, bureau, report.reportDate,
        `${fileNamePrefix}-${bureau}.json`, encryptedRaw,
        await deps.encryptPII(c, JSON.stringify(report)),
        report.accounts.length, report.inquiries.length, report.publicRecords.length, report.collections.length,
      ).run();
      try {
        await c.env.DB.prepare(`UPDATE credit_reports SET is_current = 1 WHERE id = ? AND org_id = ?`)
          .bind(reportId, user.org_id).run();
      } catch { /* soft */ }
    }

    await deps.saveViolationsForReport(c, user.org_id, reportId, clientId, violations);
    await deps.persistBureauScores(c, {
      reportId,
      clientId,
      orgId: user.org_id,
      bureau,
      parsed: report,
      sourceProvider,
      sourcePayloadType,
    });

    results.push({
      reportId,
      bureau,
      violationsFound: violations.length,
      rawDetectorHits: analysis.rawCount,
      rejectedCount: analysis.rejectedCount,
      reasoningSummary: analysis.reasoningSummary,
      litigationScore: litScore,
      mode,
      analysisMode: 'live_rules_engine',
    });
  }

  const bureauPack = await deps.refreshBureauPackStatus(c, clientId, user.org_id);

  let fundability = null;
  try {
    const cl = await c.env.DB.prepare('SELECT * FROM clients WHERE id = ? AND org_id = ?').bind(clientId, user.org_id).first();
    const latest = bureauReports[bureauReports.length - 1] || bureauReports[0];
    fundability = await deps.computeAndStoreFundability(c.env, {
      orgId: user.org_id,
      clientId,
      client: cl,
      reportMeta: latest ? {
        accounts: latest.accounts.length,
        collections: latest.collections.length,
        inquiries: latest.inquiries.length,
        parsedAccounts: [...latest.accounts, ...latest.collections],
      } : null,
      violationCount: totalViolations,
    });
  } catch (e) {
    console.warn('[bureau-import] fundability skipped', e);
  }

  if (opts.activityAction) {
    await c.env.DB.prepare(
      'INSERT INTO activity_log (id, org_id, client_id, user_id, action, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      deps.generateId(), user.org_id, clientId, user.id, opts.activityAction,
      opts.activityDescription || `Imported ${bureauReports.length} bureau report(s)`,
      JSON.stringify({ totalViolations, bureaus: results.map((r) => r.bureau) }),
    ).run();
  }

  return { results, totalViolations, bureauPack, fundability };
}
