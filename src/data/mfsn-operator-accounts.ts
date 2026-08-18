/**
 * Whitelisted MyFreeScoreNow operator accounts for RJ Business Solutions.
 * Passwords NEVER live here — only in gitignored `.dev.vars` / Pages secrets.
 */

export const MFSN_API_BASE = 'https://api.myfreescorenow.com';
export const MFSN_AFFILIATE_PORTAL_URL = 'https://myfreescorenow.com/login';
export const MFSN_API_DOCS_URL = 'https://www.myfreescorenow.com/api-integration';
export const MFSN_OPENAPI_URL =
  'https://api.swaggerhub.com/apis/myfreescorenowinc/MyFreeScoreNow-Reports/1.0.0/swagger.json';
export const MFSN_SWAGGER_PORTAL_URL =
  'https://myfreescorenow.portal.swaggerhub.com/reporting/docs/mfsn-reports-v-1-0-0';

/** What MFSN affiliates must do before Smart FCRA can pull a live 3B file. */
export type MfsnAffiliateApiUserStep = {
  step: number;
  title: string;
  body: string;
};

export const MFSN_AFFILIATE_API_USER_STEPS: MfsnAffiliateApiUserStep[] = [
  {
    step: 1,
    title: 'Open the affiliate portal',
    body: 'Go to https://myfreescorenow.com/login and sign in with your MyFreeScoreNow affiliate account — not the consumer member login.',
  },
  {
    step: 2,
    title: 'Users → API user',
    body: 'Open Users. Click the dropdown and choose API user. Do not skip this — the partner dashboard password is not the API login.',
  },
  {
    step: 3,
    title: 'Create the API username and password',
    body: 'At the top, enter the API username and password you choose, then save. Those two fields are what Smart FCRA uses to authenticate to fetch-3B-json.',
  },
  {
    step: 4,
    title: 'Pull with the client email + client token',
    body: 'Back in Smart FCRA, enter that API username/password (or leave them blank if this org already has partner secrets). Then enter the member email (the client’s MyFreeScoreNow username) and paste their client token (MAPIK#). That generates the API pull, ingests the tri-bureau file, and starts the violation / letter / portal process.',
  },
];

export function formatMfsnAffiliateApiUserGuide(): string {
  return MFSN_AFFILIATE_API_USER_STEPS.map((s) => `${s.step}. ${s.title}: ${s.body}`).join('\n');
}

export type MfsnOperatorAccount = {
  email: string;
  role: 'primary_api' | 'legacy_partner' | 'affiliate_dashboard';
  label: string;
};

/** Emails allowed to operate the partner API / affiliate dashboard for this org. */
export const MFSN_OPERATOR_ACCOUNTS: MfsnOperatorAccount[] = [
  {
    email: 'rickyjefferson1006@gmail.com',
    role: 'primary_api',
    label: 'Primary MFSN API + affiliate dashboard login',
  },
  {
    email: 'rickjefferson@rickjeffersonsolutions.com',
    role: 'legacy_partner',
    label: 'Legacy partner API login (still valid)',
  },
];

export function isWhitelistedMfsnOperatorEmail(email: string | null | undefined): boolean {
  const n = String(email || '').trim().toLowerCase();
  if (!n) return false;
  return MFSN_OPERATOR_ACCOUNTS.some((a) => a.email.toLowerCase() === n);
}

export function primaryMfsnOperatorEmail(): string {
  return (
    MFSN_OPERATOR_ACCOUNTS.find((a) => a.role === 'primary_api')?.email ||
    MFSN_OPERATOR_ACCOUNTS[0]?.email ||
    ''
  );
}
