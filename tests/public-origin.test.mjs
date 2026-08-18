/**
 * Canonical public domain helpers
 * Run: npx tsx tests/public-origin.test.mjs
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
  CANONICAL_HOST,
  CANONICAL_ORIGIN,
  PAGES_HOST,
  canonicalRedirectUrl,
  resolvePublicOrigin,
  isPublicAliasHost,
} = await import(pathToFileURL(path.join(root, 'src/lib/public-origin.ts')).href);

assert(CANONICAL_HOST === 'smartfcra.com', 'canonical host');
assert(CANONICAL_ORIGIN === 'https://smartfcra.com', 'canonical origin');
assert(PAGES_HOST === 'smart-fcra-v2.pages.dev', 'pages host');
assert(isPublicAliasHost('www.smartfcra.com') && isPublicAliasHost(PAGES_HOST), 'alias hosts');
assert(!isPublicAliasHost('smartfcra.com'), 'apex is not an alias');

assert(
  canonicalRedirectUrl('https://www.smartfcra.com/login?plan=professional', 'www.smartfcra.com') ===
    'https://smartfcra.com/login?plan=professional',
  'www redirect keeps path+query',
);
assert(
  canonicalRedirectUrl('https://smart-fcra-v2.pages.dev/demo', 'smart-fcra-v2.pages.dev') ===
    'https://smartfcra.com/demo',
  'pages.dev redirect',
);
assert(
  canonicalRedirectUrl('https://smartfcra.com/app', 'smartfcra.com') === null,
  'apex does not redirect',
);
assert(canonicalRedirectUrl('https://smart-fcra-v2.pages.dev/api/health', PAGES_HOST).includes('/api/health'), 'helper still maps API paths (worker skips /api)');

assert(resolvePublicOrigin({}) === CANONICAL_ORIGIN, 'empty env');
assert(resolvePublicOrigin({ FRONTEND_URL: 'https://smartfcra.com/' }) === CANONICAL_ORIGIN, 'strip slash');
assert(resolvePublicOrigin({ FRONTEND_URL: 'https://www.smartfcra.com' }) === CANONICAL_ORIGIN, 'www env');
assert(resolvePublicOrigin({ FRONTEND_URL: 'https://smart-fcra-v2.pages.dev/' }) === CANONICAL_ORIGIN, 'pages.dev env');
assert(resolvePublicOrigin({ FRONTEND_URL: 'http://localhost:3000' }) === 'http://localhost:3000', 'local wrangler kept');
assert(resolvePublicOrigin({}, 'https://example.com/api/public/plans') === 'https://example.com', 'request origin');
assert(resolvePublicOrigin({}, 'http://localhost:3000/api') === CANONICAL_ORIGIN, 'localhost request');
assert(resolvePublicOrigin({}, 'https://smart-fcra-v2.pages.dev/api/public/plans') === CANONICAL_ORIGIN, 'pages.dev request');

console.log('public-origin.test.mjs OK');
