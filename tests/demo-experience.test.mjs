/**
 * Interactive demo: intent router, token hash, one-pull guard, tour catalog.
 * Run: npx tsx tests/demo-experience.test.mjs
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
  DEMO_TOUR,
  DEMO_PRODUCT_KNOWLEDGE,
  DEMO_CLIENT_NAME,
  isSandboxDemoOrg,
  sandboxClientHideSql,
  routeDemoIntent,
  fallbackDemoReply,
  parseAgentActions,
  hashDemoToken,
  normalizeDemoEmail,
  normalizeDemoPhone,
  livePullBlocked,
  buildDemoConvertUrl,
  DEMO_MAX_LIVE_PULLS,
} = await import(pathToFileURL(path.join(root, 'src/engine/demo-experience.ts')).href);

assert(DEMO_TOUR.length >= 10, 'tour covers the product');
assert(DEMO_TOUR.every((s) => s.title && s.body && s.whyBuy && s.page), 'each tour step sells a screen');
assert(!/letter templates/i.test(DEMO_PRODUCT_KNOWLEDGE), 'knowledge must not sell templates');
assert(/GENERATED from selected violations/i.test(DEMO_PRODUCT_KNOWLEDGE), 'knowledge states generated letters');

{
  const v = routeDemoIntent('show me the violations and FDCPA findings');
  assert(v.matched && v.actions[0].page === 'violations', 'violations intent');
  const l = routeDemoIntent('how do you generate the 611 letter?');
  assert(l.matched && l.actions[0].page === 'generate-doc', 'letter intent');
  const p = routeDemoIntent('what does the consumer portal look like?');
  assert(p.matched && p.actions[0].type === 'impersonate', 'portal intent');
  const m = routeDemoIntent('I want to pull my MyFreeScoreNow report with MAPIK');
  assert(m.matched && m.actions[0].type === 'openLiveMfsn', 'live mfsn intent');
}

{
  const fb = fallbackDemoReply('do you use templates?');
  assert(/generated from the violations/i.test(fb.reply), 'template question is corrected');
  assert(fb.actions[0].page === 'generate-doc', 'template question navigates to generate');
}

{
  const parsed = parseAgentActions('Hello.\n```json\n{"reply":"Opening scores","actions":[{"type":"navigate","page":"full-analysis"}]}\n```');
  assert(parsed.reply === 'Opening scores', 'extract reply');
  assert(parsed.actions[0].page === 'full-analysis', 'extract action');
}

{
  const a = await hashDemoToken('abc');
  const b = await hashDemoToken('abc');
  const c = await hashDemoToken('xyz');
  assert(a === b && a.length === 64 && a !== c, 'sha-256 hex token hash');
}

assert(normalizeDemoEmail('  Rick@Firm.COM ') === 'rick@firm.com', 'email');
assert(normalizeDemoPhone('(555) 123-4567') === '5551234567', 'phone digits');
assert(livePullBlocked({ mfsn_pulls: 0 }) === false, 'first pull allowed');
assert(livePullBlocked({ mfsn_pulls: DEMO_MAX_LIVE_PULLS }) === true, 'second pull blocked');

{
  const url = buildDemoConvertUrl({
    businessName: 'Acme Credit Repair LLC',
    email: 'jordan@acme-credit.test',
    firstName: 'Jordan',
    lastName: 'Lee',
    phone: '5551234567',
  });
  assert(url.startsWith('/login?'), 'convert is login register');
  assert(url.includes('mode=register') && url.includes('from=demo'), 'convert flags');
  assert(url.includes('org=Acme') && url.includes('email=jordan'), 'firm identity on convert url');
}

{
  const c = routeDemoIntent('I want to start your organization from this demo');
  assert(c.matched && c.actions[0].type === 'convertToSignup', 'convert intent');
}

assert(DEMO_TOUR.find((s) => s.id === 'upload')?.data?.clientId === 'cli_demo_001', 'upload tour pins Demo Client');
assert(DEMO_TOUR.find((s) => s.id === 'letters')?.data?.clientId === 'cli_demo_001', 'letter tour pins Demo Client');
assert(DEMO_TOUR.find((s) => s.id === 'client')?.title === 'Sample client file', 'tour uses generic sample client');
assert(!/Salisha/i.test(DEMO_TOUR.map((s) => s.body + s.title).join(' ')), 'tour copy has no named person');

assert(DEMO_CLIENT_NAME === 'Demo Client', 'sandbox display name is generic');
assert(isSandboxDemoOrg('org_demo_001') === true, 'demo org');
assert(isSandboxDemoOrg('org_paid') === false, 'paid org');
{
  const hidden = sandboxClientHideSql('org_paid', 'c.id', 'c.email');
  assert(hidden.sql.includes('c.id') && hidden.binds.length === 2, 'paid CRM hides sample client');
  const shown = sandboxClientHideSql('org_demo_001', 'c.id', 'c.email');
  assert(shown.sql === '' && shown.binds.length === 0, 'demo org keeps sample client');
}

console.log('demo-experience tests passed');
