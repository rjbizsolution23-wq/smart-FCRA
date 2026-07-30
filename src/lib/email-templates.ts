/**
 * Email / alert template catalog for the full client journey path.
 * All templates are deterministic — no generative copy at send time.
 */
import { sendAppEmail, type EmailEnv } from './email';
import { dispatchClientAlert, type AlertEnv } from './alerts';

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
  | 'ron_session_update';

export type EmailTemplate = {
  id: TemplateId;
  name: string;
  description: string;
  eventType: string;
  subject: (vars: Record<string, string>) => string;
  html: (vars: Record<string, string>) => string;
  text: (vars: Record<string, string>) => string;
};

function esc(s: string): string {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function shell(title: string, bodyHtml: string): string {
  return `<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#0b1220;color:#e2e8f0">
  <div style="font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#22d3ee;margin-bottom:8px">Smart FCRA</div>
  <h1 style="font-size:22px;color:#fff;margin:0 0 12px">${esc(title)}</h1>
  <div style="font-size:14px;line-height:1.6;color:#cbd5e1">${bodyHtml}</div>
  <p style="margin-top:24px;font-size:11px;color:#64748b">RJ Business Solutions · Secure client communications</p>
</div>`;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'account_verify',
    name: 'Account verification',
    description: 'Email verification link after registration',
    eventType: 'account_verify',
    subject: () => 'Verify your Smart FCRA account',
    html: (v) => shell('Verify your account', `<p>Hi ${esc(v.name || 'there')},</p><p>Confirm your email to activate your portal.</p><p><a href="${esc(v.verifyUrl || '#')}" style="color:#22d3ee">Verify email</a></p>`),
    text: (v) => `Verify your Smart FCRA account: ${v.verifyUrl || ''}`,
  },
  {
    id: 'password_reset',
    name: 'Password reset',
    description: 'Forgot-password reset link',
    eventType: 'password_reset',
    subject: () => 'Reset your Smart FCRA password',
    html: (v) => shell('Reset password', `<p>Use this link to choose a new password:</p><p><a href="${esc(v.resetUrl || '#')}" style="color:#22d3ee">Reset password</a></p>`),
    text: (v) => `Reset password: ${v.resetUrl || ''}`,
  },
  {
    id: 'portal_welcome',
    name: 'Portal welcome',
    description: 'Client portal invite with temporary password',
    eventType: 'portal_welcome',
    subject: (v) => `Welcome to your portal, ${v.clientName || 'client'}`,
    html: (v) => shell('Your portal is ready', `<p>Hi ${esc(v.clientName || '')},</p><p>Your secure client portal is live.</p><p><strong>Login:</strong> ${esc(v.email || '')}<br/><strong>Temporary password:</strong> ${esc(v.temporaryPassword || '')}</p><p><a href="${esc(v.loginUrl || '#')}" style="color:#22d3ee">Open portal</a></p>`),
    text: (v) => `Welcome ${v.clientName}. Login ${v.loginUrl} Email ${v.email} Temp password ${v.temporaryPassword}`,
  },
  {
    id: 'report_analyzed',
    name: 'Report analyzed',
    description: 'Fired after live credit report parse + fact-checked analysis',
    eventType: 'report_analyzed',
    subject: (v) => `Your ${v.bureau || 'credit'} report analysis is ready`,
    html: (v) => shell('Analysis complete', `<p>Hi ${esc(v.clientName || '')},</p><p>We finished a <strong>live</strong> analysis of your ${esc(v.bureau || '')} report.</p><p><strong>${esc(v.violationCount || '0')}</strong> grounded findings after fact-check (raw detector hits: ${esc(v.rawCount || '0')}).</p><p>${esc(v.reasoningSummary || '')}</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Review in portal</a></p>`),
    text: (v) => `Analysis ready: ${v.violationCount} findings. ${v.reasoningSummary} ${v.portalUrl}`,
  },
  {
    id: 'violations_ready',
    name: 'Violations ready for review',
    description: 'Accuracy flags available in cockpit',
    eventType: 'violations_ready',
    subject: (v) => `${v.violationCount || '0'} accuracy findings ready`,
    html: (v) => shell('Findings ready', `<p>Hi ${esc(v.clientName || '')},</p><p>Your fact-checked accuracy findings are ready. Each item includes statute, evidence from your report, and reasoning steps.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open My Cockpit</a></p>`),
    text: (v) => `${v.violationCount} findings ready. ${v.portalUrl}`,
  },
  {
    id: 'dispute_letters_ready',
    name: 'Dispute letters ready to e-sign',
    description: 'Letters generated and awaiting signature',
    eventType: 'dispute_letters_ready',
    subject: () => 'Your dispute letters are ready to e-sign',
    html: (v) => shell('E-sign required', `<p>Hi ${esc(v.clientName || '')},</p><p>${esc(v.docCount || '1')} dispute letter(s) are ready. Sign to keep your campaign moving.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Sign documents</a></p>`),
    text: (v) => `Dispute letters ready: ${v.portalUrl}`,
  },
  {
    id: 'dispute_mailed',
    name: 'Dispute mailed',
    description: 'Certified mail / Click2Mail dispatch confirmation',
    eventType: 'dispute_mailed',
    subject: (v) => `Dispute package mailed${v.tracking ? ` · ${v.tracking}` : ''}`,
    html: (v) => shell('On the way', `<p>Hi ${esc(v.clientName || '')},</p><p>Your dispute package was dispatched.</p><p>Tracking: <strong>${esc(v.tracking || 'pending')}</strong></p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Track in portal</a></p>`),
    text: (v) => `Dispute mailed. Tracking ${v.tracking}. ${v.portalUrl}`,
  },
  {
    id: 'bureau_response_recorded',
    name: 'Bureau response recorded',
    description: 'Staff recorded a bureau/furnisher response',
    eventType: 'bureau_response',
    subject: (v) => `Bureau update: ${v.result || 'response recorded'}`,
    html: (v) => shell('Bureau update', `<p>Hi ${esc(v.clientName || '')},</p><p>A bureau/furnisher response was recorded: <strong>${esc(v.result || '')}</strong>.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">See details</a></p>`),
    text: (v) => `Bureau response: ${v.result}. ${v.portalUrl}`,
  },
  {
    id: 'daily_morning_ritual',
    name: 'Daily morning ritual',
    description: 'Scheduled status + motivational quote',
    eventType: 'daily_motivation',
    subject: (v) => v.title || 'Good morning — your credit ritual',
    html: (v) => shell(v.title || 'Good morning', `<pre style="white-space:pre-wrap;font-family:system-ui;color:#cbd5e1">${esc(v.ritualBody || v.body || '')}</pre>`),
    text: (v) => v.ritualBody || v.body || '',
  },
  {
    id: 'staff_message',
    name: 'Staff message',
    description: 'Advisor message to client',
    eventType: 'staff_message',
    subject: (v) => v.subject || 'Message from your credit team',
    html: (v) => shell(v.subject || 'New message', `<p>${esc(v.body || '')}</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Reply in portal</a></p>`),
    text: (v) => v.body || '',
  },
  {
    id: 'tradeline_confirmed',
    name: 'Boost tool confirmed',
    description: 'Tradeline / boost purchase paid',
    eventType: 'tradeline',
    subject: () => 'Boost tool enrollment confirmed',
    html: (v) => shell('Enrollment confirmed', `<p>Hi ${esc(v.clientName || '')},</p><p>Your ${esc(v.productId || 'boost')} enrollment is paid and being provisioned.</p>`),
    text: (v) => `Boost confirmed: ${v.productId}`,
  },
  {
    id: 'journey_checkin_nudge',
    name: 'Journey check-in nudge',
    description: 'Encourage daily check-in if streak at risk',
    eventType: 'journey_nudge',
    subject: () => 'Keep your streak alive — check in today',
    html: (v) => shell('Check in', `<p>Hi ${esc(v.clientName || '')},</p><p>Your journey streak is waiting. One check-in keeps the momentum.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Check in</a></p>`),
    text: (v) => `Check in today: ${v.portalUrl}`,
  },
  {
    id: 'fundability_update',
    name: 'Fundability update',
    description: 'Fundability score / roadmap progress update',
    eventType: 'fundability_update',
    subject: (v) => `Fundability update: ${v.score || '—'}/100`,
    html: (v) => shell('Fundability update', `<p>Hi ${esc(v.clientName || '')},</p><p>Your fundability score is <strong>${esc(v.score || '—')}</strong>. Goal: ${esc(v.goal || 'mortgage')}.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open roadmap</a></p>`),
    text: (v) => `Fundability ${v.score}. ${v.portalUrl}`,
  },
  {
    id: 'contract_ready',
    name: 'Legal contract ready',
    description: 'CROA / LPOA / consent pack ready to e-sign',
    eventType: 'contract_ready',
    subject: (v) => `Action required: sign your ${v.contractType || 'legal'} agreement`,
    html: (v) => shell('Agreements ready', `<p>Hi ${esc(v.clientName || '')},</p><p>Your compliance agreements are ready for secure e-sign${v.requiresNotarization === 'true' ? ' (notarization may follow)' : ''}.</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Review &amp; sign</a></p>`),
    text: (v) => `Sign your ${v.contractType} agreement: ${v.portalUrl}`,
  },
  {
    id: 'video_conference_invite',
    name: 'Video conference invite',
    description: 'Advisor video room invite',
    eventType: 'video_conference',
    subject: (v) => v.title || 'Your secure video conference is ready',
    html: (v) => shell('Video conference', `<p>Hi ${esc(v.clientName || '')},</p><p>Join your secure advisor conference.</p><p>Room: <strong>${esc(v.roomName || '')}</strong></p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Join in portal</a></p>`),
    text: (v) => `Join video conference ${v.roomName}: ${v.portalUrl}`,
  },
  {
    id: 'ron_session_update',
    name: 'Notarization session update',
    description: 'RON identity / completion notices',
    eventType: 'ron_session',
    subject: (v) => `Notarization: ${v.status || 'update'}`,
    html: (v) => shell('Online notarization', `<p>Hi ${esc(v.clientName || '')},</p><p>Status: <strong>${esc(v.status || '')}</strong></p><p>${esc(v.note || '')}</p><p><a href="${esc(v.portalUrl || '#')}" style="color:#22d3ee">Open portal</a></p>`),
    text: (v) => `Notarization ${v.status}. ${v.portalUrl}`,
  },
];

export function getEmailTemplate(id: TemplateId): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}

export async function sendTemplatedClientMessage(
  env: AlertEnv & EmailEnv,
  opts: {
    templateId: TemplateId;
    orgId: string;
    clientId: string;
    email?: string | null;
    phone?: string | null;
    notifyEmail?: boolean;
    notifySms?: boolean;
    vars: Record<string, string>;
  },
): Promise<{ ok: boolean; templateId: TemplateId; channels: any }> {
  const tpl = getEmailTemplate(opts.templateId);
  if (!tpl) return { ok: false, templateId: opts.templateId, channels: { error: 'unknown_template' } };
  const title = tpl.subject(opts.vars);
  const body = tpl.text(opts.vars);
  // In-app + SMS via alert bus; email uses catalog HTML (avoid double-send)
  const channels = await dispatchClientAlert(env, {
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
  if (opts.notifyEmail !== false && opts.email) {
    try {
      const mail = await sendAppEmail(env, {
        to: opts.email,
        subject: title,
        html: tpl.html(opts.vars),
        text: body,
        purpose: opts.templateId === 'portal_welcome' ? 'onboarding' : 'noreply',
      });
      channels.email = mail.sent ? 'sent' : mail.simulated ? 'sent' : 'failed';
      try {
        const id = crypto.randomUUID();
        await env.DB.prepare(
          `INSERT INTO portal_alerts (id, org_id, client_id, channel, event_type, title, body, status, sent_at, created_at)
           VALUES (?, ?, ?, 'email', ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        ).bind(
          id, opts.orgId, opts.clientId, tpl.eventType, title, body,
          channels.email,
        ).run();
        channels.alertIds = [...(channels.alertIds || []), id];
      } catch { /* soft */ }
    } catch (e: any) {
      channels.email = `failed:${e?.message || 'send'}`;
    }
  }
  return { ok: true, templateId: opts.templateId, channels };
}

export function listEmailTemplates() {
  return EMAIL_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    eventType: t.eventType,
  }));
}
