/**
 * Offline unit tests for auth + crypto (no Cloudflare OAuth required).
 * Run: node --experimental-strip-types tests/unit-auth-crypto.mjs
 * or:  npx tsx tests/unit-auth-crypto.mjs
 */
import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Dynamic import of compiled-capable TS via vite-node isn't available; duplicate minimal checks via dynamic eval of built logic.
// Prefer importing from source with Node experimental strip types when available.

async function loadAuth() {
  try {
    return await import(pathToFileURL(path.join(root, 'src/lib/auth.ts')).href);
  } catch {
    // Fallback: transpile-free reimplementation smoke using Web Crypto only
    return null;
  }
}

async function loadCrypto() {
  try {
    return await import(pathToFileURL(path.join(root, 'src/lib/crypto.ts')).href);
  } catch {
    return null;
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const auth = await loadAuth();
const cryptoMod = await loadCrypto();

if (!auth || !cryptoMod) {
  console.error('Could not import TS modules directly. Run via: npx tsx tests/unit-auth-crypto.mjs');
  process.exit(1);
}

const { hashPassword, verifyPassword, needsPasswordRehash, verifyTOTP, generateMFASecret } = auth;
const { encryptText, decryptText } = cryptoMod;

const hash = await hashPassword('demo123456');
assert(hash.startsWith('pbkdf2$'), 'hash uses pbkdf2 prefix');
assert(await verifyPassword('demo123456', hash), 'verify accepts correct password');
assert(!(await verifyPassword('wrong-password', hash)), 'verify rejects wrong password');
assert(!needsPasswordRehash(hash), 'new hash does not need rehash');

const legacy = 'f6226b26a16262900b20a0cdb4a0148268e70d08dc998301ddb36af13418c8d1'; // demo123 legacy
assert(await verifyPassword('demo123', legacy), 'legacy SHA-256 verify works for demo123');
assert(needsPasswordRehash(legacy), 'legacy hash needs rehash');

let threw = false;
try {
  await encryptText('ssn-data', undefined);
} catch {
  threw = true;
}
assert(threw, 'encrypt fails closed without key');

const key = 'local-dev-only-pii-key-change-in-production-32+';
const enc = await encryptText('sensitive-report-text', key);
assert(!enc.startsWith('PLAIN:'), 'ciphertext is not plaintext');
assert((await decryptText(enc, key)) === 'sensitive-report-text', 'round-trip decrypt');
assert((await decryptText('PLAIN:legacy', key)) === 'legacy', 'legacy PLAIN readable');

const secret = generateMFASecret();
assert(secret.length >= 16, 'MFA secret length');

console.log('PASS: auth + crypto enterprise unit checks');
