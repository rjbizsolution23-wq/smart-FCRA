/**
 * Production ops: original-file vault hygiene, FCRA 611 clocks, CROA ledger.
 * Run: npx tsx tests/production-ops.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { inspectUpload, sniffMime } = await import(pathToFileURL(path.join(root, 'src/lib/upload-hygiene.ts')).href);
const { computeFcra611Clock, parseMailingAddress, craAddressForRecipient, FCRA_611_DAYS, FCRA_611_OPERATIONAL_DAYS } = await import(
  pathToFileURL(path.join(root, 'src/lib/investigation-clocks.ts')).href
);
const { evaluateBillableEvent, isCoveredCreditRepairService } = await import(
  pathToFileURL(path.join(root, 'src/lib/billing-compliance.ts')).href
);
const { click2mailConfigured } = await import(pathToFileURL(path.join(root, 'src/lib/click2mail.ts')).href);

{
  const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, ...new Array(80).fill(0x20)]);
  assert(sniffMime(pdf) === 'application/pdf', 'pdf magic');
  const ok = await inspectUpload({ bytes: pdf, fileName: 'ex.pdf', declaredMime: 'application/pdf', extractedText: 'A'.repeat(200) });
  assert(ok.ok && ok.scanStatus === 'clean', 'clean pdf');
}

{
  const mz = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, ...new Array(32).fill(0)]);
  const blocked = await inspectUpload({ bytes: mz, fileName: 'report.pdf.exe', declaredMime: 'application/pdf' });
  assert(!blocked.ok && blocked.scanStatus === 'blocked', 'executable blocked');
}

{
  const jsPdf = new TextEncoder().encode('%PDF-1.4\n/JavaScript (app.alert)\n' + 'x'.repeat(200));
  const review = await inspectUpload({ bytes: jsPdf, fileName: 'ex.pdf', extractedText: 'A'.repeat(100) });
  assert(review.ok && review.scanStatus === 'review', 'pdf javascript review');
}

{
  const img = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(16).fill(0)]);
  const needOcr = await inspectUpload({ bytes: img, fileName: 'scan.jpg', category: 'credit_report', extractedText: '' });
  assert(!needOcr.ok && needOcr.ocrStatus === 'insufficient', 'image report requires OCR text');
}

{
  const mailed = new Date('2026-08-13T12:00:00Z');
  const clock = computeFcra611Clock(mailed);
  assert(clock.statutoryTarget === '2026-09-12', '30-day statutory');
  assert(clock.operationalTarget === '2026-09-17', '35-day operational');
  assert(FCRA_611_DAYS === 30 && FCRA_611_OPERATIONAL_DAYS === 35, 'constants');
  const ex = craAddressForRecipient('Experian');
  assert(ex.zip === '75013' && ex.state === 'TX', 'experian address');
  const parsed = parseMailingAddress('Equifax Information Services LLC\nP.O. Box 740256\nAtlanta, GA 30374');
  assert(parsed.city === 'Atlanta' && parsed.zip === '30374', 'equifax parse');
}

{
  assert(isCoveredCreditRepairService('credit_report_analysis') === true, 'analysis is covered');
  assert(isCoveredCreditRepairService('education') === false, 'education not covered');
  const blocked = evaluateBillableEvent({
    serviceType: 'credit_report_analysis',
    salesChannel: 'ONLINE',
    contractSigned: true,
    croaDisclosuresAcknowledged: true,
    serviceFullyPerformed: false,
    coveredCreditRepair: true,
  });
  assert(blocked.result === 'BLOCK', 'no charge before completion record');
  const allowed = evaluateBillableEvent({
    serviceType: 'credit_report_analysis',
    salesChannel: 'ONLINE',
    contractSigned: true,
    croaDisclosuresAcknowledged: true,
    serviceFullyPerformed: true,
    coveredCreditRepair: true,
  });
  assert(allowed.result === 'ALLOW', 'charge after completion');
}

{
  assert(click2mailConfigured({}) === false, 'unconfigured');
  assert(click2mailConfigured({ CLICK2MAIL_USERNAME: 'u', CLICK2MAIL_AUTH_BASIC: 'b', CLICK2MAIL_API_URL: 'https://x' }) === true, 'configured');
}

console.log('✓ production-ops: hygiene, clocks, CROA ledger');
console.log('production-ops tests passed');
