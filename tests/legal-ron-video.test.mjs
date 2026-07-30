/**
 * Legal contracts + RON + video helpers
 * Run: npx tsx tests/legal-ron-video.test.mjs
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
  renderContract,
  sha256Hex,
  ESIGN_DISCLOSURE_TEXT,
  ESIGN_DISCLOSURE_VERSION,
  documentRequiresNotarization,
  CROA_TEMPLATE_VERSION,
  LPOA_TEMPLATE_VERSION,
} = await import(pathToFileURL(path.join(root, 'src/data/legal-contracts.ts')).href);

const {
  DEFAULT_RON_STATE_RULES,
  resolveVendor,
  getRonStateRule,
} = await import(pathToFileURL(path.join(root, 'src/lib/ron-service.ts')).href);

const { videoConfigured, createTwilioVideoAccessToken } = await import(
  pathToFileURL(path.join(root, 'src/lib/twilio-video.ts')).href
);

const { listEmailTemplates } = await import(
  pathToFileURL(path.join(root, 'src/lib/email-templates.ts')).href
);

const party = {
  clientName: 'Salisha McDowell',
  clientAddress: '123 Main St',
  clientCity: 'Albuquerque',
  clientState: 'NM',
  clientZip: '87101',
  clientEmail: 'salisha@example.com',
  orgName: 'Demo Legal Firm',
  orgAddress: '1 Firm Way',
  orgEmail: 'ops@example.com',
  planName: 'Professional',
  monthlyFee: '$197/mo portal access (disclosed separately from repair performance fees)',
};

const croa = renderContract('croa_service', party);
assert(croa.templateVersion === CROA_TEMPLATE_VERSION, 'CROA version');
assert(croa.content.includes('CREDIT REPAIR ORGANIZATIONS ACT'), 'CROA title');
assert(croa.content.includes('NOTICE OF CANCELLATION'), 'CROA cancellation');
assert(croa.content.includes('Telemarketing Sales Rule'), 'TSR mention');
assert(croa.content.includes('State of NM'), 'governing state');
assert(croa.requiresNotarization === false, 'CROA typically e-sign only');

const lpoa = renderContract('limited_poa', party);
assert(lpoa.templateVersion === LPOA_TEMPLATE_VERSION, 'LPOA version');
assert(lpoa.requiresNotarization === true, 'LPOA requires notarization flag');
assert(lpoa.content.includes('LIMITED POWER OF ATTORNEY'), 'LPOA title');
assert(lpoa.content.includes('POWERS NOT GRANTED'), 'LPOA limits');

const esign = renderContract('esign_consent', party);
assert(esign.content.includes(ESIGN_DISCLOSURE_VERSION), 'esign version in body');

const h1 = await sha256Hex(croa.content);
const h2 = await sha256Hex(croa.content);
assert(h1 === h2 && h1.length === 64, 'stable sha256');

assert(documentRequiresNotarization('limited_poa'), 'poa needs notary');
assert(documentRequiresNotarization('fed-affidavit'), 'affidavit needs notary');
assert(!documentRequiresNotarization('bureau-dispute'), 'dispute letter usually no notary');

assert(DEFAULT_RON_STATE_RULES.length >= 50, 'state matrix coverage');
assert(DEFAULT_RON_STATE_RULES.find((s) => s.state_code === 'TX')?.recording_retention_years === 5, 'TX retention');
assert(DEFAULT_RON_STATE_RULES.find((s) => s.state_code === 'FL')?.ron_allowed === 1, 'FL RON');

const nm = await getRonStateRule({ DB: { prepare: () => ({ bind: () => ({ first: async () => null }) }) } }, 'NM');
assert(nm && nm.ron_allowed === 1, 'NM allowed via default');

assert(resolveVendor({}) === 'sandbox', 'default sandbox');
assert(resolveVendor({ RON_VENDOR: 'proof', RON_VENDOR_API_KEY: 'x' }) === 'proof', 'vendor when keyed');

assert(videoConfigured({}) === false, 'video not configured without keys');
const tok = await createTwilioVideoAccessToken({}, { identity: 'client:1', roomName: 'test-room' });
assert(tok.simulated === true && tok.token.startsWith('sim_'), 'simulated token');

const templates = listEmailTemplates();
for (const id of ['contract_ready', 'video_conference_invite', 'ron_session_update', 'onboarding_day1', 'team_invite', 'admin_daily_digest']) {
  assert(templates.some((t) => t.id === id), `template ${id}`);
}

assert(ESIGN_DISCLOSURE_TEXT.includes('Electronic Signatures in Global and National Commerce Act'), 'ESIGN act cite');

console.log('legal-ron-video.test.mjs: OK', {
  croaHash: h1.slice(0, 12),
  states: DEFAULT_RON_STATE_RULES.length,
  templates: templates.length,
});
