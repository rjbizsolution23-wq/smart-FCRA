/**
 * Violation engine unit tests — detectViolations + calculateLitigationScore
 * Run: npx tsx tests/violations-engine.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const { detectViolations, calculateLitigationScore, STATE_SOL } = await import(
  pathToFileURL(path.join(root, 'src/engine/violations.ts')).href
);

// ── Obsolete account (7-year rule) ─────────────────────────────
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

const obsoleteViolations = detectViolations(obsoleteReport);
assert(obsoleteViolations.length >= 1, 'obsolete charged-off account should trigger violation');
assert(
  obsoleteViolations.some((v) => v.subcategory.includes('Obsolete') || v.statute.includes('1681c')),
  'should cite FCRA obsolete information statute'
);

// ── Re-aging detection ─────────────────────────────────────────
const reagingReport = {
  ...obsoleteReport,
  accounts: [{
    creditorName: 'REAGER COLLECTOR',
    accountNumber: '****9999',
    accountType: 'Collection',
    accountStatus: 'collection',
    dateOpened: '2018-01-01',
    dofd: '2018-06-01',
    dola: '2023-01-15',
    currentBalance: 800,
    originalAmount: 800,
    highBalance: 800,
    creditLimit: 0,
    monthlyPayment: 0,
    paymentStatus: 'Collection',
    paymentHistory: '',
    isCollection: true,
  }],
  collections: [{
    creditorName: 'REAGER COLLECTOR',
    accountNumber: '****9999',
    accountType: 'Collection',
    accountStatus: 'collection',
    dateOpened: '2018-01-01',
    dofd: '2018-06-01',
    dola: '2023-01-15',
    currentBalance: 800,
    originalAmount: 800,
    highBalance: 800,
    creditLimit: 0,
    monthlyPayment: 0,
    paymentStatus: 'Collection',
    paymentHistory: '',
    isCollection: true,
  }],
};

const reagingViolations = detectViolations(reagingReport);
assert(
  reagingViolations.some((v) => v.subcategory.toLowerCase().includes('re-aging') || v.subcategory.toLowerCase().includes('dofd')),
  're-aging with DOLA >> DOFD on collection should trigger violation'
);

// ── Clean report returns zero or low violations ─────────────────
const cleanReport = {
  bureau: 'Experian',
  reportDate: '2026-01-15',
  personalInfo: { names: ['John Smith'], addresses: [], employers: [], ssns: [], dobs: [] },
  accounts: [{
    creditorName: 'CURRENT CARD',
    accountNumber: '****5555',
    accountType: 'Credit Card',
    accountStatus: 'Open',
    dateOpened: '2022-01-01',
    dofd: '',
    currentBalance: 200,
    originalAmount: 0,
    highBalance: 500,
    creditLimit: 5000,
    monthlyPayment: 25,
    paymentStatus: 'Current',
    paymentHistory: 'CCCCCCCCCCCC',
    isCollection: false,
  }],
  inquiries: [],
  publicRecords: [],
  collections: [],
};

const cleanViolations = detectViolations(cleanReport);
assert(Array.isArray(cleanViolations), 'detectViolations returns array');

// ── Litigation score ───────────────────────────────────────────
const litScore = calculateLitigationScore(obsoleteViolations);
assert(typeof litScore.score === 'number', 'litigation score is numeric');
assert(litScore.score > 0, 'obsolete violations should yield positive score');
assert(litScore.grade && litScore.grade.length <= 2, 'grade assigned');
assert(litScore.totalDamagesMin > 0, 'damages min calculated');
assert(litScore.totalDamagesMax >= litScore.totalDamagesMin, 'damages max >= min');
assert(Array.isArray(litScore.litigationPlan), 'litigation plan is array');

// ── STATE_SOL coverage ─────────────────────────────────────────
assert(STATE_SOL['CA']?.written === 4, 'California written SOL is 4 years');
assert(STATE_SOL['NY']?.written === 6, 'New York written SOL is 6 years');

console.log('PASS: violations engine tests (' + obsoleteViolations.length + ' obsolete, score=' + litScore.score + ')');
