/**
 * Full interactive demo flow: gate → enter → tour → agent → page map → live-pull cap.
 * Run: npx tsx tests/demo-flow.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function createDemoDb() {
  const orgs = [{ id: 'org_demo_001', name: 'Smart FCRA Demo', plan: 'professional', settings: '{}' }];
  const users = [{
    id: 'usr_demo_001', org_id: 'org_demo_001', email: 'demo@example.com',
    name: 'Demo Host', role: 'admin', is_active: 1, must_change_password: 0, mfa_enabled: 0, password_hash: 'x',
  }];
  const clients = [{
    id: 'cli_demo_001', org_id: 'org_demo_001', email: 'salisha.mcdowell@example.com',
    first_name: 'Demo', last_name: 'Client',
  }];
  const demoSessions = [];
  const sessions = [];
  const store = { orgs, users, clients, demoSessions, sessions, leads: [], turns: [], activity: [] };

  return {
    store,
    prepare(sql) {
      const s = String(sql);
      const binds = [];
      const stmt = {
        bind(...a) { binds.push(...a); return stmt; },
        async first() {
          if (s.includes('FROM demo_sessions') && s.includes('token_hash')) {
            return demoSessions.find((r) => r.token_hash === binds[0]) || null;
          }
          if (s.includes('FROM demo_sessions') && s.includes('auth_session_id')) {
            return demoSessions.find((r) => r.auth_session_id === binds[0]) || null;
          }
          if (s.includes('FROM demo_sessions') && s.includes('mfsn_pulls >= 1')) {
            return demoSessions.find((r) => (r.email === binds[0] || r.phone === binds[1]) && r.mfsn_pulls >= 1 && r.id !== binds[2]) || null;
          }
          if (s.includes('FROM demo_sessions') && s.includes('email = ?')) {
            return demoSessions.find((r) => r.email === binds[0]) || null;
          }
          if (s.includes('FROM sessions s JOIN users u')) {
            const sess = sessions.find((r) => r.id === binds[0]);
            if (!sess) return null;
            const u = users.find((x) => x.id === sess.user_id);
            if (!u) return null;
            return {
              ...sess, user_id: u.id, user_name: u.name, user_email: u.email, user_role: u.role,
              is_active: u.is_active, org_id: u.org_id, must_change_password: 0, mfa_enabled: 0,
            };
          }
          if (s.includes('FROM users') && s.includes('lower(email)')) {
            return users.find((u) => String(u.email).toLowerCase() === String(binds[0]).toLowerCase() && u.org_id === binds[1]) || null;
          }
          if (s.includes('FROM users') && s.includes('WHERE id')) {
            return users.find((u) => u.id === binds[0]) || null;
          }
          if (s.includes('FROM organizations')) {
            const o = orgs.find((x) => x.id === binds[0]);
            return o ? { ...o, settings: o.settings } : null;
          }
          if (s.includes('FROM clients')) {
            return clients.find((c) => c.id === binds[0]) || null;
          }
          if (s.includes('SELECT 1 as ok')) return { ok: 1 };
          return null;
        },
        async all() { return { results: [] }; },
        async run() {
          if (s.includes('INSERT INTO demo_sessions')) {
            demoSessions.push({
              id: binds[0], email: binds[1], phone: binds[2], business_name: binds[3],
              business_address: binds[4], first_name: binds[5], last_name: binds[6],
              token_hash: binds[7], status: 'pending', expires_at: binds[8],
              org_id: binds[9] || null, source_ip: binds[10] || null, user_agent: binds[11] || null,
              mfsn_pulls: 0, tour_step: 0,
            });
          }
          if (s.includes('INSERT INTO sessions')) {
            sessions.push({
              id: binds[0], user_id: binds[1], org_id: binds[2], expires_at: binds[3],
              ip_address: binds[4], user_agent: binds[5],
              demo_session_id: binds[6] || null, revoked_at: null,
            });
          }
          if (s.includes("UPDATE demo_sessions SET status = 'active'")) {
            const row = demoSessions.find((r) => r.id === binds[3]);
            if (row) {
              row.status = 'active';
              row.auth_session_id = binds[0];
              row.org_id = binds[1];
              row.user_id = binds[2];
            }
          }
          if (s.includes('UPDATE demo_sessions SET token_hash')) {
            const row = demoSessions.find((r) => r.id === binds[binds.length - 1]);
            if (row) {
              row.token_hash = binds[0];
              row.phone = binds[1];
              row.business_name = binds[2];
              row.business_address = binds[3];
              if (binds.length > 8) {
                row.org_id = binds[6];
                row.source_ip = binds[7];
                row.user_agent = binds[8];
              }
            }
          }
          if (s.includes('INSERT INTO brand_leads')) store.leads.push({ id: binds[0] });
          if (s.includes('INSERT INTO demo_agent_turns')) store.turns.push({ id: binds[0] });
          if (s.includes('INSERT INTO activity_log')) store.activity.push({ id: binds[0] });
          if (s.includes('UPDATE demo_sessions SET lead_id')) {
            const row = demoSessions.find((r) => r.token_hash === binds[1]);
            if (row) row.lead_id = binds[0];
          }
          if (s.includes('UPDATE demo_sessions SET tour_step')) {
            const row = demoSessions.find((r) => r.id === binds[1]);
            if (row) row.tour_step = binds[0];
          }
          if (s.includes('UPDATE demo_sessions SET mfsn_pulls')) {
            const row = demoSessions.find((r) => r.id === binds[2]);
            if (row) {
              row.mfsn_pulls = 1;
              row.mfsn_member_email = binds[0];
              row.live_client_id = binds[1];
            }
          }
          return { success: true };
        },
      };
      return stmt;
    },
  };
}

const { DEMO_TOUR, CLIENT_PORTAL_GUIDE } = await import(pathToFileURL(path.join(root, 'src/engine/demo-experience.ts')).href);
const appModule = await import(pathToFileURL(path.join(root, 'src/index.tsx')).href);
const app = appModule.default;

const spa = readFileSync(path.join(root, 'public/static/app.js'), 'utf8');
const overlay = readFileSync(path.join(root, 'public/static/demo-experience.js'), 'utf8');
const loginHtml = spa;

assert(loginHtml.includes('id="auth-demo"'), 'login page has CRO demo panel');
assert(loginHtml.includes('id="cro-demo-form"'), 'login page has CRO demo form');
assert(loginHtml.includes('Credit company? Launch interactive demo'), 'login CTA for credit companies');
assert(loginHtml.includes("window._switchTab('demo')"), 'login can open demo tab');
assert(loginHtml.includes('/api/public/demo/start'), 'login posts demo start');
assert(loginHtml.includes("params.get('from') === 'demo'"), 'register prefill from demo convert');
assert(overlay.includes('/demo/prepare'), 'overlay prepares sample case without super_admin');
assert(overlay.includes('Start your organization'), 'overlay convert CTA');
assert(overlay.includes('/demo/convert'), 'overlay posts convert handoff');
assert(overlay.includes('id="sf-portal"'), 'overlay jumps into the client portal tour');
assert(spa.includes('mfsn-api-user-guide'), 'SPA shows MFSN API User walkthrough');
assert(spa.includes('Users → API User') || spa.includes('Users section'), 'SPA tells staff to open Users → API User');
assert(overlay.includes('Users → API User'), 'demo live modal walks API User setup');
assert(overlay.includes('myfreescorenow.com/login'), 'overlay links affiliate portal');
assert(spa.includes('_portalWalkStep'), 'SPA can step Next/Previous through portal tabs');
assert(spa.includes('OWNER_ONLY_PAGES'), 'SPA gates owner-only pages');
assert(spa.includes('function isPlatformOwner'), 'SPA checks platformOwner flag, not super_admin');
assert(spa.includes('Not available on this account'), 'non-owners see forbidden state');
assert(spa.includes("syncSessionCookie"), 'SPA sets session cookie for private brand hub');
assert(spa.includes("id: 'client-report'"), 'SPA sidebar includes Report');
for (const g of CLIENT_PORTAL_GUIDE) {
  assert(spa.includes(`page: '${g.page}'`), `SPA walkthrough lists ${g.page}`);
}

for (const step of DEMO_TOUR) {
  assert(spa.includes(`case '${step.page}'`), `SPA implements tour page ${step.page}`);
}

const extraPages = [
  'client-disputes', 'client-actions', 'client-progress', 'client-billing',
  'client-consents', 'ai-studio', 'settings', 'compliance-hub', 'mailing-campaigns',
];
for (const p of extraPages) {
  assert(spa.includes(`case '${p}'`), `SPA implements ${p}`);
}

const db = createDemoDb();
const env = {
  DB: db,
  RATE_LIMIT_KV: { get: async () => '0', put: async () => {} },
  ENVIRONMENT: 'test',
  PII_ENCRYPTION_KEY: '0'.repeat(64),
  COMPANY_EMAIL: 'ops@example.com',
};

{
  const res = await app.request('/demo', {}, env);
  assert(res.status === 200, 'GET /demo');
  const html = await res.text();
  assert(/Interactive (credit repair software )?demo/i.test(html), 'demo gate copy');
  assert(/business name/i.test(html), 'asks for business name');
}

{
  const res = await app.request('/login', {}, env);
  assert(res.status === 200, 'GET /login');
  const html = await res.text();
  assert(html.includes('demo-experience.js'), 'login loads demo overlay kit');
}

{
  const res = await app.request('/api/public/demo/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'owner@firm.test', phone: '555' }),
  }, env);
  assert(res.status === 400, 'demo start rejects incomplete firm identity');
}

const firm = {
  firstName: 'Jordan',
  lastName: 'Lee',
  email: 'jordan@acme-credit.test',
  phone: '5551234567',
  businessName: 'Acme Credit Repair LLC',
  businessAddress: '100 Justice Ave, Dallas, TX 75201',
};

let demoToken;
{
  const res = await app.request('/api/public/demo/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(firm),
  }, env);
  const body = await res.json();
  assert(res.status === 200, `demo start 200 got ${res.status} ${JSON.stringify(body)}`);
  assert(body.token && body.token.length >= 32, 'demo token issued');
  demoToken = body.token;
  assert(db.store.demoSessions.length === 1, 'demo session row stored');
  assert(db.store.demoSessions[0].org_id === 'org_platform_master', 'demo start stores tenant org');
  assert(db.store.leads.length >= 1, 'demo lead stored');
}

let sessionToken;
{
  const res = await app.request('/api/public/demo/enter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: demoToken }),
  }, env);
  const body = await res.json();
  assert(res.status === 200, `demo enter 200 got ${res.status} ${JSON.stringify(body)}`);
  assert(body.token, 'session token');
  assert(body.user?.isDemo === true, 'user flagged demo');
  assert(body.demo?.businessName === 'Acme Credit Repair LLC', 'firm name on session');
  assert(body.demo?.sampleClientId === 'cli_demo_001', 'salisha sample attached');
  assert(String(body.demo?.convertUrl || '').includes('from=demo'), 'enter returns convert url');
  sessionToken = body.token;
  assert(db.store.sessions[0]?.demo_session_id, 'auth session tagged with demo_session_id');
}

const auth = { Authorization: `Bearer ${sessionToken}` };

{
  const res = await app.request('/api/demo/tour', { headers: auth }, env);
  const body = await res.json();
  assert(res.status === 200, 'tour 200');
  assert(Array.isArray(body.steps) && body.steps.length === DEMO_TOUR.length, 'full tour returned');
}

{
  const res = await app.request('/api/portal/guide', { headers: auth }, env);
  const body = await res.json();
  assert(res.status === 200, 'portal guide 200');
  assert(Array.isArray(body.pages) && body.pages.length === CLIENT_PORTAL_GUIDE.length, 'portal guide pages');
  assert(/Preview Portal/i.test(body.previewHint || ''), 'guide tells staff to preview');
}

{
  const res = await app.request('/api/mfsn/operator-access', { headers: auth }, env);
  const body = await res.json();
  assert(res.status === 200, 'mfsn operator access 200');
  assert(Array.isArray(body.pullGuide) && body.pullGuide.length === 5, 'pull guide has five steps');
  assert(/API User/i.test(body.pullGuide[1].title), 'step 2 is API User');
  assert(String(body.affiliatePortalUrl || '').includes('myfreescorenow.com'), 'affiliate portal url');
}

{
  const res = await app.request('/api/demo/session', { headers: auth }, env);
  const body = await res.json();
  assert(res.status === 200, 'session 200');
  assert(body.livePullRemaining === 1, 'one live pull remaining');
  assert(body.uploadReady === true, 'upload flagged ready');
  assert(String(body.convertUrl || '').includes('mode=register'), 'session convert url');
  assert(body.ai && Array.isArray(body.ai.providers), 'session lists AI providers');
}

{
  const res = await app.request('/api/demo/session', {
    method: 'PATCH',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ tourStep: 3 }),
  }, env);
  assert(res.status === 200, 'patch tour step');
}

{
  const res = await app.request('/api/demo/prepare', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ loadCase: true }),
  }, env);
  const body = await res.json();
  assert(res.status === 200, `demo prepare 200 got ${res.status} ${JSON.stringify(body)}`);
  assert(body.clientId === 'cli_demo_001', 'prepare uses salisha');
  assert(body.uploadReady === true, 'prepare upload ready');
  assert(!String(body.error || '').includes('super_admin'), 'interactive prepare is not super_admin gated');
}

{
  const res = await app.request('/api/demo/convert', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: '{}',
  }, env);
  const body = await res.json();
  assert(res.status === 200, `convert 200 got ${res.status} ${JSON.stringify(body)}`);
  assert(String(body.registerUrl || '').includes('/login?'), 'convert returns register url');
  assert(body.registerUrl.includes('from=demo'), 'convert marks from=demo');
  assert(body.registerUrl.includes('org=') || body.orgName === 'Acme Credit Repair LLC', 'firm name on convert');
  assert(db.store.activity.some((a) => true), 'convert writes activity');
}

{
  const res = await app.request('/api/demo/agent/chat', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'I want to start your organization', page: 'admin-overview' }),
  }, env);
  const body = await res.json();
  assert(res.status === 200, 'agent convert chat 200');
  assert((body.actions || []).some((a) => a.type === 'convertToSignup'), 'agent can convert to signup');
}

{
  const res = await app.request('/api/demo/agent/chat', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'show me the generated letters and why they are not templates', page: 'admin-overview' }),
  }, env);
  const body = await res.json();
  assert(res.status === 200, `agent chat 200 ${JSON.stringify(body).slice(0, 200)}`);
  assert(body.reply && body.reply.length > 20, 'agent replies');
  assert(Array.isArray(body.actions), 'agent returns actions');
  const pages = body.actions.map((a) => a.page).filter(Boolean);
  assert(pages.includes('generate-doc') || body.actions.some((a) => a.type === 'navigate'), 'agent can drive letter screen');
  assert(!/fill-in template library/i.test(body.reply), 'does not sell templates');
}

{
  const res = await app.request('/api/demo/mfsn-live', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberEmail: 'member@test.com' }),
  }, env);
  assert(res.status === 400, 'live pull requires MAPIK token');
}

{
  const res = await app.request('/api/demo/mfsn-live', {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberEmail: 'member@test.com', memberToken: 'MAPIK#test' }),
  }, env);
  assert(res.status === 503 || res.status === 502 || res.status === 400, `live pull without partner creds is blocked (${res.status})`);
}

{
  const res = await app.request('/api/openapi.json', {}, env);
  const spec = await res.json();
  assert(spec.paths['/api/public/demo/start'], 'openapi demo start');
  assert(spec.paths['/api/demo/agent/chat'], 'openapi demo agent');
  assert(spec.paths['/api/demo/mfsn-live'], 'openapi live mfsn');
  assert(spec.paths['/api/demo/prepare'], 'openapi demo prepare');
  assert(spec.paths['/api/demo/convert'], 'openapi demo convert');
}

{
  const res = await app.request('/api/health/ready', {}, env);
  const body = await res.json();
  assert(body.checks, 'readiness checks present');
  assert(body.checks.db === true, 'db check true on mock');
  assert('stripe' in body.checks && 'mfsn' in body.checks && 'click2mail' in body.checks && 'ghl' in body.checks, 'integration flags listed');
  assert('stripeMode' in body.checks && 'chargesReal' in body.checks, 'stripe live flags listed');
  assert(body.checks.productionBillingReady === false, 'mock env is not live billing');
}

{
  const prodTest = { ...env, ENVIRONMENT: 'production', STRIPE_API_KEY: 'sk_test_placeholder', STRIPE_PUBLISHABLE_KEY: 'pk_test_placeholder' };
  const res = await app.request('/api/health/ready', {}, prodTest);
  const body = await res.json();
  assert(body.checks.stripeMode === 'test', 'health reports test secret');
  assert(body.checks.chargesReal === false, 'health does not claim real charges');
  assert(body.checks.productionBlocked === true, 'health flags production blocked');
  assert(body.checks.productionBillingReady === false, 'production + test keys is not billing-ready');
}

console.log('demo-flow tests passed', { tourSteps: DEMO_TOUR.length, spaPages: extraPages.length + DEMO_TOUR.length });
