/**
 * Mail postage billing unit tests
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
  postageCostCents,
  normalizePostageMailClass,
  parseOrgMailSettings,
  payerOrder,
  mailPostagePublicCatalog,
  ORG_MAIL_CREDIT_PACKS,
  CLIENT_MAIL_CREDIT_PACKS,
} = await import(pathToFileURL(path.join(root, 'src/lib/mail-postage.ts')).href);

assert(normalizePostageMailClass('certified') === 'CERTIFIED', 'certified class');
assert(normalizePostageMailClass('first-class') === 'FIRST_CLASS', 'first class');
assert(postageCostCents('FIRST_CLASS') === 149, 'first class rate');
assert(postageCostCents('STANDARD') === 99, 'standard rate');
assert(postageCostCents('CERTIFIED') === 899, 'certified rate');

const settings = parseOrgMailSettings({ mail_postage_payer: 'client', billing_comped: true });
assert(settings.mailPostagePayer === 'client', 'payer mode');
assert(settings.billingComped === true, 'billing comped');

assert(payerOrder('org').join(',') === 'org', 'org only');
assert(payerOrder('client_then_org').join(',') === 'client,org', 'client then org');
assert(payerOrder('org_then_client', 'client')[0] === 'client', 'preferred client');

const catalog = mailPostagePublicCatalog();
assert(catalog.orgPacks.length === ORG_MAIL_CREDIT_PACKS.length, 'org packs');
assert(catalog.clientPacks.length === CLIENT_MAIL_CREDIT_PACKS.length, 'client packs');
assert(ORG_MAIL_CREDIT_PACKS[0].creditCents > 0, 'pack credits');

console.log('mail-postage.test.mjs: all assertions passed');
