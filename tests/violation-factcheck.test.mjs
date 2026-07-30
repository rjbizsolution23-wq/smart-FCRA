/**
 * Fact-check + live analysis — rejects ungrounded/speculative hits, attaches reasoning.
 * Run: npx tsx tests/violation-factcheck.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { detectViolations } = await import(
  pathToFileURL(path.join(root, 'src/engine/violations.ts')).href
);
const { factCheckViolations, analyzeReportLive } = await import(
  pathToFileURL(path.join(root, 'src/engine/violation-factcheck.ts')).href
);
const { buildCaseLawChunks } = await import(
  pathToFileURL(path.join(root, 'src/lib/knowledge-base.ts')).href
);
const { listEmailTemplates, EMAIL_TEMPLATES } = await import(
  pathToFileURL(path.join(root, 'src/lib/email-templates.ts')).href
);

const obsoleteReport = {
  bureau: 'Equifax',
  reportDate: '2026-01-15',
  personalInfo: { names: ['Jane Doe'], addresses: [], employers: [], ssns: [], dobs: [] },
  accounts: [{
    creditorName: 'OLD COLLECTION CO',
    accountNumber: '****1234',
    accountType: 'Collection',
    accountStatus: 'charged off',
    dateOpened: '2010-01-01',
    dofd: '2015-03-15',
    currentBalance: 1200,
    originalAmount: 1200,
    highBalance: 1200,
    creditLimit: 0,
    monthlyPayment: 0,
    paymentStatus: 'Charge-off',
    paymentHistory: '',
    isCollection: true,
  }],
  inquiries: [],
  publicRecords: [],
  collections: [],
};

const analysis = analyzeReportLive(obsoleteReport, detectViolations);
assert(analysis.analysisMode === 'live_rules_engine', 'must use live rules engine');
assert(analysis.violations.length >= 1, 'obsolete account should yield grounded findings');
assert(analysis.reasoningSummary.includes('live parsed'), 'summary should describe live parse');
const first = analysis.violations[0];
assert(Array.isArray(first.reasoning) && first.reasoning.length >= 3, 'reasoning steps required');
assert(['verified', 'needs_review'].includes(first.factCheckStatus), 'status must be verified or needs_review');
assert(typeof first.confidence === 'number' && first.confidence > 0, 'confidence required');

// Speculative unauthorized inquiry without purpose gap → rejected or needs_review
const speculative = {
  id: 'v_test_inq',
  category: 'FCRA',
  subcategory: 'Unauthorized Inquiry',
  severity: 'critical',
  statute: '15 U.S.C. § 1681b',
  statuteText: 'permissible purpose',
  legalStandard: 'test',
  evidence: 'Potential unauthorized inquiry volume',
  explanation: 'speculative',
  caseLaw: '',
  statutoryDamagesMin: 100,
  statutoryDamagesMax: 1000,
  actualDamagesEst: 0,
  punitiveDamagesEst: 0,
  attorneyFeesEst: 0,
  totalDamagesMin: 100,
  totalDamagesMax: 1000,
  defendantType: 'CRA',
  defendantName: 'Equifax',
};
const lowVolumeReport = {
  ...obsoleteReport,
  inquiries: [
    { creditorName: 'Bank A', inquiryDate: '2025-12-01', inquiryType: 'hard', purpose: 'credit application' },
    { creditorName: 'Bank B', inquiryDate: '2025-11-01', inquiryType: 'hard', purpose: 'credit application' },
  ],
};
const filtered = factCheckViolations(lowVolumeReport, [speculative]);
assert(filtered.length === 0, 'speculative unauthorized inquiry without purpose gap must be rejected');

const keptRejected = factCheckViolations(lowVolumeReport, [speculative], { keepRejected: true });
assert(keptRejected[0].factCheckStatus === 'rejected', 'keepRejected should surface rejected status');

// Ungrounded FDCPA dispute indicator
const fakeDispute = {
  ...speculative,
  id: 'v_test_disp',
  subcategory: 'Disputed Debt Indicator Missing',
  statute: '15 U.S.C. § 1692e(8)',
  evidence: 'collection without dispute flag',
  accountName: 'OLD COLLECTION CO',
  accountNumber: '****1234',
};
const noDispute = factCheckViolations(obsoleteReport, [fakeDispute]);
assert(noDispute.length === 0, 'ungrounded dispute-indicator hit must be rejected');

const chunks = buildCaseLawChunks();
assert(chunks.length > 0, 'case law chunks must build from curated DB');
assert(chunks.every((c) => c.source === 'case_law' && c.body && c.title), 'chunks must be complete');

const templates = listEmailTemplates();
assert(templates.length >= 10, 'email template catalog must cover full path');
const ids = EMAIL_TEMPLATES.map((t) => t.id);
for (const required of [
  'report_analyzed',
  'violations_ready',
  'dispute_letters_ready',
  'dispute_mailed',
  'bureau_response_recorded',
  'daily_morning_ritual',
  'portal_welcome',
]) {
  assert(ids.includes(required), `missing template ${required}`);
}

console.log('violation-factcheck.test.mjs: OK', {
  grounded: analysis.violations.length,
  raw: analysis.rawCount,
  rejected: analysis.rejectedCount,
  templates: templates.length,
  kbChunks: chunks.length,
});
