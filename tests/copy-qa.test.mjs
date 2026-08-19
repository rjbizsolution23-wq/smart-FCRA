/**
 * Copy QA phrase scanning tests
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { scanOutboundCopy, assertCopyApprovedForSend } = await import(
  pathToFileURL(path.join(root, 'src/lib/copy-qa.ts')).href
);

const clean = scanOutboundCopy('Hi {{first_name}}, your report analysis is ready for review.');
assert(clean.passed === true, 'clean copy passes');
assert(clean.score >= 90, 'clean copy high score');

const bad = scanOutboundCopy('We guarantee deletion and a 100-point increase for every client.');
assert(bad.passed === false, 'guarantee copy fails');
assert(bad.prohibitedHits.length >= 1, 'prohibited hits detected');

const block = assertCopyApprovedForSend('guaranteed approval for everyone');
assert(block.ok === false, 'assert blocks bad copy');

console.log('copy-qa.test.mjs: all assertions passed');
