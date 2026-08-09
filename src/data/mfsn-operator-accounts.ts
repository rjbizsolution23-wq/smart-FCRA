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
