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

/** Staff walkthrough: affiliate Users → API User → Smart FCRA login → member email + MAPIK# → pull. */
export type MfsnPullGuideStep = {
  n: number;
  title: string;
  why: string;
  action: string;
  href?: string;
  hrefLabel?: string;
};

export const MFSN_PULL_GUIDE_STEPS: MfsnPullGuideStep[] = [
  {
    n: 1,
    title: 'Log in to the MyFreeScoreNow affiliate portal',
    why: 'The partner dashboard is the only place you create an API User. The official report API authenticates that API User — not the consumer — via POST /api/auth/login (email + password → Bearer token).',
    action: 'Open the affiliate portal and sign in with your MyFreeScoreNow partner account (the same login you use to manage members under affiliate A8289).',
    href: MFSN_AFFILIATE_PORTAL_URL,
    hrefLabel: 'Open affiliate portal login',
  },
  {
    n: 2,
    title: 'Users section → click API User → create it',
    why: 'An API User is a machine login for your firm. It is not a client. Without it, Smart FCRA cannot obtain a Bearer token, so fetch-3B-json never runs.',
    action: 'In the affiliate portal go to Users. Click API User. Create the API user and copy the email and password it issues. Store them like any other secret — never in chat, git, or the consumer portal.',
  },
  {
    n: 3,
    title: 'Add that API User to My Free Score API login',
    why: 'Those two fields are the partner login. Smart FCRA sends them to /api/auth/login, then uses the Bearer token on /api/auth/fetch-3B-json. This is not the client’s password.',
    action: 'Paste the API User email into API Username (Email) and the API User password into API Password on the Import MyFreeScoreNow screen. If this server already has partner secrets (MFSN_EMAIL / MFSN_PASSWORD), you may leave those fields blank.',
  },
  {
    n: 4,
    title: 'Enter this client’s MFSN email and MAPIK# token',
    why: 'fetch-3B-json requires the member email plus that member’s client_token (starts with MAPIK#). Each member under A8289 has their own token. The API User cannot pull a file without it — official API surface is login / fetch-3B-json / logout only.',
    action: 'Client Email = the consumer’s MyFreeScoreNow membership email. Client Token = MAPIK#… from their member account or welcome materials. Then click Authenticate & Import Report.',
  },
  {
    n: 5,
    title: 'The pull starts the full process',
    why: 'The tri-bureau JSON is vaulted, parsed with named score models, violation-scanned, and opened on the client file. That is the same pipeline as a PDF upload — live data instead of a download.',
    action: 'After import you land on the report workspace. QA findings, generate letters from the file facts, then Preview Portal to walk every consumer tab.',
  },
];

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
