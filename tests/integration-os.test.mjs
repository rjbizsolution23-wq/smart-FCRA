/**
 * Integration OS infrastructure tests
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { scoreIdentityMatch } = await import(pathToFileURL(path.join(root, 'src/lib/identity-matching.ts')).href);
const { scanOutboundCopy } = await import(pathToFileURL(path.join(root, 'src/lib/copy-qa.ts')).href);
const { canSyncFieldToIntegration, SYSTEM_OF_RECORD } = await import(pathToFileURL(path.join(root, 'src/lib/integration-sync-rules.ts')).href);
const { ghlIdempotencyKey } = await import(pathToFileURL(path.join(root, 'src/lib/ghl-inbound.ts')).href);
const { maskSecretPreview } = await import(pathToFileURL(path.join(root, 'src/lib/credential-vault.ts')).href);

assert(scoreIdentityMatch({ email: 'john@gmail.com' }, { email: 'john@gmail.com' }) >= 0.4, 'email match scores');
assert(!canSyncFieldToIntegration('ghl', 'ssn', 'sensitive_pii').allowed, 'SSN blocked from GHL');
assert(canSyncFieldToIntegration('ghl', 'firstName', 'pii').allowed, 'firstName allowed to GHL');
assert(SYSTEM_OF_RECORD['case.findings'].owner === 'smart_fcra', 'findings owned by Smart FCRA');
assert(ghlIdempotencyKey({ type: 'ContactUpdate', contactId: 'c1', timestamp: 't1' }).includes('c1'), 'idempotency key');
assert(maskSecretPreview('abcdefghijklmnop').endsWith('mnop'), 'vault mask shows last 4');

console.log('integration-os.test.mjs: all assertions passed');
