/**
 * Platform owner allowlist — tenant admins / demo hosts never match.
 * Run: npx tsx tests/platform-owner.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const {
  isPlatformOwnerEmail,
  isPlatformOwnerUser,
  withPlatformOwnerFlag,
  extraOwnerEmailsFromEnv,
  sanitizeTenantInviteRole,
  sanitizePlatformCreatedRole,
  sessionIdFromRequest,
  isPublicBrandAsset,
  isPrivateBrandHubPath,
  PLATFORM_OWNER_EMAILS,
} = await import(pathToFileURL(path.join(root, 'src/lib/platform-owner.ts')).href);

assert(isPlatformOwnerEmail('rjbizsolution23@gmail.com'), 'founder gmail');
assert(isPlatformOwnerEmail('RickyJefferson1006@gmail.com'), 'primary case-insensitive');
assert(isPlatformOwnerEmail('rickjefferson@rickjeffersonsolutions.com'), 'legacy domain');
assert(!isPlatformOwnerEmail('admin@tenant.test'), 'tenant admin email is not owner');
assert(!isPlatformOwnerEmail(''), 'empty email is not owner');
assert(!isPlatformOwnerUser({ email: 'ops@othercro.com', role: 'super_admin' }), 'super_admin role is not enough');
assert(!isPlatformOwnerUser({ email: 'demo@smartfcra.com', role: 'admin' }), 'demo host is not owner');

const flagged = withPlatformOwnerFlag({ id: 'u1', email: 'rjbizsolution23@gmail.com', role: 'admin' });
assert(flagged.platformOwner === true, 'owner flag true');
assert(withPlatformOwnerFlag({ email: 'staff@tenant.test' }).platformOwner === false, 'staff flag false');

assert(extraOwnerEmailsFromEnv({ PLATFORM_OWNER_EMAILS: 'ops@x.test, Rick@Y.TEST' }).includes('ops@x.test'), 'env extras');
assert(isPlatformOwnerEmail('ops@x.test', { PLATFORM_OWNER_EMAILS: 'ops@x.test' }), 'env extra is owner');
assert(isPlatformOwnerEmail('boot@x.test', { PLATFORM_BOOTSTRAP_EMAIL: 'boot@x.test' }), 'bootstrap email is owner');

assert(sanitizeTenantInviteRole('super_admin') === null, 'invite cannot mint super_admin');
assert(sanitizeTenantInviteRole('admin') === 'admin', 'invite admin ok');
assert(sanitizeTenantInviteRole('member') === 'member', 'invite member ok');
assert(sanitizePlatformCreatedRole('super_admin', 'random@tenant.test') === null, 'cannot create outsider super_admin');
assert(sanitizePlatformCreatedRole('super_admin', 'rjbizsolution23@gmail.com') === 'super_admin', 'owner email may be super_admin');
assert(sanitizePlatformCreatedRole('client', 'a@b.test') === 'client', 'client role ok');

assert(sessionIdFromRequest({ authorization: 'Bearer tok_abc' }) === 'tok_abc', 'bearer');
assert(sessionIdFromRequest({ cookie: 'foo=1; fcra_session=tok%2B1; bar=2' }) === 'tok+1', 'cookie decode');
assert(sessionIdFromRequest({ queryToken: 'qtok' }) === 'qtok', 'query token');

assert(isPublicBrandAsset('/static/brand/forms/credit-qualify.html'), 'forms public');
assert(isPublicBrandAsset('/static/brand/brand.css'), 'brand.css public');
assert(!isPublicBrandAsset('/static/brand/index.html'), 'hub index private');
assert(isPrivateBrandHubPath('/static/brand/'), 'hub private');
assert(isPrivateBrandHubPath('/static/brand/marketing/meet-rick.html'), 'meet-rick private');
assert(!isPrivateBrandHubPath('/static/brand/forms/credit-qualify.html'), 'forms not private hub');
assert(PLATFORM_OWNER_EMAILS.length >= 3, 'allowlist');

console.log('✓ platform-owner allowlist + brand hub ACL');
