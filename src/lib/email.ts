/**
 * Cloudflare Email Sending + Resend/SendGrid fallbacks.
 * Prefers welcome@noreply.smartfcra.com / onboarding.smartfcra.com via CF Email API.
 */

export type EmailEnv = {
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_EMAIL_API_TOKEN?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_EMAIL_FROM_NOREPLY?: string;
  CLOUDFLARE_EMAIL_FROM_ONBOARDING?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  SENDGRID_API_KEY?: string;
};

export type SendEmailOpts = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  /** noreply | onboarding | custom */
  purpose?: 'noreply' | 'onboarding' | 'support';
  from?: string;
  fromName?: string;
};

async function sendViaCloudflare(env: EmailEnv, opts: SendEmailOpts): Promise<{ sent: boolean; provider: string; messageId?: string }> {
  const token = env.CLOUDFLARE_EMAIL_API_TOKEN || env.CLOUDFLARE_API_TOKEN;
  const accountId = env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !accountId) throw new Error('Cloudflare email token/account missing');

  const from =
    opts.from ||
    (opts.purpose === 'onboarding'
      ? env.CLOUDFLARE_EMAIL_FROM_ONBOARDING || 'welcome@onboarding.smartfcra.com'
      : env.CLOUDFLARE_EMAIL_FROM_NOREPLY || 'welcome@noreply.smartfcra.com');

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/email/sending/send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: [opts.to],
      from,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || opts.html.replace(/<[^>]+>/g, ' '),
    }),
  });
  const data = await res.json() as any;
  if (!res.ok || !data.success) {
    throw new Error(`CF Email ${res.status}: ${JSON.stringify(data.errors || data)}`);
  }
  return {
    sent: true,
    provider: 'cloudflare-email',
    messageId: data.result?.message_id || data.result?.id,
  };
}

async function sendViaResend(apiKey: string, from: string, opts: SendEmailOpts) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [opts.to], subject: opts.subject, html: opts.html }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { sent: true, provider: 'resend' as const };
}

async function sendViaSendGrid(apiKey: string, from: string, opts: SendEmailOpts) {
  const email = from.includes('<') ? from.replace(/.*</, '').replace('>', '') : from;
  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: opts.to }] }],
      from: { email, name: opts.fromName || 'Smart FCRA' },
      subject: opts.subject,
      content: [{ type: 'text/html', value: opts.html }],
    }),
  });
  if (!res.ok && res.status !== 202) throw new Error(`SendGrid ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return { sent: true, provider: 'sendgrid' as const };
}

/** Prefer Cloudflare Email Sending; fall back to Resend then SendGrid. */
export async function sendAppEmail(env: EmailEnv, opts: SendEmailOpts): Promise<{ sent: boolean; simulated: boolean; provider: string; messageId?: string }> {
  const errors: string[] = [];

  try {
    const r = await sendViaCloudflare(env, opts);
    return { ...r, simulated: false };
  } catch (e: any) {
    errors.push(e.message);
  }

  const fallbackFrom =
    opts.from ||
    env.RESEND_FROM_EMAIL ||
    env.CLOUDFLARE_EMAIL_FROM_NOREPLY ||
    'welcome@noreply.smartfcra.com';

  if (env.RESEND_API_KEY) {
    try {
      const r = await sendViaResend(env.RESEND_API_KEY, fallbackFrom, opts);
      return { ...r, simulated: false };
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  if (env.SENDGRID_API_KEY) {
    try {
      const r = await sendViaSendGrid(env.SENDGRID_API_KEY, fallbackFrom, opts);
      return { ...r, simulated: false };
    } catch (e: any) {
      errors.push(e.message);
    }
  }

  console.log(`[EMAIL:SIMULATED] to=${opts.to} subject=${opts.subject} errors=${errors.join(' | ')}`);
  return { sent: false, simulated: true, provider: 'simulated' };
}
