/**
 * Support CRM + Click2Mail + webhooks unit tests
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { normalizeClick2MailClass, resolveMailClass } = await import(
  pathToFileURL(path.join(root, 'src/lib/click2mail.ts')).href
);
const { detectRedFlagTerms, supportPlaybookPayload } = await import(
  pathToFileURL(path.join(root, 'src/data/support-playbook.ts')).href
);
const { generateApiKeyMaterial, API_KEY_PREFIX } = await import(
  pathToFileURL(path.join(root, 'src/lib/api-keys.ts')).href
);
const { WEBHOOK_EVENTS, parseWebhookEvents } = await import(
  pathToFileURL(path.join(root, 'src/lib/outbound-webhooks.ts')).href
);

assert(normalizeClick2MailClass('certified') === 'CERTIFIED', 'certified → CERTIFIED');
assert(normalizeClick2MailClass('First Class') === 'FIRST_CLASS', 'First Class → FIRST_CLASS');
assert(normalizeClick2MailClass('standard') === 'STANDARD', 'standard → STANDARD');
assert(resolveMailClass({ bodyMailClass: 'CERTIFIED' }) === 'CERTIFIED', 'body wins');
assert(resolveMailClass({ orgDefault: 'STANDARD' }) === 'STANDARD', 'org default');

const flags = detectRedFlagTerms('Customer wants a refund and may chargeback');
assert(flags.includes('refund'), 'detect refund');
assert(flags.includes('chargeback'), 'detect chargeback');

const pb = supportPlaybookPayload();
assert(pb.scenarios.length >= 10, 'playbook scenarios');
assert(pb.dispositions.includes('Cancellation'), 'cancellation disposition');

const key = await generateApiKeyMaterial();
assert(key.raw.startsWith(API_KEY_PREFIX), 'api key prefix');
assert(key.hash.length === 64, 'sha256 hash hex');

assert(WEBHOOK_EVENTS.includes('letter.sent'), 'letter.sent event');
assert(parseWebhookEvents(JSON.stringify(['letter.sent', 'bogus'])).length === 1, 'filter events');

console.log('support-crm.test.mjs: all assertions passed');
