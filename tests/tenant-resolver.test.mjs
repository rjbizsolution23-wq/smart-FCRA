/**
 * Run: npx tsx tests/tenant-resolver.test.mjs
 */
import assert from 'node:assert/strict';
import {
  parseTenantSubdomain,
  validateSubdomain,
  tenantPortalOrigin,
  RESERVED_SUBDOMAINS,
} from '../src/lib/tenant-resolver.ts';
import { applyTemplateVars } from '../src/lib/tenant-template-vars.ts';

assert.equal(parseTenantSubdomain('newcreditservices.smartfcra.com'), 'newcreditservices');
assert.equal(parseTenantSubdomain('smartfcra.com'), null);
assert.equal(parseTenantSubdomain('www.smartfcra.com'), null);
assert.equal(parseTenantSubdomain('app.smartfcra.com'), null);
assert.equal(RESERVED_SUBDOMAINS.has('app'), true);

const ok = validateSubdomain('newcreditservices');
assert.ok(ok.ok && ok.normalized === 'newcreditservices');

const bad = validateSubdomain('ab');
assert.ok(!bad.ok);

assert.equal(tenantPortalOrigin('newcreditservices'), 'https://newcreditservices.smartfcra.com');

const rendered = applyTemplateVars('Hello {{business.name}} — visit {{portal.url}}', {
  'business.name': 'New Credit Services',
  'portal.url': 'https://newcreditservices.smartfcra.com',
  org_name: 'New Credit Services',
});
assert.match(rendered, /New Credit Services/);
assert.match(rendered, /smartfcra.com/);

console.log('tenant-resolver tests passed');
