/**
 * Client portal helpers — welcome email, fundability persistence, base URL.
 */
import type { EmailEnv } from './email';
import { sendAppEmail } from './email';
import { buildFundabilityReport, type FundabilityInput } from '../data/fundability-engine';
import { computeRevolvingUtilization } from '../engine/parser';
import type { ParsedAccount } from '../engine/violations';
import { recommendTradelines } from '../data/portal-education';

export type PortalEnv = EmailEnv & {
  FRONTEND_URL?: string;
  APP_BASE_URL?: string;
  DB: D1Database;
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

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  },
): Promise<{ ok: boolean; simulated?: boolean; provider?: string; error?: string; loginUrl: string }> {
  const base = portalBaseUrl(env, opts.requestUrl);
  const loginUrl = `${base}/`;
  const subject = `Your Smart FCRA client portal is ready — ${opts.clientName}`;
  const text = [
    `Hi ${opts.clientName},`,
    '',
    'Welcome to Smart FCRA. Your personal client portal is live.',
    '',
    `Login: ${loginUrl}`,
    `Email: ${opts.email}`,
    `Temporary password: ${opts.temporaryPassword}`,
    '',
    'Please sign in and change your password after first login.',
    'Inside your portal you can message your credit team, view fundability roadmaps,',
    'upload documents & creditor replies, use your personal finance tutor,',
    'and explore literacy resources plus profile-smart tradeline options.',
    '',
    '— Smart FCRA · Rick Jefferson Solutions',
  ].join('\n');

  const html = `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;background:#0b1220;color:#e2e8f0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#111827;border:1px solid #1e293b;border-radius:12px;padding:28px">
    <h1 style="color:#38bdf8;margin:0 0 8px;font-size:22px">Smart FCRA</h1>
    <p style="color:#94a3b8;margin:0 0 20px">Your client portal is ready</p>
    <p>Hi <strong>${escapeHtml(opts.clientName)}</strong>,</p>
    <p>Your personal portal is live — messaging, reports, fundability roadmaps, document vault, and your AI finance tutor.</p>
    <p style="background:#0f172a;padding:14px;border-radius:8px;font-size:14px">
      <strong>Login:</strong> <a href="${escapeHtml(loginUrl)}" style="color:#38bdf8">${escapeHtml(loginUrl)}</a><br/>
      <strong>Email:</strong> ${escapeHtml(opts.email)}<br/>
      <strong>Temporary password:</strong> <code style="color:#fbbf24">${escapeHtml(opts.temporaryPassword)}</code>
    </p>
    <p style="font-size:13px;color:#94a3b8">Change your password after first login. Never share credentials.</p>
    <p style="margin-top:24px;font-size:12px;color:#64748b">Rick Jefferson Solutions · Smart FCRA</p>
  </div></body></html>`;

  try {
    const result = await sendAppEmail(env, {
      to: opts.to,
      subject,
      html,
      text,
      purpose: 'onboarding',
    });
    return {
      ok: result.sent || result.simulated,
      simulated: result.simulated,
      provider: result.provider,
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
