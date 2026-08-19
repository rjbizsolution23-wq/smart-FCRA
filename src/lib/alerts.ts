/**
 * Client alerts — email always (when configured), SMS when Twilio is present.
 */
import { sendAppEmail, type EmailEnv } from './email';
import { loadOrgTwilioCredentials } from './org-integrations';
import { resolveOrgEncryptionKey } from './platform-extensions';
import { sendBrandedOrgEmail, formatBrandedSms } from './comms-branding';
import { loadOrgBrand } from './org-branding';

export type AlertEnv = EmailEnv & {
  DB?: D1Database;
  PII_ENCRYPTION_KEY?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
};

export type SendSmsOpts = {
  orgId?: string;
  brandName?: string;
  skipBranding?: boolean;
};

export async function sendSms(
  env: AlertEnv,
  to: string,
  body: string,
  opts?: SendSmsOpts,
): Promise<{ sent: boolean; simulated?: boolean; sid?: string; error?: string; source?: string }> {
  let sid = env.TWILIO_ACCOUNT_SID;
  let token = env.TWILIO_AUTH_TOKEN;
  let from = env.TWILIO_PHONE_NUMBER;
  let source = 'platform';

  if (opts?.orgId && env.DB) {
    try {
      const encKey = resolveOrgEncryptionKey(env.PII_ENCRYPTION_KEY, opts.orgId);
      const creds = await loadOrgTwilioCredentials(env.DB, opts.orgId, env, encKey);
      if (creds) {
        sid = creds.accountSid;
        token = creds.authToken;
        from = creds.phoneNumber;
        source = creds.source;
      }
    } catch { /* fall through to platform */ }
  }

  if (!sid || !token || !from) {
    return { sent: false, simulated: true, error: 'twilio_not_configured', source: 'none' };
  }

  let brandName = opts?.brandName;
  if (!brandName && opts?.orgId && env.DB) {
    try {
      const brand = await loadOrgBrand(env as any, opts.orgId);
      brandName = brand.name;
    } catch { /* soft */ }
  }
  const smsBody = opts?.skipBranding ? body.slice(0, 1500) : formatBrandedSms(body, brandName);

  const toE164 = to.startsWith('+') ? to : `+1${to.replace(/\D/g, '').slice(-10)}`;
  try {
    const auth = btoa(`${sid}:${token}`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: toE164, From: from, Body: smsBody }),
    });
    const data = await res.json() as any;
    if (!res.ok) return { sent: false, error: data.message || `twilio_${res.status}`, source };
    return { sent: true, sid: data.sid, source };
  } catch (e: any) {
    return { sent: false, error: e.message, source };
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

  const inAppId = crypto.randomUUID();
  try {
    await env.DB!.prepare(
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
      await env.DB!.prepare(
        `INSERT INTO portal_alerts (id, org_id, client_id, channel, event_type, title, body, status, created_at)
         VALUES (?, ?, ?, 'email', ?, ?, ?, 'queued', datetime('now'))`,
      )
        .bind(id, opts.orgId, opts.clientId, opts.eventType, opts.title, opts.body)
        .run();
      const mail = env.DB
        ? await sendBrandedOrgEmail({
          env: env as any,
          orgId: opts.orgId,
          to: opts.email,
          subject: opts.title,
          bodyText: opts.body,
          title: opts.title,
        })
        : await sendAppEmail(env, {
          to: opts.email,
          subject: opts.title,
          html: `<div style="font-family:system-ui,sans-serif;padding:16px"><h2>${opts.title}</h2><p>${opts.body}</p></div>`,
          text: opts.body,
          purpose: 'noreply',
        });
      const status = mail.sent ? 'sent' : mail.simulated ? 'simulated' : 'failed';
      await env.DB!.prepare(`UPDATE portal_alerts SET status = ?, sent_at = datetime('now'), provider_ref = ? WHERE id = ?`)
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
      await env.DB!.prepare(
        `INSERT INTO portal_alerts (id, org_id, client_id, channel, event_type, title, body, status, created_at)
         VALUES (?, ?, ?, 'sms', ?, ?, ?, 'queued', datetime('now'))`,
      )
        .bind(id, opts.orgId, opts.clientId, opts.eventType, opts.title, opts.body.slice(0, 300))
        .run();
      const sms = await sendSms(env, opts.phone, `${opts.title}: ${opts.body}`, { orgId: opts.orgId });
      const status = sms.sent ? 'sent' : sms.simulated ? 'simulated' : 'failed';
      await env.DB!.prepare(`UPDATE portal_alerts SET status = ?, sent_at = datetime('now'), provider_ref = ? WHERE id = ?`)
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
