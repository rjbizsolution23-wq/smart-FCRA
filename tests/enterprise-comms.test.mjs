/**
 * Enterprise Comms Pack — branding, templates, workflow helpers
 * Run: npx tsx tests/enterprise-comms.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { loadOrgBrand, brandVars } = await import(
  pathToFileURL(path.join(root, 'src/lib/org-branding.ts')).href
);

const {
  listEmailTemplates,
  getEmailTemplate,
  brandedShell,
  sendTemplatedClientMessage,
} = await import(pathToFileURL(path.join(root, 'src/lib/email-templates.ts')).href);

const { portalBaseUrl, isSyntheticPortalEmail } = await import(
  pathToFileURL(path.join(root, 'src/lib/portal-services.ts')).href
);

// Branding defaults
const brand = await loadOrgBrand({}, null);
assert(brand.name === 'RJ Business Solutions', 'default brand name');
assert(brand.owner.includes('Rick Jefferson'), 'default owner');
const bv = brandVars(brand);
assert(bv.brandName === brand.name && bv.brandFromName === brand.fromName, 'brandVars');

const envBrand = await loadOrgBrand({ COMPANY_NAME: 'Acme Credit Law', COMPANY_OWNER: 'Acme Owner' }, null);
assert(envBrand.name === 'Acme Credit Law', 'env brand override');
assert(envBrand.owner === 'Acme Owner', 'env owner override');

// Template catalog completeness
const templates = listEmailTemplates();
const required = [
  'account_verify',
  'password_reset',
  'portal_welcome',
  'staff_message',
  'tradeline_confirmed',
  'onboarding_day1',
  'onboarding_day3',
  'unsigned_contract_nudge',
  'dispute_due_reminder',
  'admin_daily_digest',
  'team_invite',
];
for (const id of required) {
  assert(templates.some((t) => t.id === id), `missing template ${id}`);
}

const shell = brandedShell('Hello', '<p>Body</p>', { brandName: 'Acme', brandOwner: 'Acme LLC' });
assert(shell.includes('Acme') && shell.includes('Body'), 'branded shell');

const welcome = getEmailTemplate('portal_welcome');
const html = welcome.html({
  brandName: 'Acme',
  clientName: 'Salisha',
  email: 's@example.com',
  temporaryPassword: 'Temp123!',
  loginUrl: 'https://example.com/',
});
assert(html.includes('Salisha') && html.includes('Temp123!'), 'portal welcome vars');

assert(isSyntheticPortalEmail('x@smartfcra.local') === true, 'synthetic local');
assert(isSyntheticPortalEmail('real@gmail.com') === false, 'real email');
assert(portalBaseUrl({}).includes('smartfcra.com'), 'default portal base');

// Simulated send path (no email keys) — honest status
const fakeDb = {
  prepare() {
    return {
      bind() {
        return this;
      },
      async run() {
        return { success: true };
      },
      async first() {
        return null;
      },
      async all() {
        return { results: [] };
      },
    };
  },
};

const sent = await sendTemplatedClientMessage(
  { DB: fakeDb },
  {
    templateId: 'staff_message',
    orgId: 'org1',
    clientId: 'client1',
    email: 'client@example.com',
    notifyEmail: true,
    skipClientAlert: true,
    vars: { clientName: 'Test', subject: 'Hi', body: 'Hello', portalUrl: 'https://x/' },
  },
);
assert(sent.deliveryStatus === 'simulated', `expected simulated, got ${sent.deliveryStatus}`);
assert(sent.channels?.simulated === true || sent.channels?.email === 'simulated', 'channels mark simulated');
assert(sent.ok === true, 'simulated is operationally ok with honest deliveryStatus');

console.log('enterprise-comms.test.mjs: OK', {
  templates: templates.length,
  brand: brand.name,
  deliveryStatus: sent.deliveryStatus,
});
