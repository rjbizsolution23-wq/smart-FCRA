/**
 * Public MFSN signup helpers
 * Run: npx tsx tests/mfsn-signup.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const {
  parsePersonNameFromReport,
  parseAddressFromReport,
  extractSsnLast4,
  isPortalAnalysisUnlocked,
  resolvePublicSignupOrgId,
  isEmailShaped,
} = await import(pathToFileURL(path.join(root, 'src/lib/mfsn-signup.ts')).href);

{
  const n = parsePersonNameFromReport({ names: ['MCDOWELL, SALISHA'] });
  assert(n.firstName.includes('Salisha') || n.firstName === 'Salisha', 'first ' + n.firstName);
  assert(n.lastName.includes('Mcdowell') || n.lastName === 'Mcdowell' || n.lastName === 'McDowell', 'last ' + n.lastName);
  console.log('✓ name parse last, first');
}

{
  const n = parsePersonNameFromReport({ names: ['Rick Jefferson'] });
  assert(n.firstName === 'Rick', 'first');
  assert(n.lastName === 'Jefferson', 'last');
  console.log('✓ name parse first last');
}

{
  const a = parseAddressFromReport({ addresses: ['1342 NM 333, Tijeras, NM 87059'] });
  assert(a.city === 'Tijeras', 'city');
  assert(a.state === 'NM', 'state');
  assert(a.zip === '87059', 'zip');
  console.log('✓ address parse');
}

{
  assert(extractSsnLast4({ ssns: ['***-**-1234'] }) === '1234', 'ssn');
  assert(extractSsnLast4({ ssns: ['123456789'] }) === '6789', 'ssn digits');
  console.log('✓ ssn last4');
}

{
  assert(isPortalAnalysisUnlocked({ portal_analysis_unlocked: 1 }) === true, 'unlocked 1');
  assert(isPortalAnalysisUnlocked({ portal_analysis_unlocked: 0 }) === false, 'locked 0');
  assert(isPortalAnalysisUnlocked({}) === true, 'legacy unlocked');
  assert(resolvePublicSignupOrgId({}) === 'org_platform_master', 'default org');
  assert(isEmailShaped('a@b.com') === true, 'email');
  assert(isEmailShaped('not-an-email') === false, 'not email');
  console.log('✓ unlock + org helpers');
}

console.log('mfsn-signup tests passed');
