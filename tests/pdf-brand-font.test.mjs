/**
 * Space Grotesk is registered on audit + letter PDFs.
 * Run: npx tsx tests/pdf-brand-font.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { generatePDFReport, generatePDFFromText } = await import(
  pathToFileURL(path.join(root, 'src/engine/pdf-generator.ts')).href
);

const audit = generatePDFReport({
  clientName: 'Salisha McDowell',
  clientAddress: '1342 NM 333',
  clientCity: 'Tijeras',
  clientState: 'NM',
  clientZip: '87059',
  reportDate: '2026-08-13',
  bureau: 'Equifax',
  violations: [],
  litigationScore: 42,
  generatedDate: 'August 13, 2026',
  reportId: 'rpt_font_test',
  orgName: 'RJ Business Solutions',
});
assert(audit instanceof Uint8Array && audit.length > 500, 'audit pdf bytes');
const auditText = Buffer.from(audit).toString('latin1');
assert(auditText.includes('SpaceGrotesk') || auditText.includes('SpaceGrotesk-Bold'), 'audit embeds Space Grotesk');

const letter = generatePDFFromText('Bureau Dispute Letter', 'Please reinvestigate this account.', {
  orgName: 'RJ Business Solutions',
});
assert(letter instanceof Uint8Array && letter.length > 500, 'letter pdf bytes');
const letterText = Buffer.from(letter).toString('latin1');
assert(letterText.includes('SpaceGrotesk') || letterText.includes('SpaceGrotesk-Bold'), 'letter embeds Space Grotesk');

console.log('pdf-brand-font.test.mjs: OK', { audit: audit.length, letter: letter.length });
