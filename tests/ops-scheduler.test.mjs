/**
 * Ops scheduler pack tests
 * Run: npx tsx tests/ops-scheduler.test.mjs
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
  OPS_PACKS,
  listOpsJobs,
  jobHousekeeping,
  jobRonVideoCleanup,
  jobMonthlyComplianceSnapshot,
  runOpsJob,
} = await import(pathToFileURL(path.join(root, 'src/lib/ops-scheduler.ts')).href);

const { listEmailTemplates } = await import(
  pathToFileURL(path.join(root, 'src/lib/email-templates.ts')).href
);

assert(OPS_PACKS.hourly.includes('housekeeping'), 'hourly has housekeeping');
assert(OPS_PACKS.daily.includes('enterprise_comms'), 'daily has enterprise_comms');
assert(OPS_PACKS.weekly.includes('newsletter_weekly'), 'weekly has newsletter');
assert(OPS_PACKS.monthly.includes('monthly_compliance_snapshot'), 'monthly has compliance');

const catalog = listOpsJobs();
assert(catalog.jobs.length >= 14, 'job catalog size');
assert(catalog.schedules.hourly && catalog.schedules.weekly, 'schedules documented');

const templates = listEmailTemplates();
for (const id of [
  'inactive_reengage',
  'weekly_owner_report',
  'client_newsletter',
  'privacy_sla_alert',
  'bureau_followup_staff',
  'ops_health_alert',
  'journey_checkin_nudge',
  'fundability_update',
]) {
  assert(templates.some((t) => t.id === id), `template ${id}`);
}

// Fake DB that records DELETEs / UPDATEs
const calls = [];
const fakeDb = {
  prepare(sql) {
    calls.push(sql);
    return {
      bind(..._args) {
        return this;
      },
      async run() {
        return { meta: { changes: 1 } };
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

const hk = await jobHousekeeping({ DB: fakeDb });
assert(hk.demoExpired >= 0 && calls.some((s) => /UPDATE demo_sessions SET status = 'expired'/i.test(s)), 'housekeeping expires demo sessions');
assert(!calls.some((s) => /DELETE FROM sessions/i.test(s)), 'housekeeping retains session rows');
assert(calls.some((s) => /data_retention_holds/i.test(s)), 'alert purge respects legal hold');

const rv = await jobRonVideoCleanup({ DB: fakeDb });
assert(typeof rv.ronExpired === 'number', 'ron cleanup stats');

const snap = await jobMonthlyComplianceSnapshot({ DB: fakeDb });
assert(typeof snap.snapshots === 'number', 'compliance snapshot runs');

const run = await runOpsJob({ DB: fakeDb }, 'housekeeping', { triggeredBy: 'test' });
assert(run.status === 'ok', `housekeeping job ok got ${run.status}`);

console.log('ops-scheduler.test.mjs: OK', {
  packs: Object.keys(OPS_PACKS),
  jobs: catalog.jobs.length,
  templates: templates.length,
});
