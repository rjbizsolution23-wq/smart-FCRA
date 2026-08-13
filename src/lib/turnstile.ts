/**
 * Cloudflare Turnstile for public brand forms.
 * When TURNSTILE_SECRET_KEY is unset (local/test), verification is skipped.
 */
export type TurnstileEnv = {
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  ENVIRONMENT?: string;
};

export function turnstilePublicConfig(env: TurnstileEnv): { enabled: boolean; siteKey: string | null } {
  const siteKey = String(env.TURNSTILE_SITE_KEY || '').trim();
  const secret = String(env.TURNSTILE_SECRET_KEY || '').trim();
  return { enabled: !!(siteKey && secret), siteKey: siteKey || null };
}

export async function verifyTurnstileToken(
  env: TurnstileEnv,
  token: string | undefined | null,
  remoteIp?: string | null,
): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const secret = String(env.TURNSTILE_SECRET_KEY || '').trim();
  if (!secret) return { ok: true, skipped: true };
  const response = String(token || '').trim();
  if (!response) return { ok: false, error: 'Turnstile token required' };

  const body = new URLSearchParams({ secret, response });
  if (remoteIp) body.set('remoteip', remoteIp);

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await res.json().catch(() => ({})) as { success?: boolean; 'error-codes'?: string[] };
  if (!data.success) {
    return { ok: false, error: (data['error-codes'] || ['turnstile_failed']).join(', ') };
  }
  return { ok: true };
}
