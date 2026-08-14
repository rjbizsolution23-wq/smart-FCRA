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
    first_name: 'Salisha', last_name: 'McDowell',
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
              mfsn_pulls: 0, tour_step: 0,
            });
          }
          if (s.includes('INSERT INTO sessions')) {
            sessions.push({
              id: binds[0], user_id: binds[1], org_id: binds[2], expires_at: binds[3],
              ip_address: binds[4], user_agent: binds[5],
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
            const row = demoSessions.find((r) => r.id === binds[6]);
            if (row) {
              row.token_hash = binds[0];
              row.phone = binds[1];
              row.business_name = binds[2];
              row.business_address = binds[3];
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

const { DEMO_TOUR } = await import(pathToFileURL(path.join(root, 'src/engine/demo-experience.ts')).href);
const appModule = await import(pathToFileURL(path.join(root, 'src/index.tsx')).href);
const app = appModule.default;

const spa = readFileSync(path.join(root, 'public/static/app.js'), 'utf8');
const loginHtml = readFileSync(path.join(root, 'public/static/app.js'), 'utf8');

assert(loginHtml.includes('id="auth-demo"'), 'login page has CRO demo panel');
assert(loginHtml.includes('id="cro-demo-form"'), 'login page has CRO demo form');
assert(loginHtml.includes('Credit company? Launch interactive demo'), 'login CTA for credit companies');
assert(loginHtml.includes("window._switchTab('demo')"), 'login can open demo tab');
assert(loginHtml.includes('/api/public/demo/start'), 'login posts demo start');

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
  assert(html.includes('Interactive product demo'), 'demo gate copy');
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
  sessionToken = body.token;
}

const auth = { Authorization: `Bearer ${sessionToken}` };

{
  const res = await app.request('/api/demo/tour', { headers: auth }, env);
  const body = await res.json();
  assert(res.status === 200, 'tour 200');
  assert(Array.isArray(body.steps) && body.steps.length === DEMO_TOUR.length, 'full tour returned');
}

{
  const res = await app.request('/api/demo/session', { headers: auth }, env);
  const body = await res.json();
  assert(res.status === 200, 'session 200');
  assert(body.livePullRemaining === 1, 'one live pull remaining');
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
}

{
  const res = await app.request('/api/health/ready', {}, env);
  const body = await res.json();
  assert(body.checks, 'readiness checks present');
  assert(body.checks.db === true, 'db check true on mock');
  assert('stripe' in body.checks && 'mfsn' in body.checks && 'click2mail' in body.checks && 'ghl' in body.checks, 'integration flags listed');
}

console.log('demo-flow tests passed', { tourSteps: DEMO_TOUR.length, spaPages: extraPages.length + DEMO_TOUR.length });
