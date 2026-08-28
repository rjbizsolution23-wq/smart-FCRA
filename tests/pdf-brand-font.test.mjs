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

const { generatePDFReport, generatePDFFromText, documentFooterText } = await import(
  pathToFileURL(path.join(root, 'src/engine/pdf-generator.ts')).href
);
const { pdfResponse, safePdfFileName } = await import(
  pathToFileURL(path.join(root, 'src/lib/pdf-response.ts')).href
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
assert(auditText.includes('/MediaBox [0 0 612. 792.]') || auditText.includes('/MediaBox [0 0 612 792]'), 'audit uses US Letter MediaBox');

const letter = generatePDFFromText('Bureau Dispute Letter', 'Please reinvestigate this account.', {
  orgName: 'RJ Business Solutions',
});
assert(letter instanceof Uint8Array && letter.length > 500, 'letter pdf bytes');
const letterText = Buffer.from(letter).toString('latin1');
assert(letterText.includes('SpaceGrotesk') || letterText.includes('SpaceGrotesk-Bold'), 'letter embeds Space Grotesk');
assert(letterText.includes('/MediaBox [0 0 612. 792.]') || letterText.includes('/MediaBox [0 0 612 792]'), 'letter uses US Letter MediaBox');
assert(documentFooterText({ orgName: 'Tenant Firm' }) === 'Tenant Firm | Smart FCRA document', 'tenant footer avoids unconfigured representation claim');
assert(documentFooterText({ orgName: 'Tenant Firm', isHiredAdvocate: true }).includes('Authorized consumer representative'), 'representation footer requires explicit setting');
assert(safePdfFileName('../../Client "One".pdf') === 'Client-One.pdf', 'unsafe filename is normalized');
const response = pdfResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]), 'Dispute Letter 123');
assert(response.headers.get('content-disposition') === 'attachment; filename="Dispute-Letter-123.pdf"', 'safe PDF disposition');
assert(response.headers.get('cache-control')?.includes('no-store'), 'sensitive PDF is not cached');
assert(response.headers.get('x-content-type-options') === 'nosniff', 'PDF MIME sniffing disabled');

console.log('pdf-brand-font.test.mjs: OK', { audit: audit.length, letter: letter.length });
