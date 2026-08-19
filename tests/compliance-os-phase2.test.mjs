/**
 * Compliance OS phase 2 — automation builder, campaign approval, calling hours
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
  evaluateConditions,
  automationStepsToWorkflow,
  AUTOMATION_TRIGGER_CATALOG,
  AUTOMATION_STEP_TYPES,
} = await import(pathToFileURL(path.join(root, 'src/lib/automation-builder.ts')).href);

const {
  canTransition,
  APPROVAL_TRANSITIONS,
} = await import(pathToFileURL(path.join(root, 'src/lib/campaign-approval.ts')).href);

const {
  canPlaceMarketingCall,
  recordingPolicyForState,
} = await import(pathToFileURL(path.join(root, 'src/lib/calling-hours.ts')).href);

assert(AUTOMATION_TRIGGER_CATALOG.length >= 20, 'trigger catalog');
assert(AUTOMATION_STEP_TYPES.some((s) => s.type === 'push'), 'push step type');

assert(
  evaluateConditions([{ field: 'stage', op: 'eq', value: 'lead' }], { stage: 'lead' }),
  'condition eq pass',
);
assert(
  !evaluateConditions([{ field: 'stage', op: 'eq', value: 'lead' }], { stage: 'client' }),
  'condition eq fail',
);

const steps = automationStepsToWorkflow([
  { type: 'wait', delayHours: 2 },
  { type: 'send_email', lane: 'transactional', subject: 'Hi', bodyTemplate: 'Hello' },
  { type: 'push', pushTitle: 'Update', pushBody: 'Check portal' },
]);
assert(steps.length === 2, 'wait collapsed into delay');
assert(steps[0].delayHours === 2, 'accumulated wait delay');
assert(steps[1].action === 'push', 'push action mapped');

assert(canTransition('draft', 'compliance_review'), 'draft to compliance_review');
assert(!canTransition('draft', 'sent'), 'draft cannot jump to sent');
assert(canTransition('compliance_review', 'approved'), 'compliance to approved');
assert(APPROVAL_TRANSITIONS.approved.includes('sent'), 'approved can send');

const allowedCall = canPlaceMarketingCall({
  client: { state: 'TX', timezone: 'America/Chicago', marketing_call_consent: 1 },
  at: new Date('2026-08-19T15:00:00Z'),
});
assert(allowedCall.allowed === true, 'TX midday marketing call allowed');

const caPolicy = recordingPolicyForState('CA');
assert(caPolicy.disclosureRequired === true, 'CA two-party disclosure');

console.log('compliance-os-phase2.test.mjs: all assertions passed');
