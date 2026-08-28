/**
 * Lob mailing helper tests
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
  lobConfigured,
  normalizeLobKey,
  normalizeLobMailClass,
  resolveMailClass,
  letterHtmlFromPlainText,
  LOB_LETTER_PAGE_CSS,
  lobPublicStatus,
  lobMode,
} = await import(pathToFileURL(path.join(root, 'src/lib/lob.ts')).href);

assert(!lobConfigured({}), 'not configured without env');
assert(lobConfigured({ LOB_SECRET_KEY: 'test_abc' }), 'configured with secret');
assert(normalizeLobKey('Test_ABC') === 'test_ABC', 'normalize Test_ prefix');
assert(normalizeLobKey('Live_pub_XYZ') === 'live_pub_XYZ', 'normalize Live_pub_');
assert(normalizeLobMailClass('certified') === 'CERTIFIED', 'certified class');
assert(resolveMailClass({}) === 'FIRST_CLASS', 'default class');
assert(letterHtmlFromPlainText('T', 'line1\nline2').includes('<br/>'), 'html breaks');
assert(LOB_LETTER_PAGE_CSS.includes('size: Letter'), 'mail HTML declares US Letter page size');
assert(letterHtmlFromPlainText('T', 'line1').includes('width: 8.5in'), 'mail HTML fixes US Letter width');
assert(lobMode({ LOB_SECRET_KEY: 'live_x' }) === 'live', 'live mode from key');
assert(lobPublicStatus({ LOB_SECRET_KEY: 'test_x' }).label.includes('test'), 'status label');

console.log('lob.test.mjs: all assertions passed');
