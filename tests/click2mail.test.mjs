/**
 * Click2Mail helper tests
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { click2mailConfigured, normalizeClick2MailClass } = await import(
  pathToFileURL(path.join(root, 'src/lib/click2mail.ts')).href
);

assert(!click2mailConfigured({}), 'not configured without env');
assert(click2mailConfigured({
  CLICK2MAIL_USERNAME: 'u',
  CLICK2MAIL_AUTH_BASIC: 'x',
  CLICK2MAIL_API_URL: 'https://api.example.com',
}), 'configured with all vars');

assert(normalizeClick2MailClass(undefined) === 'FIRST_CLASS', 'default FIRST_CLASS');

console.log('click2mail.test.mjs: all assertions passed');
