/**
 * Bureau / furnisher reply classification
 * Run: npx tsx tests/bureau-reply-intel.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { classifyBureauReply, isReplyUploadCategory } = await import(
  pathToFileURL(path.join(root, 'src/engine/bureau-reply-intel.ts')).href
);

assert(isReplyUploadCategory('creditor_reply') === true, 'creditor_reply');
assert(isReplyUploadCategory('bureau_response') === true, 'bureau_response');
assert(isReplyUploadCategory('bank_statement') === false, 'bank_statement excluded');
console.log('✓ category gate');

{
  const text = `
Equifax Information Services LLC
Results of our reinvestigation

We have completed our investigation of the items you disputed.
The following account has been deleted from your credit file:
Account #411122223333 Chase Bank — information deleted.

Thank you for contacting Equifax.
`;
  const r = classifyBureauReply(text);
  assert(r.bureauHint === 'Equifax', 'bureau');
  assert(r.documentKind === 'bureau_response', 'kind');
  assert(r.overallOutcome === 'deleted', 'deleted outcome');
  assert(r.confidence >= 0.6, 'confidence');
  assert(r.suggestedDisputeResult === 'deleted', 'dispute result');
  console.log('✓ deletion classification');
}

{
  const text = `
TransUnion LLC
We have verified the accuracy of the following account and it remains on your credit file.
Account ACME Collections was confirmed with the furnisher.
`;
  const r = classifyBureauReply(text);
  assert(r.bureauHint === 'TransUnion', 'TU');
  assert(r.overallOutcome === 'verified', 'verified');
  console.log('✓ verified classification');
}

{
  const r = classifyBureauReply('hi');
  assert(r.overallOutcome === 'inconclusive', 'short text');
  assert(r.confidence < 0.3, 'low confidence');
  console.log('✓ inconclusive short text');
}

console.log('bureau-reply-intel tests passed');
