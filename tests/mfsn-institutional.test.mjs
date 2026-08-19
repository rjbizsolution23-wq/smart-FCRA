/**
 * MFSN client credential resolution + institutional lender matching smoke tests.
 * Run: npx tsx tests/mfsn-institutional.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const {
  MFSNClient,
  resolveMfsnCredentials,
  resolvePartnerMfsnCredentials,
  resolvePublicSignupMfsnCredentials,
  hasPartnerApiLogin,
  explainMfsnPullError,
  MFSNError,
} = await import(
  pathToFileURL(path.join(root, 'src/engine/mfsn-client.ts')).href
);

const { MASTER_LENDERS_DATABASE } = await import(
  pathToFileURL(path.join(root, 'src/data/funding/lenders-database.ts')).href
);

const { LenderMatchingEngine } = await import(
  pathToFileURL(path.join(root, 'src/data/funding/institutional-matching.ts')).href
);

const { buildInstitutionalProfile, slimInstitutionalReport } = await import(
  pathToFileURL(path.join(root, 'src/data/funding/profile-from-client.ts')).href
);

const { MASTER_BUSINESS_VENDORS } = await import(
  pathToFileURL(path.join(root, 'src/data/funding/business-credit.ts')).href
);

// ── Secrets must never be hardcoded in client source ──
const mfsnSrc = readFileSync(path.join(root, 'src/engine/mfsn-client.ts'), 'utf8');
assert(!/MAPIK#[A-Za-z0-9]{8,}/.test(mfsnSrc), 'mfsn-client must not embed a live client token');
assert(!/Nadia\d/.test(mfsnSrc), 'mfsn-client must not embed password defaults');
assert(!mfsnSrc.includes('rickjefferson@'), 'mfsn-client must not embed email defaults');

assert(resolveMfsnCredentials({}, {}) === null, 'empty creds → null');
assert(
  resolveMfsnCredentials({}, { MFSN_EMAIL: 'a@b.com', MFSN_PASSWORD: 'x' }) === null,
  'missing token → null',
);

const fromEnv = resolveMfsnCredentials(
  {},
  { MFSN_EMAIL: 'env@x.com', MFSN_PASSWORD: 'envpass', MFSN_CLIENT_TOKEN: 'tok', MFSN_API_URL: 'https://example.test' },
);
assert(fromEnv?.email === 'env@x.com', 'env email');
assert(fromEnv?.clientToken === 'tok', 'env token');
assert(fromEnv?.apiUrl === 'https://example.test', 'env api url');

const bodyWins = resolveMfsnCredentials(
  { username: 'body@x.com', password: 'bodypass', secretWord: 'bodytok' },
  { MFSN_EMAIL: 'env@x.com', MFSN_PASSWORD: 'envpass', MFSN_CLIENT_TOKEN: 'envtok' },
);
assert(bodyWins?.email === 'body@x.com', 'body overrides email');
assert(bodyWins?.clientToken === 'bodytok', 'secretWord maps to clientToken');

assert(hasPartnerApiLogin({ MFSN_EMAIL: 'a@b.com', MFSN_PASSWORD: 'x' }) === true, 'api user login without default token');
assert(hasPartnerApiLogin({ MFSN_EMAIL: 'a@b.com' }) === false, 'password required');
const memberPlusPartner = resolveMfsnCredentials(
  { memberToken: 'MAPIK#member' },
  { MFSN_EMAIL: 'api@x.com', MFSN_PASSWORD: 'apipass' },
);
assert(memberPlusPartner?.email === 'api@x.com' && memberPlusPartner?.clientToken === 'MAPIK#member', 'API User from env + member MAPIK#');
{
  const loginFail = new MFSNError(401, 'LOGIN_FAILED', 'Invalid credentials');
  assert(/API User/i.test(explainMfsnPullError(loginFail)), 'login fail explains API User');
  const tokFail = new MFSNError(400, 'TOKEN_INVALID', 'Invalid client token');
  assert(/MAPIK#/i.test(explainMfsnPullError(tokFail)), 'token fail explains member token');
}

const partnerOnly = resolvePartnerMfsnCredentials({
  MFSN_EMAIL: 'partner@x.com',
  MFSN_PASSWORD: 'pp',
  MFSN_CLIENT_TOKEN: 'ptok',
});
assert(partnerOnly?.email === 'partner@x.com', 'partner email from env');
assert(resolvePartnerMfsnCredentials({ MFSN_EMAIL: 'a', MFSN_PASSWORD: 'b' }) === null, 'partner needs token');

const publicSignup = resolvePublicSignupMfsnCredentials(
  { MFSN_EMAIL: 'partner@x.com', MFSN_PASSWORD: 'pp', MFSN_CLIENT_TOKEN: 'ptok' },
  'client-override-tok',
);
assert(publicSignup?.email === 'partner@x.com', 'public signup keeps partner login');
assert(publicSignup?.clientToken === 'client-override-tok', 'client token can override');
assert(
  resolvePublicSignupMfsnCredentials(
    { MFSN_EMAIL: 'partner@x.com', MFSN_PASSWORD: 'pp' },
    'only-client-tok',
  )?.clientToken === 'only-client-tok',
  'client token alone + partner auth works',
);
assert(
  resolvePublicSignupMfsnCredentials({ MFSN_EMAIL: 'partner@x.com', MFSN_PASSWORD: 'pp' }) === null,
  'public signup needs a token from env or client',
);

let threw = false;
try {
  new MFSNClient({ email: '', password: '', clientToken: '' });
} catch (e) {
  threw = e instanceof MFSNError;
}
assert(threw, 'empty config throws MFSNError');

const client = new MFSNClient({
  email: 'a@b.com',
  password: 'p',
  clientToken: 't',
  apiUrl: 'https://api.example.test/',
});
assert(client.getScoreRange(820) === 'EXCEPTIONAL', 'score range exceptional');
assert(client.getScoreRange(700) === 'GOOD', 'score range good');
assert(client.getScoreRange(500) === 'POOR', 'score range poor');

const normalized = client.normalizeReport({
  data: {
    providerViews: [
      {
        provider: 'EFX',
        summary: {
          creditScore: { score: 702, scoreReasons: [{ code: '32' }] },
          revolvingAccounts: { totalAccounts: 2 },
          mortgageAccounts: { totalAccounts: 0 },
          installmentAccounts: { totalAccounts: 1 },
          otherAccounts: { totalAccounts: 0 },
          totalNegativeAccounts: 0,
          totalInquires: 1,
          totalCollections: 0,
          totalPublicRecords: 0,
        },
        revolvingAccounts: [
          {
            accountName: 'Test Card',
            accountType: 'Revolving',
            balanceAmount: { amount: 200 },
            creditLimitAmount: { amount: 2000 },
            isNegative: false,
            isDelinquent: false,
          },
        ],
        inquiries: [{ type: 'HARD', reportedDate: '2026-01-01' }],
        collections: [],
      },
    ],
  },
});
assert(normalized.scores[0].score === 702, 'normalized score');
assert(normalized.scores[0].provider === 'EFX', 'normalized bureau');
assert(normalized.accounts.length === 1, 'normalized accounts');
assert(normalized.summary.totalOpenAccounts === 3, 'summary open accounts');

// ── Institutional DB + matching ──
assert(MASTER_LENDERS_DATABASE.length >= 100, `expected 100+ institutional lenders, got ${MASTER_LENDERS_DATABASE.length}`);
assert(MASTER_BUSINESS_VENDORS.length >= 5, 'business vendors present');
assert(
  MASTER_LENDERS_DATABASE.some((l) => l.name.includes('Navy Federal')),
  'includes Navy Federal',
);

const profile = buildInstitutionalProfile({
  eqScore: 720,
  exScore: 735,
  tuScore: 728,
  utilizationPct: 12,
  inquiries: 1,
  collections: 0,
  highestLimit: 8000,
  monthlyIncome: 9000,
  state: 'GA',
  isBusinessOwner: true,
});
assert(profile.revolvingUtilizationRatio === 0.12, 'util normalized to ratio');
assert(profile.experianScore === 735, 'experian mapped');

const full = LenderMatchingEngine.runComprehensiveMatch(profile);
assert(full.totalLendersEvaluated === MASTER_LENDERS_DATABASE.length, 'evaluates all lenders');
assert(full.topCreditUnions.length >= 1, 'CU bucket');
assert(full.topOverall?.length || full.allMatchesSorted.length >= 1, 'overall matches');

const slim = slimInstitutionalReport(full);
assert(slim.topOverall.length <= 15, 'slim caps overall');
assert(typeof slim.totalEstimatedCapitalPotential === 'number', 'capital potential');
assert(!('allMatchesSorted' in slim), 'slim drops full match dump');

console.log('mfsn-institutional.test.mjs OK');
