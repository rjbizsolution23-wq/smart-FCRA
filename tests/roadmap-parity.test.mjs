/**
 * Roadmap parity modules — bureau matrix, escalation, PPD, campaigns.
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { buildTradelineMatrix } = await import(
  pathToFileURL(path.join(root, 'src/lib/bureau-matrix.ts')).href
);
const { buildEscalationRecommendation } = await import(
  pathToFileURL(path.join(root, 'src/lib/escalation-engine.ts')).href
);
const { parsePpdSettings } = await import(
  pathToFileURL(path.join(root, 'src/lib/ppd-billing.ts')).href
);
const { BUILTIN_SEGMENTS } = await import(
  pathToFileURL(path.join(root, 'src/lib/campaign-builder.ts')).href
);
const { clientBillingConfigured } = await import(
  pathToFileURL(path.join(root, 'src/lib/client-billing.ts')).href
);

const matrix = buildTradelineMatrix([
  {
    bureau: 'Equifax',
    accounts: [{ creditorName: 'CAPITAL ONE', accountNumber: '****1234', currentBalance: 500, accountStatus: 'Open' }],
  },
  {
    bureau: 'Experian',
    accounts: [{ creditorName: 'CAPITAL ONE', accountNumber: '****1234', currentBalance: 520, accountStatus: 'Open' }],
  },
  {
    bureau: 'TransUnion',
    accounts: [{ creditorName: 'CAPITAL ONE', accountNumber: '****1234', currentBalance: 510, accountStatus: 'Open' }],
  },
]);
assert(matrix.length >= 1, 'matrix has rows');
assert(matrix.some((r) => r.equifax && r.experian && r.transunion), 'tri-bureau row');
assert(matrix.some((r) => r.matchConfidence === 'HIGH'), 'high confidence when all three match');

const esc = buildEscalationRecommendation({
  triggerType: 'bureau_verified',
  replyOutcome: 'verified',
  violationCategories: ['inaccurate_balance'],
  roundNumber: 1,
});
assert(esc.priority === 'high', 'verified reply is high priority');
assert(esc.letterTypes.length >= 1, 'escalation suggests letter types');
assert(esc.explanation.some((e) => e.includes('Human review')), 'includes human review note');

const ppd = parsePpdSettings({ ppd: { enabled: true, amountCents: 9900 } });
assert(ppd.enabled === true && ppd.amountCents === 9900, 'PPD settings parse');

assert(BUILTIN_SEGMENTS.length >= 3, 'campaign segments exist');
assert(BUILTIN_SEGMENTS.some((s) => s.id === 'inactive_30'), 'inactive segment');

assert(!clientBillingConfigured({}), 'billing not configured without Stripe key');
assert(clientBillingConfigured({ STRIPE_API_KEY: 'sk_live_test' }), 'billing configured with sk_');

console.log('roadmap-parity.test.mjs: all assertions passed');
