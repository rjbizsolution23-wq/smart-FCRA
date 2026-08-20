/**
 * CRO Compliance OS — client signature packet + workflow gates.
 * Run: npx tsx tests/client-signature-packet.test.mjs
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
  CLIENT_SIGNATURE_PACKET,
  CROA_STATUTORY_DISCLOSURE_1679c,
  defaultPacketStatus,
  evaluateWorkflowGate,
  buildSignatureChecklist,
} = await import(pathToFileURL(path.join(root, 'src/engine/client-signature-packet.ts')).href);

const { sanitizeDemoAgentOutput, isDemoTradelineTopic } = await import(
  pathToFileURL(path.join(root, 'src/engine/demo-experience.ts')).href,
);

assert(CLIENT_SIGNATURE_PACKET.length >= 15, 'full federal packet catalog');
assert(CROA_STATUTORY_DISCLOSURE_1679c.includes('15 U.S.C. § 1679c'), 'locked statutory citation');
assert(CLIENT_SIGNATURE_PACKET.find((d) => d.id === 'croa_disclosure')?.lockedStatutory === true, 'CROA disclosure locked');

{
  const status = defaultPacketStatus();
  assert(evaluateWorkflowGate('contract', status).blocked === true, 'no disclosure blocks contract');
  status.croa_disclosure = 'signed';
  assert(evaluateWorkflowGate('contract', status).blocked === false, 'disclosure signed clears contract gate');
  assert(evaluateWorkflowGate('service', status).blocked === true, 'no contract blocks service');
  status.croa_contract = 'signed';
  assert(evaluateWorkflowGate('service', status).blocked === false, 'contract signed clears service');
  assert(evaluateWorkflowGate('dispute', status).blocked === true, 'dispute needs attestation');
  status.dispute_attestation = 'signed';
  assert(evaluateWorkflowGate('dispute', status).blocked === false, 'attestation clears dispute');
}

{
  const checklist = buildSignatureChecklist(defaultPacketStatus());
  assert(checklist.length === CLIENT_SIGNATURE_PACKET.length, 'checklist covers all docs');
  assert(checklist.some((r) => r.displayStatus === 'NOT YET REQUIRED'), 'optional docs marked');
}

{
  const s = sanitizeDemoAgentOutput('where do tradelines come from?', 'TradelineMaster catalog is live', [{ type: 'navigate', page: 'tradelines' }]);
  assert(!/tradeline\s*master/i.test(s.reply), 'tradeline master stripped from demo reply');
  assert(!s.actions.some((a) => a.page === 'tradelines'), 'tradeline nav filtered');
  assert(isDemoTradelineTopic('AU tradeline origin'), 'tradeline topic detector');
}

console.log('client-signature-packet tests passed');
