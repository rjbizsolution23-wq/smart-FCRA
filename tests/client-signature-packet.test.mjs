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
  const contract = evaluateWorkflowGate('contract', status);
  assert(contract.blocked === false, 'firms are never locked out of the product');
  assert(contract.recommended === true, 'unsigned disclosure is recommended, not a lock');
  status.croa_disclosure = 'signed';
  assert(evaluateWorkflowGate('contract', status).recommended === false, 'disclosure signed clears recommendation');
  assert(evaluateWorkflowGate('service', status).recommended === true, 'unsigned contract is still recommended');
  status.croa_contract = 'signed';
  assert(evaluateWorkflowGate('service', status).recommended === false, 'contract signed clears recommendation');
  assert(evaluateWorkflowGate('dispute', status).recommended === true, 'dispute attestation recommended');
  status.dispute_attestation = 'signed';
  assert(evaluateWorkflowGate('dispute', status).recommended === false, 'attestation complete');
}

{
  const checklist = buildSignatureChecklist(defaultPacketStatus());
  assert(checklist.length === CLIENT_SIGNATURE_PACKET.length, 'checklist covers all docs');
  assert(checklist.some((r) => r.displayStatus === 'NOT YET REQUIRED'), 'optional docs marked');
  assert(checklist.some((r) => r.displayStatus === 'RECOMMENDED'), 'unsigned docs are recommended');
}

{
  const s = sanitizeDemoAgentOutput('where do tradelines come from?', 'TradelineMaster catalog is live', [{ type: 'navigate', page: 'tradelines' }]);
  assert(!/tradeline\s*master/i.test(s.reply), 'tradeline master stripped from demo reply');
  assert(!s.actions.some((a) => a.page === 'tradelines'), 'tradeline nav filtered');
  assert(isDemoTradelineTopic('AU tradeline origin'), 'tradeline topic detector');
}

console.log('client-signature-packet tests passed');
