/**
 * Tenant/session persistence + data/compliance catalog.
 * Run: npx tsx tests/data-compliance.test.mjs
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
  DATA_CATALOG,
  COMPLIANCE_CONTROLS,
  D1_BACKUP_TABLES,
  OPS_BACKUP_TABLES,
  PRIVACY_PURGE_TABLES,
  PRIVACY_EXPORT_COLLECTIONS,
  brandLeadsVisibleTo,
  sessionsListScope,
  collectPrivacyExport,
  purgeClientRecords,
  dataInventoryPayload,
  lookupActiveSession,
  insertSessionRow,
  revokeSessions,
} = await import(pathToFileURL(path.join(root, 'src/lib/data-compliance.ts')).href);

assert(DATA_CATALOG.length >= 60, `catalog size ${DATA_CATALOG.length}`);
assert(DATA_CATALOG.some((c) => c.table === 'sessions'), 'sessions in catalog');
assert(DATA_CATALOG.some((c) => c.table === 'session_events'), 'session_events in catalog');
assert(DATA_CATALOG.some((c) => c.table === 'demo_sessions'), 'demo_sessions in catalog');
assert(DATA_CATALOG.some((c) => c.table === 'investigation_clocks'), '611 clocks in catalog');
assert(DATA_CATALOG.some((c) => c.table === 'billing_ledger'), 'CROA ledger in catalog');
assert(D1_BACKUP_TABLES.includes('demo_sessions'), 'admin backup includes demo_sessions');
assert(D1_BACKUP_TABLES.includes('brand_leads'), 'admin backup includes brand_leads');
assert(D1_BACKUP_TABLES.includes('client_consents'), 'admin backup includes consents');
assert(D1_BACKUP_TABLES.includes('session_events'), 'admin backup includes session_events');
assert(OPS_BACKUP_TABLES.includes('security_audit_log'), 'ops backup includes audit log');
assert(!OPS_BACKUP_TABLES.includes('sessions'), 'ops backup does not dump live session tokens');
assert(PRIVACY_PURGE_TABLES.includes('client_attestations'), 'purge covers attestations');
assert(PRIVACY_PURGE_TABLES.includes('portal_disputes'), 'purge covers disputes');
assert(!PRIVACY_PURGE_TABLES.includes('investigation_clocks'), 'FCRA clocks retained on purge');
assert(!PRIVACY_PURGE_TABLES.includes('service_records'), 'CROA service records retained on purge');
assert(PRIVACY_EXPORT_COLLECTIONS.some((c) => c.key === 'clocks'), 'export includes clocks');
assert(PRIVACY_EXPORT_COLLECTIONS.some((c) => c.key === 'consents'), 'export includes consents');
assert(COMPLIANCE_CONTROLS.some((c) => c.id === 'fcra-611'), 'FCRA 611 control listed');
assert(COMPLIANCE_CONTROLS.some((c) => c.id === 'croa'), 'CROA control listed');
assert(COMPLIANCE_CONTROLS.some((c) => c.id === 'ccpa'), 'CCPA control listed');
assert(COMPLIANCE_CONTROLS.some((c) => c.id === 'esign'), 'ESIGN control listed');
assert(brandLeadsVisibleTo('super_admin') === 'all', 'super_admin sees all leads');
assert(brandLeadsVisibleTo('admin') === 'org', 'tenant admin is org-scoped');
assert(brandLeadsVisibleTo('staff') === 'org', 'staff is org-scoped');
assert(sessionsListScope({ demo_session_id: 'demo_1' }).mode === 'demo', 'demo session scope');
assert(sessionsListScope({}).mode === 'staff', 'staff session scope');

const inv = dataInventoryPayload();
assert(inv.collectionCount === DATA_CATALOG.length, 'inventory payload count');
assert(inv.limitations.length >= 4, 'honest limitations listed');

function memoryDb() {
  const tables = {
    credit_reports: [{ id: 'r1', org_id: 'org_a', client_id: 'cli_a', bureau: 'experian', r2_key: 'org/org_a/client/cli_a/reports/r1/file.pdf' }],
    violations: [{ id: 'v1', org_id: 'org_a', client_id: 'cli_a' }, { id: 'v2', org_id: 'org_b', client_id: 'cli_a' }],
    documents: [],
    portal_messages: [],
    portal_uploads: [{ id: 'u1', org_id: 'org_a', client_id: 'cli_a', r2_key: 'vault/u1' }],
    client_consents: [{ id: 'c1', org_id: 'org_a', client_id: 'cli_a', consent_type: 'FCRA', version: '1', status: 'GRANTED' }],
    clients: [{ id: 'cli_a', org_id: 'org_a', email: 'a@x.test', first_name: 'Ann', last_name: 'Lee', ssn_last4: '1234' }],
    sessions: [{ id: 'tok1', user_id: 'u1', org_id: 'org_a', expires_at: '2099-01-01', revoked_at: null }],
    brand_leads: [{ id: 'l1', org_id: 'org_a', email: 'a@x.test', form_id: 'saas-demo', status: 'new' }],
  };
  const deletedR2 = [];
  const prepare = (sql) => {
    const s = String(sql);
    const binds = [];
    const stmt = {
      bind(...a) { binds.push(...a); return stmt; },
      async all() {
        const table = Object.keys(tables).find((t) => s.includes(`FROM ${t}`) || s.includes(`FROM ${t} `));
        if (!table) return { results: [] };
        let rows = tables[table] || [];
        if (s.includes('client_id = ?') && s.includes('org_id = ?')) {
          rows = rows.filter((r) => r.client_id === binds[0] && r.org_id === binds[1]);
        } else if (s.includes('org_id = ?') && s.includes('email = ?')) {
          rows = rows.filter((r) => r.org_id === binds[0] && r.email === binds[1]);
        }
        if (s.includes(' AS k')) {
          return { results: rows.filter((r) => r.r2_key).map((r) => ({ k: r.r2_key })) };
        }
        return { results: rows };
      },
      async first() {
        if (s.includes('FROM sessions s JOIN users u')) {
          const sess = tables.sessions.find((r) => r.id === binds[0] && !r.revoked_at);
          return sess ? { ...sess, user_id: 'u1', user_name: 'A', user_email: 'a@x.test', user_role: 'admin', is_active: 1, must_change_password: 0, mfa_enabled: 0 } : null;
        }
        return (tables.clients || [])[0] || null;
      },
      async run() {
        if (s.startsWith('DELETE FROM')) {
          const table = s.replace(/DELETE FROM (\w+).*/, '$1');
          if (tables[table]) {
            tables[table] = tables[table].filter((r) => !(r.client_id === binds[0] && r.org_id === binds[1]));
          }
        }
        if (s.includes('UPDATE credit_reports')) {
          tables.credit_reports = tables.credit_reports.map((r) => r.client_id === binds[0] && r.org_id === binds[1] ? { ...r, raw_text: null, r2_key: null, status: 'purged' } : r);
        }
        if (s.includes("UPDATE clients SET first_name = 'REDACTED'")) {
          const id = binds[1];
          tables.clients = tables.clients.map((r) => r.id === id ? { ...r, first_name: 'REDACTED', email: binds[0] } : r);
        }
        if (s.includes('INSERT INTO sessions')) {
          tables.sessions.push({ id: binds[0], user_id: binds[1], org_id: binds[2], expires_at: binds[3], revoked_at: null, demo_session_id: binds[6] || null });
        }
        if (s.includes('SET revoked_at')) {
          tables.sessions = tables.sessions.map((r) => {
            if (s.includes('id = ? AND user_id = ?') && r.id === binds[0] && r.user_id === binds[1]) return { ...r, revoked_at: 'now' };
            if (s.includes('user_id = ? AND revoked_at IS NULL') && r.user_id === binds[0]) return { ...r, revoked_at: 'now' };
            return r;
          });
        }
        return { meta: { changes: 1 } };
      },
    };
    return stmt;
  };
  return {
    prepare,
    deletedR2,
    tables,
    DOCS: { async delete(key) { deletedR2.push(key); } },
  };
}

{
  const db = memoryDb();
  const pack = await collectPrivacyExport(db, {
    orgId: 'org_a', client: db.tables.clients[0], requestId: 'req1', legalBasis: 'ccpa',
  });
  assert(pack.reports.length === 1, 'export reports org-scoped');
  assert(pack.violations.length === 1, 'export violations must not include other org');
  assert(pack.consents.length === 1, 'export consents');
  assert(pack.brandLeads.length === 1, 'export brand leads by email');
}

{
  const db = memoryDb();
  const result = await purgeClientRecords({ DB: db, DOCS: db.DOCS }, { orgId: 'org_a', clientId: 'cli_a', priorEmail: 'a@x.test' });
  assert(result.r2Deleted >= 1, `R2 originals deleted, got ${result.r2Deleted}`);
  assert(db.tables.clients[0].first_name === 'REDACTED', 'client anonymized');
  assert(db.tables.violations.every((v) => v.org_id !== 'org_a' || v.client_id !== 'cli_a'), 'org A violations purged');
  assert(db.tables.violations.some((v) => v.org_id === 'org_b'), 'other tenant violations kept');
}

{
  const db = memoryDb();
  await insertSessionRow(db, { id: 'tok2', userId: 'u1', orgId: 'org_a', expires: '2099-01-01', ip: '1.1.1.1', ua: 'test', demoSessionId: 'demo_9' });
  const row = db.tables.sessions.find((s) => s.id === 'tok2');
  assert(row && row.demo_session_id === 'demo_9', 'session stores demo_session_id');
  await revokeSessions(db, { userId: 'u1', sessionId: 'tok2' });
  assert(db.tables.sessions.find((s) => s.id === 'tok2').revoked_at, 'revoke keeps row');
  const live = await lookupActiveSession(db, 'tok2');
  assert(!live, 'revoked session is not active');
}

console.log('data-compliance tests passed');
