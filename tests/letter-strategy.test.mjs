/**
 * Intelligent letter selection from violations
 * Run: npx tsx tests/letter-strategy.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { recommendLetterStrategy, selectWorkflowPackTypes } = await import(
  pathToFileURL(path.join(root, 'src/engine/letter-strategy.ts')).href
);

{
  const s = recommendLetterStrategy([
    { category: 'FCRA', subcategory: 'Inaccuracy', statute: '1681e(b)', severity: 'medium' },
  ]);
  assert(s.packTypes.includes('bureau-dispute'), 'core bureau');
  assert(s.packTypes.includes('1681i-letter'), 'core 1681i');
  console.log('✓ core dispute pack');
}

{
  const s = recommendLetterStrategy([
    { category: 'Obsolete', subcategory: '7-year', statute: '1681c', severity: 'high', evidence: 'Account past seven year limit' },
    { category: 'Metro2', subcategory: 'Re-aging', statute: '1681s-2', evidence: 'DOFD illegally altered', severity: 'critical' },
  ], { litigationScore: 55 });
  assert(s.signals.includes('obsolete'), 'obsolete signal');
  assert(s.signals.includes('re-aging'), 're-aging signal');
  assert(s.packTypes.includes('obsolete-deletion'), 'obsolete letter');
  assert(s.packTypes.includes('re-aging-violation'), 're-aging letter');
  assert(s.packTypes.includes('intent-to-sue-fcra'), 'intent');
  assert(s.packTypes.includes('cfpb-complaint'), 'cfpb');
  console.log('✓ specialty + litigation layer');
}

{
  const s = recommendLetterStrategy([
    { category: 'Inquiry', evidence: 'Hard pull without permissible purpose under 1681b', severity: 'medium' },
    { category: 'Collection', evidence: 'FDCPA debt collector reporting', severity: 'high' },
  ]);
  assert(s.packTypes.includes('unauthorized-inquiry'), 'inquiry letter');
  assert(s.packTypes.includes('debt-validation'), 'validation');
  assert(s.packTypes.includes('cease-desist'), 'cease');
  console.log('✓ inquiry + collection paths');
}

{
  const s = recommendLetterStrategy(
    [{ category: 'Collection', evidence: 'collection account', severity: 'medium' }],
    { clientState: 'TX', litigationScore: 30 },
  );
  assert(s.packTypes.includes('texas-finance-code-392'), 'TX enhancement');
  console.log('✓ state enhancement');
}

{
  const types = selectWorkflowPackTypes(
    [{ category: 'FCRA', severity: 'critical', evidence: 'willful violation metro2 balance exceeds high balance' }],
    { litigationScore: 85 },
  );
  assert(types.includes('fed-complaint'), 'fed complaint at high LVS');
  assert(types.includes('611-max-accuracy'), 'metro2 accuracy letter');
  console.log('✓ high LVS federal pack');
}

console.log('letter-strategy tests passed');
