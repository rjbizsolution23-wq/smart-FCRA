/**
 * SaaS entitlement matching — paid access vs demo sandbox
 * Run: npx tsx tests/saas-entitlement.test.mjs
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
  isDemoSandboxEmail,
  isProtectedOrgId,
  planIdFromCheckoutSession,
  normalizePayEmail,
} = await import(pathToFileURL(path.join(root, 'src/lib/saas-entitlement.ts')).href);

assert(isDemoSandboxEmail('demo@example.com'), 'demo host skipped');
assert(isDemoSandboxEmail('salisha.mcdowell@example.com'), 'salisha skipped');
assert(!isDemoSandboxEmail('owner@creditfirm.com'), 'real firm email allowed');
assert(isProtectedOrgId('org_demo_001'), 'demo org protected');
assert(isProtectedOrgId('org_platform_master'), 'platform org protected');
assert(!isProtectedOrgId('org_real_tenant'), 'real org not protected');
assert(planIdFromCheckoutSession({ metadata: { smartfcra_plan: 'unlimited' } }) === 'unlimited', 'payment link metadata');
assert(planIdFromCheckoutSession({ metadata: { planId: 'enterprise' } }) === 'enterprise', 'checkout planId');
assert(planIdFromCheckoutSession({ metadata: { planId: 'free' } }) === null, 'free is not a saas plan');
assert(normalizePayEmail('  Owner@Firm.COM ') === 'owner@firm.com', 'email normalize');

console.log('saas-entitlement.test.mjs OK');
