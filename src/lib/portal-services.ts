/**
 * Client portal helpers — welcome email, fundability persistence, base URL.
 */
import type { EmailEnv } from './email';
import { sendTemplatedClientMessage } from './email-templates';
import { buildFundabilityReport, type FundabilityInput } from '../data/fundability-engine';
import { computeRevolvingUtilization } from '../engine/parser';
import type { ParsedAccount } from '../engine/violations';
import { recommendTradelines } from '../data/portal-education';

export type PortalEnv = EmailEnv & {
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
  DB: D1Database;
  COMPANY_NAME?: string;
  COMPANY_OWNER?: string;
  COMPANY_EMAIL?: string;
  COMPANY_LOGO?: string;
  COMPANY_ADDRESS?: string;
  COMPANY_WEBSITE?: string;
};

export function portalBaseUrl(env: PortalEnv, requestUrl?: string): string {
  const configured = String(env.FRONTEND_URL || env.APP_BASE_URL || '').trim().replace(/\/$/, '');
  if (configured) return configured;
  try {
    if (requestUrl) {
      const u = new URL(requestUrl);
      return `${u.protocol}//${u.host}`;
    }
  } catch {
    /* ignore */
  }
  return 'https://smart-fcra-v2.pages.dev';
}

export function isSyntheticPortalEmail(email: string | null | undefined): boolean {
  if (!email) return true;
  const e = email.toLowerCase();
  return e.endsWith('@smart-fcra.com') || e.endsWith('@smartfcra.local') || e.includes('.noreply@');
}

export async function sendPortalWelcomeEmail(
  env: PortalEnv,
  opts: {
    to: string;
    clientName: string;
    email: string;
    temporaryPassword: string;
    requestUrl?: string;
    orgId?: string;
    clientId?: string;
  },
): Promise<{
  ok: boolean;
  simulated?: boolean;
  provider?: string;
  error?: string;
  loginUrl: string;
  deliveryStatus?: string;
}> {
  const base = portalBaseUrl(env, opts.requestUrl);
  const loginUrl = `${base}/`;
  try {
    const result = await sendTemplatedClientMessage(env as any, {
      templateId: 'portal_welcome',
      orgId: opts.orgId || 'system',
      clientId: opts.clientId || 'portal-invite',
      email: opts.to,
      notifyEmail: true,
      notifySms: false,
      skipClientAlert: !opts.clientId,
      vars: {
        clientName: opts.clientName,
        email: opts.email,
        temporaryPassword: opts.temporaryPassword,
        loginUrl,
        portalUrl: loginUrl,
      },
    });
    const status = result.deliveryStatus || result.channels?.email || 'unknown';
    return {
      ok: !!result.ok || status === 'sent' || status === 'simulated',
      simulated: status === 'simulated' || !!result.channels?.simulated,
      provider: result.channels?.provider,
      deliveryStatus: status,
      loginUrl,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'email failed', loginUrl };
  }
}

export async function computeAndStoreFundability(
  env: PortalEnv,
  opts: {
    orgId: string;
    clientId: string;
    client?: Record<string, unknown> | null;
    reportMeta?: { accounts?: number; collections?: number; inquiries?: number; parsedAccounts?: ParsedAccount[] } | null;
    violationCount?: number;
    goal?: string;
    monthlyIncome?: number | null;
    monthlyDebt?: number | null;
  },
): Promise<ReturnType<typeof buildFundabilityReport>> {
  const c = opts.client || {};
  const income =
    opts.monthlyIncome ??
    (c.estimated_monthly_income != null ? Number(c.estimated_monthly_income) : null);
  const debt =
    opts.monthlyDebt ??
    (c.estimated_monthly_debt != null ? Number(c.estimated_monthly_debt) : null);

  let revolvingUtilPct: number | null = null;
  let openRevolvingBalance: number | undefined;
  let openRevolvingLimit: number | undefined;
  if (opts.reportMeta?.parsedAccounts?.length) {
    const util = computeRevolvingUtilization(opts.reportMeta.parsedAccounts);
    revolvingUtilPct = util.utilPct;
    openRevolvingBalance = util.totalBalance;
    openRevolvingLimit = util.totalLimit;
  }

  const input: FundabilityInput = {
    eqScore: Number(c.eq_score) || null,
    exScore: Number(c.ex_score) || null,
    tuScore: Number(c.tu_score) || null,
    accounts: opts.reportMeta?.accounts || 0,
    collections: opts.reportMeta?.collections || 0,
    inquiries: opts.reportMeta?.inquiries || 0,
    violations: opts.violationCount || 0,
    revolvingUtilPct,
    openRevolvingBalance,
    openRevolvingLimit,
    estimatedIncomeMonthly: income && income > 0 ? income : undefined,
    estimatedDebtPayments: debt != null && debt >= 0 ? debt : undefined,
    goal: opts.goal,
  };

  const report = buildFundabilityReport(input);

  try {
    await env.DB.prepare(
      `INSERT INTO fundability_snapshots
        (id, org_id, client_id, overall_score, mortgage_ready, auto_ready, student_ready, debt_health, report_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        crypto.randomUUID(),
        opts.orgId,
        opts.clientId,
        report.overallScore,
        report.pillars.mortgageReady,
        report.pillars.autoReady,
        report.pillars.studentReady,
        report.pillars.debtHealth,
        JSON.stringify(report),
      )
      .run();
  } catch (e) {
    console.warn('[fundability] snapshot store skipped', e);
  }

  return report;
}

export function tradelineRecsForClient(profile: {
  avgScore: number;
  accountCount: number;
  collectionCount: number;
  goal?: string;
}) {
  return recommendTradelines(profile);
}
