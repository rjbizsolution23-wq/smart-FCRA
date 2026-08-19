/**
 * Email / alert template catalog — org-branded, deterministic copy.
 */
import { sendAppEmail, type EmailEnv } from './email';
import { dispatchClientAlert, type AlertEnv } from './alerts';
import { loadOrgBrand, brandVars, type OrgBrand } from './org-branding';
import { canSendMessage, logCommunicationAttempt, type CommsLane } from './comms-compliance';

export type TemplateId =
  | 'account_verify'
  | 'password_reset'
  | 'portal_welcome'
  | 'report_analyzed'
  | 'violations_ready'
  | 'dispute_letters_ready'
  | 'dispute_mailed'
  | 'bureau_response_recorded'
  | 'daily_morning_ritual'
  | 'staff_message'
  | 'tradeline_confirmed'
  | 'journey_checkin_nudge'
  | 'fundability_update'
  | 'contract_ready'
  | 'video_conference_invite'
  | 'ron_session_update'
  | 'onboarding_day1'
  | 'onboarding_day3'
  | 'unsigned_contract_nudge'
  | 'dispute_due_reminder'
  | 'admin_daily_digest'
  | 'team_invite'
  | 'inactive_reengage'
  | 'weekly_owner_report'
  | 'client_newsletter'
  | 'privacy_sla_alert'
  | 'bureau_followup_staff'
  | 'ops_health_alert';

export type EmailTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  eventType: string;
  lane?: CommsLane;
  subject: (vars: Record<string, string>) => string;
  html: (vars: Record<string, string>) => string;
  text: (vars: Record<string, string>) => string;
};

const MARKETING_TEMPLATES = new Set<TemplateId>(['client_newsletter', 'inactive_reengage', 'onboarding_day1', 'onboarding_day3']);

export function templateLane(id: TemplateId): CommsLane {
  const tpl = EMAIL_TEMPLATES.find((t) => t.id === id);
  if (tpl?.lane) return tpl.lane;
  if (MARKETING_TEMPLATES.has(id)) return 'marketing';
  if (id === 'privacy_sla_alert') return 'compliance';
  return 'transactional';
}

function esc(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Branded HTML shell — company identity from vars (brandName / brandOwner). */
export function brandedShell(title: string, bodyHtml: string, vars: Record<string, string> = {}): string {
  const brand = vars.brandName || 'Smart FCRA';
  const owner = vars.brandOwner || brand;
  const logo = vars.brandLogo
    ? `<img src="${esc(vars.brandLogo)}" alt="${esc(brand)}" style="max-height:40px;margin-bottom:12px" />`
    : '';
  const footerBits = [owner, vars.brandAddress, vars.brandEmail].filter(Boolean).join(' · ');
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0b1220;color:#e2e8f0">
  ${logo}
  <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#22d3ee;margin-bottom:8px">${esc(brand)}</div>
  <h1 style="font-size:22px;color:#fff;margin:0 0 12px">${esc(title)}</h1>
  <div style="font-size:14px;line-height:1.6;color:#cbd5e1">${bodyHtml}</div>
  <p style="margin-top:24px;font-size:11px;color:#64748b">${esc(footerBits || `${owner} · Secure client communications`)}</p>
</div>`;
}

function shell(title: string, bodyHtml: string, vars: Record<string, string> = {}): string {
  return brandedShell(title, bodyHtml, vars);
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'account_verify',
    name: 'Account verification',
    description: 'Email verification link after registration',
    eventType: 'account_verify',
    subject: (v) => `Verify your ${v.brandName || 'Smart FCRA'} account`,
    html: (v) => shell('Verify your account', `<p>Hi ${esc(v.name || 'there')},</p><p>Confirm your email to activate your account with ${esc(v.brandName || 'us')}.</p><p><a href="${esc(v.verifyUrl || '#')}" style="color:#22d3ee">Verify email</a></p>`, v),
    text: (v) => `Verify your account: ${v.verifyUrl || ''}`,
  },
  {
    id: 'password_reset',
    name: 'Password reset',
    description: 'Forgot-password reset link',
    eventType: 'password_reset',
    subject: (v) => `Reset your ${v.brandName || 'Smart FCRA'} password`,
    html: (v) => shell('Reset password', `<p>Hi ${esc(v.name || '')},</p><p>Use this link to choose a new password (expires in 1 hour):</p><p><a href="${esc(v.resetUrl || '#')}" style="color:#22d3ee">Reset password</a></p>`, v),
    text: (v) => `Reset password: ${v.resetUrl || ''}`,
  },
  {
    id: 'portal_welcome',
    name: 'Portal welcome',
    description: 'Client portal invite with temporary password',
    eventType: 'portal_welcome',
    subject: (v) => `Welcome to your ${v.brandName || 'client'} portal, ${v.clientName || 'client'}`,
    html: (v) => shell('Your portal is ready', `<p>Hi ${esc(v.clientName || '')},</p><p>Your secure client portal with ${esc(v.brandName || 'our team')} is live.</p><p><strong>Login:</strong> <a href="${esc(v.loginUrl || '#')}" style="color:#22d3ee">${esc(v.loginUrl || '')}</a><br/><strong>Email:</strong> ${esc(v.email || '')}<br/><strong>Temporary password:</strong> ${esc(v.temporaryPassword || '')}</p><p style="font-size:13px;color:#94a3b8">Change your password after first login.</p>`, v),
    text: (v) => `Welcome ${v.clientName}. Login ${v.loginUrl} Email ${v.email} Temp password ${v.temporaryPassword}`,
  },
  {
    id: 'report_analyzed',
    name: 'Report analyzed',
    description: 'Fired after live credit report parse + fact-checked analysis',
    eventType: 'report_analyzed',
    subject: (v) => `Your ${v.bureau || 'credit'} report analysis is ready`,
    html: (v) => shell('Analysis complete', `<p>Hi ${esc(v.clientName || '')},</p><p>We finished a <strong>live</strong> analysis of your ${esc(v.bureau || '')} report.</p><p><strong>${esc(v.violationCount || '0')}</strong> grounded findings after fact-check (raw detector hits: ${esc(v.rawCount || '0')}).</p><p>${esc(v.reasoningSummary || '')}</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Review in portal</a></p>`, v),
    text: (v) => `Analysis ready: ${v.violationCount} findings. ${v.reasoningSummary} ${v.portalUrl}`,
  },
  {
    id: 'violations_ready',
    name: 'Violations ready for review',
    description: 'Accuracy flags available in cockpit',
    eventType: 'violations_ready',
    subject: (v) => `${v.violationCount || '0'} accuracy findings ready`,
    html: (v) => shell('Findings ready', `<p>Hi ${esc(v.clientName || '')},</p><p>Your fact-checked accuracy findings are ready. Each item includes statute, evidence from your report, and reasoning steps.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open My Cockpit</a></p>`, v),
    text: (v) => `${v.violationCount} findings ready. ${v.portalUrl}`,
  },
  {
    id: 'dispute_letters_ready',
    name: 'Dispute letters ready to e-sign',
    description: 'Letters generated and awaiting signature',
    eventType: 'dispute_letters_ready',
    subject: () => 'Your dispute letters are ready to e-sign',
    html: (v) => shell('E-sign required', `<p>Hi ${esc(v.clientName || '')},</p><p>${esc(v.docCount || '1')} dispute letter(s) are ready. Sign to keep your campaign moving.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Sign documents</a></p>`, v),
    text: (v) => `Dispute letters ready: ${v.portalUrl}`,
  },
  {
    id: 'dispute_mailed',
    name: 'Dispute mailed',
    description: 'Certified mail / Click2Mail dispatch confirmation',
    eventType: 'dispute_mailed',
    subject: (v) => `Dispute package mailed${v.tracking ? ` · ${v.tracking}` : ''}`,
    html: (v) => shell('On the way', `<p>Hi ${esc(v.clientName || '')},</p><p>Your dispute package was dispatched.</p><p>Tracking: <strong>${esc(v.tracking || 'pending')}</strong></p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Track in portal</a></p>`, v),
    text: (v) => `Dispute mailed. Tracking ${v.tracking}. ${v.portalUrl}`,
  },
  {
    id: 'bureau_response_recorded',
    name: 'Bureau response recorded',
    description: 'Staff recorded a bureau/furnisher response',
    eventType: 'bureau_response',
    subject: (v) => `Bureau update: ${v.result || 'response recorded'}`,
    html: (v) => shell('Bureau update', `<p>Hi ${esc(v.clientName || '')},</p><p>A bureau/furnisher response was recorded: <strong>${esc(v.result || '')}</strong>.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">See details</a></p>`, v),
    text: (v) => `Bureau response: ${v.result}. ${v.portalUrl}`,
  },
  {
    id: 'daily_morning_ritual',
    name: 'Daily morning ritual',
    description: 'Scheduled status + motivational quote',
    eventType: 'daily_motivation',
    subject: (v) => v.title || 'Good morning — your credit ritual',
    html: (v) => shell(v.title || 'Good morning', `<pre style="white-space:pre-wrap;font-family:system-ui;color:#cbd5e1">${esc(v.ritualBody || v.body || '')}</pre>`, v),
    text: (v) => v.ritualBody || v.body || '',
  },
  {
    id: 'staff_message',
    name: 'Staff message',
    description: 'Advisor message to client from the company',
    eventType: 'staff_message',
    subject: (v) => v.subject || `Message from ${v.brandName || 'your credit team'}`,
    html: (v) => shell(v.subject || 'New message', `<p>Hi ${esc(v.clientName || '')},</p><p>${esc(v.body || '').replace(/\n/g, '<br/>')}</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Reply in portal</a></p>`, v),
    text: (v) => v.body || '',
  },
  {
    id: 'tradeline_confirmed',
    name: 'Boost tool confirmed',
    description: 'Tradeline / boost purchase paid',
    eventType: 'tradeline',
    subject: () => 'Boost tool enrollment confirmed',
    html: (v) => shell('Enrollment confirmed', `<p>Hi ${esc(v.clientName || '')},</p><p>Your ${esc(v.productId || 'boost')} enrollment is paid and being provisioned.</p>`, v),
    text: (v) => `Boost confirmed: ${v.productId}`,
  },
  {
    id: 'journey_checkin_nudge',
    name: 'Journey check-in nudge',
    description: 'Encourage daily check-in if streak at risk',
    eventType: 'journey_nudge',
    subject: () => 'Keep your streak alive — check in today',
    html: (v) => shell('Check in', `<p>Hi ${esc(v.clientName || '')},</p><p>Your journey streak is waiting. One check-in keeps the momentum.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Check in</a></p>`, v),
    text: (v) => `Check in today: ${v.portalUrl}`,
  },
  {
    id: 'fundability_update',
    name: 'Fundability update',
    description: 'Fundability score / roadmap progress update',
    eventType: 'fundability_update',
    subject: (v) => `Fundability update: ${v.score || '—'}/100`,
    html: (v) => shell('Fundability update', `<p>Hi ${esc(v.clientName || '')},</p><p>Your fundability score is <strong>${esc(v.score || '—')}</strong>. Goal: ${esc(v.goal || 'mortgage')}.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open roadmap</a></p>`, v),
    text: (v) => `Fundability ${v.score}. ${v.portalUrl}`,
  },
  {
    id: 'contract_ready',
    name: 'Legal contract ready',
    description: 'CROA / LPOA / consent pack ready to e-sign',
    eventType: 'contract_ready',
    subject: (v) => `Action required: sign your ${v.contractType || 'legal'} agreement`,
    html: (v) => shell('Agreements ready', `<p>Hi ${esc(v.clientName || '')},</p><p>Your compliance agreements are ready for secure e-sign${v.requiresNotarization === 'true' ? ' (notarization may follow)' : ''}.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Review &amp; sign</a></p>`, v),
    text: (v) => `Sign your ${v.contractType} agreement: ${v.portalUrl}`,
  },
  {
    id: 'video_conference_invite',
    name: 'Video conference invite',
    description: 'Advisor video room invite',
    eventType: 'video_conference',
    subject: (v) => v.title || 'Your secure video conference is ready',
    html: (v) => shell('Video conference', `<p>Hi ${esc(v.clientName || '')},</p><p>Join your secure advisor conference.</p><p>Room: <strong>${esc(v.roomName || '')}</strong></p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Join in portal</a></p>`, v),
    text: (v) => `Join video conference ${v.roomName}: ${v.portalUrl}`,
  },
  {
    id: 'ron_session_update',
    name: 'Notarization session update',
    description: 'RON identity / completion notices',
    eventType: 'ron_session',
    subject: (v) => `Notarization: ${v.status || 'update'}`,
    html: (v) => shell('Online notarization', `<p>Hi ${esc(v.clientName || '')},</p><p>Status: <strong>${esc(v.status || '')}</strong></p><p>${esc(v.note || '')}</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open portal</a></p>`, v),
    text: (v) => `Notarization ${v.status}. ${v.portalUrl}`,
  },
  {
    id: 'onboarding_day1',
    name: 'Onboarding day-1 follow-up',
    description: 'Next-day check-in after client create',
    eventType: 'onboarding_drip',
    subject: (v) => `${v.brandName || 'Your credit team'} is here — next steps`,
    html: (v) => shell('Next steps', `<p>Hi ${esc(v.clientName || '')},</p><p>Welcome again from ${esc(v.brandOwner || v.brandName || 'our team')}. Today: upload your credit report (or finish consents), open My Journey, and message us with questions.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open portal</a></p>`, v),
    text: (v) => `Day-1 follow-up: ${v.portalUrl}`,
  },
  {
    id: 'onboarding_day3',
    name: 'Onboarding day-3 follow-up',
    description: 'Three-day engagement nudge',
    eventType: 'onboarding_drip',
    subject: (v) => `Quick check-in from ${v.brandName || 'your team'}`,
    html: (v) => shell('Still with you', `<p>Hi ${esc(v.clientName || '')},</p><p>Three days in — if anything is blocking (report upload, e-sign, questions), reply in the portal. We are actively on your file.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Continue in portal</a></p>`, v),
    text: (v) => `Day-3 check-in: ${v.portalUrl}`,
  },
  {
    id: 'unsigned_contract_nudge',
    name: 'Unsigned contract nudge',
    description: 'Prompt client to sign CROA / legal pack',
    eventType: 'contract_nudge',
    subject: (v) => `Action needed: sign your ${v.contractType || 'service'} agreement`,
    html: (v) => shell('Signature needed', `<p>Hi ${esc(v.clientName || '')},</p><p>Your ${esc(v.contractType || 'compliance')} agreement is still unsigned. Signing unlocks full report analysis and dispute workflows.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Sign now</a></p>`, v),
    text: (v) => `Please sign ${v.contractType}: ${v.portalUrl}`,
  },
  {
    id: 'dispute_due_reminder',
    name: 'Dispute response due reminder',
    description: 'Bureau response window approaching or overdue',
    eventType: 'dispute_due',
    subject: (v) => `Bureau response due ${v.dueDate || 'soon'}`,
    html: (v) => shell('Response window', `<p>Hi ${esc(v.clientName || '')},</p><p><strong>${esc(v.documentTitle || 'Your dispute')}</strong></p><p>Due: <strong>${esc(v.dueDate || '')}</strong>. ${esc(v.statusNote || '')}</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open portal</a></p>`, v),
    text: (v) => `Dispute due ${v.dueDate}: ${v.documentTitle}. ${v.portalUrl}`,
  },
  {
    id: 'admin_daily_digest',
    name: 'Admin daily digest',
    description: 'Staff ops summary email',
    eventType: 'admin_digest',
    subject: (v) => `${v.brandName || 'Smart FCRA'} daily ops digest`,
    html: (v) => shell('Daily ops digest', `<pre style="white-space:pre-wrap;font-family:system-ui;color:#cbd5e1">${esc(v.digestBody || '')}</pre><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open Compliance Hub</a></p>`, v),
    text: (v) => v.digestBody || '',
  },
  {
    id: 'team_invite',
    name: 'Team member invite',
    description: 'Staff invite with temporary credentials',
    eventType: 'team_invite',
    subject: (v) => `You're invited to ${v.brandName || 'Smart FCRA'}`,
    html: (v) => shell('Team access', `<p>Hi ${esc(v.name || '')},</p><p>You have been added to ${esc(v.brandName || 'the team')}.</p><p><strong>Login:</strong> <a href="${esc(v.loginUrl || '#')}" style="color:#22d3ee">${esc(v.loginUrl || '')}</a><br/><strong>Email:</strong> ${esc(v.email || '')}<br/><strong>Temporary password:</strong> ${esc(v.temporaryPassword || '')}</p>`, v),
    text: (v) => `Team invite ${v.loginUrl} ${v.email} ${v.temporaryPassword}`,
  },
  {
    id: 'inactive_reengage',
    name: 'Inactive client re-engagement',
    description: 'Win-back for clients silent for 14+ days',
    eventType: 'reengage',
    subject: (v) => `${v.brandName || 'Your credit team'} misses you — quick check-in`,
    html: (v) => shell('We are still on your file', `<p>Hi ${esc(v.clientName || '')},</p><p>It has been ${esc(v.daysSilent || 'a while')} since your last activity. Your disputes and fundability roadmap are waiting.</p><p>${esc(v.nudge || 'Open the portal for today\'s next step.')}</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Continue your journey</a></p>`, v),
    text: (v) => `Re-engage: ${v.portalUrl}`,
  },
  {
    id: 'weekly_owner_report',
    name: 'Weekly CRO owner report',
    description: 'Monday ops/business summary for org admins',
    eventType: 'owner_report',
    subject: (v) => `${v.brandName || 'Smart FCRA'} weekly owner report · ${v.weekKey || ''}`,
    html: (v) => shell('Weekly owner report', `<pre style="white-space:pre-wrap;font-family:system-ui;color:#cbd5e1">${esc(v.reportBody || '')}</pre><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open dashboard</a></p>`, v),
    text: (v) => v.reportBody || '',
  },
  {
    id: 'client_newsletter',
    name: 'Client education newsletter',
    description: 'Weekly opt-in education / fundability tips',
    eventType: 'newsletter',
    subject: (v) => v.subject || `${v.brandName || 'Smart FCRA'} weekly tips`,
    html: (v) => shell(v.title || 'This week in credit', `<div>${v.bodyHtml || esc(v.bodyText || '')}</div><p style="font-size:11px;color:#64748b;margin-top:20px">You opted into educational updates. <a href="${esc(v.unsubscribeUrl || v.portalUrl || '#')}" style="color:#94a3b8">Manage preferences</a></p>`, v),
    text: (v) => v.bodyText || '',
  },
  {
    id: 'privacy_sla_alert',
    name: 'Privacy request SLA alert',
    description: 'Staff alert when privacy export/delete nears SLA',
    eventType: 'privacy_sla',
    subject: (v) => `Privacy request SLA · ${v.requestType || 'request'} · ${v.daysOpen || '?'}d open`,
    html: (v) => shell('Privacy SLA', `<p>Request <strong>${esc(v.requestId || '')}</strong> (${esc(v.requestType || '')}) for ${esc(v.clientName || 'client')} has been open ${esc(v.daysOpen || '?')} days.</p><p>Status: ${esc(v.status || '')}. Act in Compliance Hub.</p>`, v),
    text: (v) => `Privacy SLA ${v.requestId} open ${v.daysOpen}d`,
  },
  {
    id: 'bureau_followup_staff',
    name: 'Bureau follow-up staff digest',
    description: 'Overdue / no-response dispute escalation for staff',
    eventType: 'bureau_followup',
    subject: (v) => `Bureau follow-ups needed · ${v.count || '0'} items`,
    html: (v) => shell('Bureau follow-ups', `<pre style="white-space:pre-wrap;font-family:system-ui;color:#cbd5e1">${esc(v.digestBody || '')}</pre>`, v),
    text: (v) => v.digestBody || '',
  },
  {
    id: 'ops_health_alert',
    name: 'Ops health alert',
    description: 'Email delivery / backup / security threshold alerts',
    eventType: 'ops_health',
    subject: (v) => `[${(v.severity || 'warning').toUpperCase()}] ${v.title || 'Ops alert'}`,
    html: (v) => shell(v.title || 'Ops alert', `<pre style="white-space:pre-wrap;font-family:system-ui;color:#cbd5e1">${esc(v.body || '')}</pre>`, v),
    text: (v) => v.body || '',
  },
];

export function getEmailTemplate(id: TemplateId): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}

async function logDelivery(
  env: AlertEnv & EmailEnv,
  row: {
    orgId?: string;
    clientId?: string;
    templateId?: string;
    eventType?: string;
    toEmail: string;
    subject: string;
    provider?: string;
    status: string;
    errorMessage?: string;
    messageId?: string;
    brandName?: string;
    meta?: any;
  },
) {
  try {
    await env.DB.prepare(
      `INSERT INTO email_delivery_log
        (id, org_id, client_id, template_id, event_type, to_email, subject, provider, status, error_message, message_id, brand_name, meta_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      crypto.randomUUID().replace(/-/g, '').slice(0, 24),
      row.orgId || null,
      row.clientId || null,
      row.templateId || null,
      row.eventType || null,
      row.toEmail,
      row.subject,
      row.provider || null,
      row.status,
      row.errorMessage || null,
      row.messageId || null,
      row.brandName || null,
      row.meta ? JSON.stringify(row.meta) : null,
    ).run();
  } catch (e) {
    console.warn('[email-log] insert skipped', e);
  }
}

export async function sendTemplatedClientMessage(
  env: AlertEnv & EmailEnv & { COMPANY_NAME?: string; COMPANY_OWNER?: string; COMPANY_EMAIL?: string; COMPANY_LOGO?: string; COMPANY_ADDRESS?: string; COMPANY_WEBSITE?: string },
  opts: {
    templateId: TemplateId;
    orgId: string;
    clientId: string;
    email?: string | null;
    phone?: string | null;
    notifyEmail?: boolean;
    notifySms?: boolean;
    vars: Record<string, string>;
    brand?: OrgBrand;
    skipClientAlert?: boolean;
  },
): Promise<{ ok: boolean; templateId: TemplateId; channels: any; deliveryStatus?: string }> {
  const tpl = getEmailTemplate(opts.templateId);
  if (!tpl) return { ok: false, templateId: opts.templateId, channels: { error: 'unknown_template' } };

  const brand = opts.brand || await loadOrgBrand(env, opts.orgId);
  const vars = { ...brandVars(brand), ...opts.vars };
  const title = tpl.subject(vars);
  const body = tpl.text(vars);
  const html = tpl.html(vars);

  const channels: any = { alertIds: [] as string[] };

  if (!opts.skipClientAlert && opts.clientId && !String(opts.clientId).startsWith('admin:')) {
    const alertChannels = await dispatchClientAlert(env, {
      orgId: opts.orgId,
      clientId: opts.clientId,
      eventType: tpl.eventType,
      title,
      body,
      email: opts.email,
      phone: opts.phone,
      notifyEmail: false,
      notifySms: !!opts.notifySms && !!opts.phone,
    });
    channels.alertIds = alertChannels.alertIds || [];
    channels.sms = alertChannels.sms;
  }

  let deliveryStatus = 'skipped';
  if (opts.notifyEmail !== false && opts.email) {
    const lane = templateLane(opts.templateId);
    const gate = await canSendMessage({
      db: env.DB,
      orgId: opts.orgId,
      clientId: opts.clientId,
      email: opts.email,
      lane,
      channel: 'email',
      templateId: opts.templateId,
    });
    const attemptId = crypto.randomUUID();
    await logCommunicationAttempt(env.DB, {
      ...gate,
      id: attemptId,
      db: env.DB,
      orgId: opts.orgId,
      clientId: opts.clientId,
      email: opts.email,
      lane,
      channel: 'email',
      templateId: opts.templateId,
      renderedSubject: title,
      sent: false,
    });
    if (!gate.allowed) {
      deliveryStatus = 'blocked';
      channels.email = `blocked:${gate.reasons.join(';')}`;
      return { ok: false, templateId: opts.templateId, channels, deliveryStatus };
    }
    try {
      const mail = await sendAppEmail(env, {
        to: opts.email,
        subject: title,
        html,
        text: body,
        purpose: opts.templateId === 'portal_welcome' || opts.templateId === 'account_verify' || opts.templateId === 'team_invite'
          ? 'onboarding'
          : 'noreply',
        fromName: brand.fromName,
      });
      // Honest status — simulated is NOT sent
      deliveryStatus = mail.sent ? 'sent' : mail.simulated ? 'simulated' : 'failed';
      channels.email = deliveryStatus;
      channels.provider = mail.provider;
      channels.messageId = mail.messageId;
      channels.simulated = !!mail.simulated;

      if (!opts.skipClientAlert && opts.clientId && !String(opts.clientId).startsWith('admin:')) {
        try {
          const id = crypto.randomUUID();
          await env.DB.prepare(
            `INSERT INTO portal_alerts (id, org_id, client_id, channel, event_type, title, body, status, sent_at, created_at)
             VALUES (?, ?, ?, 'email', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          ).bind(id, opts.orgId, opts.clientId, tpl.eventType, title, body, deliveryStatus).run();
          channels.alertIds.push(id);
        } catch { /* soft */ }
      }

      await logDelivery(env, {
        orgId: opts.orgId,
        clientId: opts.clientId,
        templateId: opts.templateId,
        eventType: tpl.eventType,
        toEmail: opts.email,
        subject: title,
        provider: mail.provider,
        status: deliveryStatus,
        messageId: mail.messageId,
        brandName: brand.name,
      });
    } catch (e: any) {
      deliveryStatus = 'failed';
      channels.email = `failed:${e?.message || 'send'}`;
      await logDelivery(env, {
        orgId: opts.orgId,
        clientId: opts.clientId,
        templateId: opts.templateId,
        eventType: tpl.eventType,
        toEmail: opts.email,
        subject: title,
        status: 'failed',
        errorMessage: e?.message,
        brandName: brand.name,
      });
    }
  } else if (!opts.email) {
    deliveryStatus = 'skipped';
    channels.email = 'skipped_no_email';
  }

  return {
    // Operational ok includes simulated (honest deliveryStatus still distinguishes sent vs simulated)
    ok:
      deliveryStatus === 'sent' ||
      deliveryStatus === 'simulated' ||
      deliveryStatus === 'skipped' ||
      (!opts.email && !!channels.alertIds?.length),
    templateId: opts.templateId,
    channels,
    deliveryStatus,
  };
}

export function listEmailTemplates() {
  return EMAIL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    eventType: t.eventType,
  }));
}
