/**
 * Platform extensions: demo vault, BYOK, credits, gateways.
 * Run: npx tsx tests/platform-extensions.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const {
  resolveOrgEncryptionKey,
  encryptionReady,
  DEMO_SANDBOX_VAULT_KEY,
  renderOrgTemplate,
  AI_CREDIT_PACKS,
  BYOK_AI_PROVIDERS,
  PAYMENT_GATEWAYS,
} = await import(pathToFileURL(path.join(root, 'src/lib/platform-extensions.ts')).href);

const { DEMO_ORG_ID } = await import(pathToFileURL(path.join(root, 'src/engine/demo-experience.ts')).href);

assert(resolveOrgEncryptionKey('x'.repeat(32), 'org_paid') === 'x'.repeat(32), 'platform key used');
assert(resolveOrgEncryptionKey(undefined, DEMO_ORG_ID) === DEMO_SANDBOX_VAULT_KEY, 'demo sandbox key');
assert(encryptionReady(undefined, DEMO_ORG_ID), 'demo encryption ready without platform key');
assert(!encryptionReady(undefined, 'org_paid'), 'paid org needs platform key');
assert(BYOK_AI_PROVIDERS.length >= 5, 'BYOK providers listed');
assert(PAYMENT_GATEWAYS.some((g) => g.id === 'authorize_net'), 'authorize.net');
assert(PAYMENT_GATEWAYS.some((g) => g.id === 'nmi'), 'nmi');
assert(AI_CREDIT_PACKS.length >= 3, 'credit packs');
assert(renderOrgTemplate('Hello {{client_name}}', { client_name: 'Demo' }) === 'Hello Demo', 'template vars');

const { CONTRACT_TEMPLATE_TYPE_MAP, AI_PROVIDER_BYOK_MAP } = await import(pathToFileURL(path.join(root, 'src/lib/platform-extensions.ts')).href);
assert(CONTRACT_TEMPLATE_TYPE_MAP.croa_service === 'croa', 'croa template map');
assert(AI_PROVIDER_BYOK_MAP.groq === 'groq', 'byok map');

const { EDUCATION_LIBRARY } = await import(pathToFileURL(path.join(root, 'src/data/portal-education.ts')).href);
assert(EDUCATION_LIBRARY.length >= 12, 'academy has 12+ lessons');
assert(EDUCATION_LIBRARY.some((l) => l.id === 'comp-01'), 'compliance lesson');

console.log('platform-extensions tests passed', { lessons: EDUCATION_LIBRARY.length });
