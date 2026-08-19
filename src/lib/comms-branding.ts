/**
 * Org-branded email + SMS helpers — consistent identity across workflows, campaigns, alerts.
 */
import { sendAppEmail, type EmailEnv } from './email';
import { loadOrgBrand, brandVars } from './org-branding';
import { brandedShell } from './email-templates';

function esc(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatBrandedSms(body: string, brandName?: string): string {
  const prefix = brandName ? `[${brandName.slice(0, 24)}] ` : '';
  const footer = ' Reply STOP to opt out.';
  const core = `${prefix}${body}`.trim();
  const max = 1500 - footer.length;
  return core.slice(0, max) + footer;
}

export async function sendBrandedOrgEmail(opts: {
  env: EmailEnv & { DB?: D1Database };
  orgId: string;
  to: string;
  subject: string;
  bodyText: string;
  title?: string;
}): Promise<{ sent: boolean; simulated?: boolean; provider?: string; error?: string }> {
  if (!opts.env.DB) {
    return sendAppEmail(opts.env, { to: opts.to, subject: opts.subject, text: opts.bodyText });
  }
  const brand = await loadOrgBrand(opts.env as any, opts.orgId);
  const vars = brandVars(brand);
  const title = opts.title || opts.subject;
  const bodyHtml = esc(opts.bodyText).replace(/\n/g, '<br/>');
  const html = brandedShell(title, bodyHtml, vars);
  return sendAppEmail(opts.env, {
    to: opts.to,
    subject: opts.subject,
    html,
    text: opts.bodyText,
    fromName: brand.name || vars.brandName,
    purpose: 'noreply',
  });
}
