/**
 * Branded comms helpers
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const { formatBrandedSms } = await import(pathToFileURL(path.join(root, 'src/lib/comms-branding.ts')).href);

assert(formatBrandedSms('Hello', 'Acme Credit').includes('Acme Credit'), 'brand prefix');
assert(formatBrandedSms('Hello', 'Acme Credit').includes('STOP'), 'stop footer');

console.log('comms-branding tests passed');
