/**
 * Platform guide + free AI override tests.
 * Run: npx tsx tests/platform-guide.test.mjs
 */
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const {
  STAFF_PLATFORM_GUIDE_TOUR,
  CLIENT_PLATFORM_GUIDE_TOUR,
  PLATFORM_MISSION,
  FEEDBACK_CATEGORIES,
} = await import(new URL('../src/engine/platform-guide.ts', import.meta.url).href);

const { DEMO_TOUR } = await import(new URL('../src/engine/demo-experience.ts', import.meta.url).href);

assert(PLATFORM_MISSION.includes('feedback'), 'mission mentions feedback');
assert(PLATFORM_MISSION.includes('compliant'), 'mission mentions compliance');
assert(FEEDBACK_CATEGORIES.some((c) => c.id === 'integration'), 'integration feedback category');
assert(STAFF_PLATFORM_GUIDE_TOUR.length > DEMO_TOUR.length, 'staff tour wraps demo tour + mission/help');
assert(STAFF_PLATFORM_GUIDE_TOUR[0].id === 'platform-mission', 'staff tour starts with mission');
assert(STAFF_PLATFORM_GUIDE_TOUR[STAFF_PLATFORM_GUIDE_TOUR.length - 1].id === 'platform-help-hub', 'staff tour ends with help hub');
assert(CLIENT_PLATFORM_GUIDE_TOUR.length >= 3, 'client tour has steps');
assert(CLIENT_PLATFORM_GUIDE_TOUR.some((s) => s.page === 'platform-guide'), 'client tour references help page');

const { setOrgAiFreeOverride, getOrgAiFreeOverride, chargeAiCredits } = await import(
  new URL('../src/lib/platform-extensions.ts', import.meta.url).href,
);

class MockDb {
  constructor() {
    this.rows = new Map();
  }
  prepare(sql) {
    const self = this;
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes('free_ai_override') && sql.includes('FROM org_ai_credits')) {
              const orgId = args[0];
              const row = self.rows.get(`credits:${orgId}`);
              return row || null;
            }
            return null;
          },
          async run() {
            if (sql.includes('INSERT INTO org_ai_credits') || sql.includes('ON CONFLICT')) {
              const orgId = args[0];
              const override = args[1];
              const prev = self.rows.get(`credits:${orgId}`) || { balance: 500, free_ai_override: 0 };
              self.rows.set(`credits:${orgId}`, { ...prev, free_ai_override: override });
            }
            return { success: true };
          },
        };
      },
    };
  }
}

const db = new MockDb();
db.rows.set('credits:org_test', { balance: 10, free_ai_override: 0 });

assert(!(await getOrgAiFreeOverride(db, 'org_test')), 'override off initially');
await setOrgAiFreeOverride(db, 'org_test', true);
assert(await getOrgAiFreeOverride(db, 'org_test'), 'override on after set');
const charged = await chargeAiCredits({
  db,
  orgId: 'org_test',
  provider: 'workers-ai',
  model: 'test',
  feature: 'platform_guide',
});
assert(charged.ok && charged.freeOverride, 'charge skipped when override on');
assert(charged.balance === 10, 'balance unchanged under override');

console.log('platform-guide tests passed', {
  staffSteps: STAFF_PLATFORM_GUIDE_TOUR.length,
  clientSteps: CLIENT_PLATFORM_GUIDE_TOUR.length,
});
