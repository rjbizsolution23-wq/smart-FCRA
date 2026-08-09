/**
 * MyFreeScoreNow affiliate/admin API helpers (Bearer from partner login).
 * Used for member lists + GHL bulk sync. Credentials from env only.
 */

export type MfsnAdminEnv = {
  MFSN_EMAIL?: string;
  MFSN_PASSWORD?: string;
  MFSN_LEGACY_EMAIL?: string;
  MFSN_LEGACY_PASSWORD?: string;
  MFSN_API_URL?: string;
};

export type MfsnAdminMember = {
  member_id?: number | string;
  email?: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  account_status?: string;
  publisher_id?: string;
  subscription_date?: string;
  planName?: string;
  amount?: string | number;
  customer_token?: string;
  memberType?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  memberSubscription?: { next_due_date?: string; term?: string; member_id?: number };
  [key: string]: any;
};

function apiBase(env: MfsnAdminEnv): string {
  return String(env.MFSN_API_URL || 'https://api.myfreescorenow.com').replace(/\/$/, '');
}

export async function loginMfsnAdmin(
  env: MfsnAdminEnv,
  prefer: 'primary' | 'legacy' = 'primary',
): Promise<{ ok: boolean; token?: string; email?: string; error?: string }> {
  const attempts =
    prefer === 'legacy'
      ? [
          { email: env.MFSN_LEGACY_EMAIL, password: env.MFSN_LEGACY_PASSWORD },
          { email: env.MFSN_EMAIL, password: env.MFSN_PASSWORD },
        ]
      : [
          { email: env.MFSN_EMAIL, password: env.MFSN_PASSWORD },
          { email: env.MFSN_LEGACY_EMAIL, password: env.MFSN_LEGACY_PASSWORD },
        ];

  for (const a of attempts) {
    const email = String(a.email || '').trim();
    const password = String(a.password || '').trim();
    if (!email || !password) continue;
    try {
      const res = await fetch(`${apiBase(env)}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data: any = await res.json().catch(() => ({}));
      const token = data?.token || data?.accessToken || data?.data?.token;
      if (res.ok && token) return { ok: true, token: String(token), email };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'mfsn_login_failed' };
    }
  }
  return { ok: false, error: 'mfsn_credentials_missing_or_invalid' };
}

export async function fetchMfsnMemberList(
  env: MfsnAdminEnv,
  list: 'active' | 'paused' = 'active',
  token?: string,
): Promise<{ ok: boolean; members: MfsnAdminMember[]; error?: string; email?: string }> {
  let bearer = token;
  let email: string | undefined;
  if (!bearer) {
    const login = await loginMfsnAdmin(env);
    if (!login.ok || !login.token) return { ok: false, members: [], error: login.error || 'login_failed' };
    bearer = login.token;
    email = login.email;
  }

  const path = list === 'paused' ? '/api/admin/member-list/paused' : '/api/admin/member-list/active';
  try {
    const res = await fetch(`${apiBase(env)}${path}`, {
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; SmartFCRA/2.0)',
      },
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.success === false) {
      return { ok: false, members: [], error: data?.message || `mfsn_${res.status}`, email };
    }
    const members = Array.isArray(data?.data) ? data.data : [];
    return { ok: true, members, email };
  } catch (e: any) {
    return { ok: false, members: [], error: e?.message || 'mfsn_fetch_failed', email };
  }
}
