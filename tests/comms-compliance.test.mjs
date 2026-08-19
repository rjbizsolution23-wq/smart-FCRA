/**
 * Compliance OS comms gate tests
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
  canSendMessage,
  isMarketingOptOutMessage,
  COMMS_POLICY_VERSION,
} = await import(pathToFileURL(path.join(root, 'src/lib/comms-compliance.ts')).href);

const { listWorkflowLibrary, getWorkflowDefinition } = await import(
  pathToFileURL(path.join(root, 'src/data/crm-campaign-library.ts')).href
);
const { LIFECYCLE_STAGES, marketingAllowedForStage } = await import(
  pathToFileURL(path.join(root, 'src/lib/lifecycle-engine.ts')).href
);

assert(isMarketingOptOutMessage('STOP'), 'STOP is opt-out');
assert(isMarketingOptOutMessage('stop'), 'stop case insensitive');
assert(!isMarketingOptOutMessage('Hello'), 'hello not opt-out');
assert(COMMS_POLICY_VERSION.startsWith('2026'), 'policy version');

const lib = listWorkflowLibrary();
assert(lib.length >= 40, `campaign library size ${lib.length}`);
assert(lib.some((w) => w.key === 'copy_qa_review'), 'copy_qa_review workflow');
assert(lib.some((w) => w.key === 'hot_lead'), 'hot_lead workflow');
assert(lib.some((w) => w.key === 'referral'), 'referral workflow');
assert(lib.some((w) => w.key === 'win_back'), 'win_back workflow');
assert(lib.some((w) => w.key === 'new_lead'), 'new_lead workflow');
assert(lib.some((w) => w.mandatory), 'has mandatory workflows');
assert(getWorkflowDefinition('cancellation')?.lane === 'compliance', 'cancellation is compliance lane');

assert(LIFECYCLE_STAGES.length >= 10, 'lifecycle stages defined');
assert(!marketingAllowedForStage('cancelled'), 'no marketing when cancelled');

const mockDb = {
  prepare(sql) {
    return {
      bind(...args) {
        return {
          async first() {
            if (sql.includes('comms_frozen')) return null;
            if (sql.includes('email_suppressions')) return null;
            if (sql.includes('do_not_contact')) return null;
            if (sql.includes('service_cancellations')) return null;
            if (sql.includes('support_complaints')) return null;
            if (sql.includes('FROM clients WHERE')) {
              return { notify_email: 1, notify_sms: 1, marketing_email_consent: 1, comms_frozen: 0 };
            }
            if (sql.includes('consent_evidence')) return { id: 'c1' };
            if (sql.includes('client_consents')) return null;
            return null;
          },
          async all() { return { results: [] }; },
          async run() { return {}; },
        };
      },
    };
  },
};

const allow = await canSendMessage({
  db: mockDb,
  orgId: 'org1',
  clientId: 'client1',
  email: 'test@example.com',
  lane: 'marketing',
  channel: 'email',
});
assert(allow.allowed === true, 'marketing allowed with consent');

const compliance = await canSendMessage({
  db: mockDb,
  orgId: 'org1',
  clientId: 'client1',
  email: 'test@example.com',
  lane: 'compliance',
  channel: 'email',
});
assert(compliance.allowed === true, 'compliance lane always allowed');

console.log('comms-compliance.test.mjs: all assertions passed');
