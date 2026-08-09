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
} = await import(pathToFileURL(path.join(root, 'src/data/mfsn-operator-accounts.ts')).href);

assert(primaryMfsnOperatorEmail() === 'rickyjefferson1006@gmail.com', 'primary');
assert(isWhitelistedMfsnOperatorEmail('rickyjefferson1006@gmail.com'), 'whitelist primary');
assert(isWhitelistedMfsnOperatorEmail('RickJefferson@RickJeffersonSolutions.com'), 'whitelist legacy case');
assert(!isWhitelistedMfsnOperatorEmail('random@example.com'), 'reject outsider');
assert(MFSN_OPERATOR_ACCOUNTS.length >= 2, 'accounts');
assert(MFSN_API_BASE.includes('myfreescorenow.com'), 'api base');
assert(!JSON.stringify(MFSN_OPERATOR_ACCOUNTS).includes('Nadia'), 'no passwords in source');

console.log('mfsn-operator-accounts.test.mjs OK');
