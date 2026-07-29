/**
 * Client alerts — email always (when configured), SMS when Twilio is present.
 */
import { sendAppEmail, type EmailEnv } from './email';

export type AlertEnv = EmailEnv & {
  DB: D1Database;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
};

export async function sendSms(
  env: AlertEnv,
  to: string,
  body: string,
): Promise<{ sent: boolean; simulated?: boolean; sid?: string; error?: string }> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    return { sent: false, simulated: true, error: 'twilio_not_configured' };
  }
  const toE164 = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').slice(-10)}`;
  try {
    const auth = btoa(`${sid}:${token}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toE164, From: from, Body: body.slice(0, 1500) }),
    });
    const data = await res.json() as any;
    if (!res.ok) return { sent: false, error: data.message || `twilio_${res.status}` };
    return { sent: true, sid: data.sid };
  } catch (e: any) {
    return { sent: false, error: e.message };
  }
}

export async function dispatchClientAlert(
  env: AlertEnv,
  opts: {
    orgId: string;
    clientId: string;
    eventType: string;
    title: string;
    body: string;
    email?: string | null;
    phone?: string | null;
    notifyEmail?: boolean;
    notifySms?: boolean;
  },
): Promise<{ email?: string; sms?: string; alertIds: string[] }> {
  const alertIds: string[] = [];
  const result: { email?: string; sms?: string; alertIds: string[] } = { alertIds };

  // Always create in-app alert
  const inAppId = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO portal_alerts (id, org_id, client_id, channel, event_type, title, body, status, created_at)
       VALUES (?, ?, ?, 'in_app', ?, ?, ?, 'sent', datetime('now'))`,
    )
      .bind(inAppId, opts.orgId, opts.clientId, opts.eventType, opts.title, opts.body)
      .run();
    alertIds.push(inAppId);
  } catch {
    /* soft */
  }

  if (opts.notifyEmail !== false && opts.email) {
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        `INSERT INTO portal_alerts (id, org_id, client_id, channel, event_type, title, body, status, created_at)
         VALUES (?, ?, ?, 'email', ?, ?, ?, 'queued', datetime('now'))`,
      )
        .bind(id, opts.orgId, opts.clientId, opts.eventType, opts.title, opts.body)
        .run();
      const mail = await sendAppEmail(env, {
        to: opts.email,
        subject: opts.title,
        html: `<div style="font-family:system-ui,sans-serif;padding:16px"><h2 style="color:#0ea5e9">${opts.title}</h2><p>${opts.body.replace(/</g, '&lt;').replace(/\n/g, '<br/>')}</p><p style="color:#64748b;font-size:12px">Smart FCRA secure alert</p></div>`,
        text: opts.body,
        purpose: 'noreply',
      });
      const status = mail.sent ? 'sent' : mail.simulated ? 'sent' : 'failed';
      await env.DB.prepare(`UPDATE portal_alerts SET status = ?, sent_at = datetime('now'), provider_ref = ? WHERE id = ?`)
        .bind(status, mail.provider || null, id)
        .run();
      result.email = status;
      alertIds.push(id);
    } catch (e: any) {
      result.email = `failed:${e.message}`;
    }
  }

  if (opts.notifySms && opts.phone) {
    const id = crypto.randomUUID();
    try {
      await env.DB.prepare(
        `INSERT INTO portal_alerts (id, org_id, client_id, channel, event_type, title, body, status, created_at)
         VALUES (?, ?, ?, 'sms', ?, ?, ?, 'queued', datetime('now'))`,
      )
        .bind(id, opts.orgId, opts.clientId, opts.eventType, opts.title, opts.body.slice(0, 300))
        .run();
      const sms = await sendSms(env, opts.phone, `${opts.title}: ${opts.body}`.slice(0, 320));
      const status = sms.sent ? 'sent' : sms.simulated ? 'sent' : 'failed';
      await env.DB.prepare(`UPDATE portal_alerts SET status = ?, sent_at = datetime('now'), provider_ref = ? WHERE id = ?`)
        .bind(status, sms.sid || sms.error || null, id)
        .run();
      result.sms = status;
      alertIds.push(id);
    } catch (e: any) {
      result.sms = `failed:${e.message}`;
    }
  }

  return result;
}
