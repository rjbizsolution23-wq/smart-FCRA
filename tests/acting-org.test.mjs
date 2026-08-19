/**
 * Super-admin acting-org header routing
 * Run: npx tsx tests/acting-org.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { shouldApplyActingOrg } = await import(pathToFileURL(path.join(root, 'src/lib/acting-org.ts')).href);

assert(shouldApplyActingOrg('/api/clients') === true, 'CRM clients uses acting org');
assert(shouldApplyActingOrg('/api/billing/checkout') === true, 'billing uses acting org');
assert(shouldApplyActingOrg('/api/admin/overview-stats') === true, 'overview stats uses acting org');
assert(shouldApplyActingOrg('/api/admin/privacy-requests') === true, 'privacy queue uses acting org');
assert(shouldApplyActingOrg('/api/admin/organizations') === false, 'tenant directory stays global');
assert(shouldApplyActingOrg('/api/admin/organizations/abc/summary') === false, 'org summary stays global');
assert(shouldApplyActingOrg('/api/admin/users') === false, 'user registry stays global');
assert(shouldApplyActingOrg('/api/admin/global-clients') === false, 'global clients stays global');
assert(shouldApplyActingOrg('/api/admin/stripe/ensure-catalog') === false, 'catalog stays global');

console.log('acting-org.test.mjs OK');
