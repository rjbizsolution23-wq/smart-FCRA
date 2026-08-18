import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const {
  isWhitelistedMfsnOperatorEmail,
  primaryMfsnOperatorEmail,
  MFSN_OPERATOR_ACCOUNTS,
  MFSN_API_BASE,
  MFSN_AFFILIATE_API_USER_STEPS,
  formatMfsnAffiliateApiUserGuide,
  MFSN_AFFILIATE_PORTAL_URL,
} = await import(pathToFileURL(path.join(root, 'src/data/mfsn-operator-accounts.ts')).href);

assert(primaryMfsnOperatorEmail() === 'rickyjefferson1006@gmail.com', 'primary');
assert(isWhitelistedMfsnOperatorEmail('rickyjefferson1006@gmail.com'), 'whitelist primary');
assert(isWhitelistedMfsnOperatorEmail('RickJefferson@RickJeffersonSolutions.com'), 'whitelist legacy case');
assert(!isWhitelistedMfsnOperatorEmail('random@example.com'), 'reject outsider');
assert(MFSN_OPERATOR_ACCOUNTS.length >= 2, 'accounts');
assert(MFSN_API_BASE.includes('myfreescorenow.com'), 'api base');
assert(!JSON.stringify(MFSN_OPERATOR_ACCOUNTS).includes('Nadia'), 'no passwords in source');
assert(MFSN_AFFILIATE_API_USER_STEPS.length === 4, 'four affiliate API-user steps');
assert(MFSN_AFFILIATE_API_USER_STEPS.some((s) => /API user/i.test(s.title)), 'API user step');
assert(/client token/i.test(formatMfsnAffiliateApiUserGuide()), 'guide mentions client token');
assert(MFSN_AFFILIATE_PORTAL_URL.includes('myfreescorenow.com/login'), 'portal url');

console.log('mfsn-operator-accounts.test.mjs OK');
