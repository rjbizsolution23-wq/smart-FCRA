#!/usr/bin/env node
/**
 * Lob live re-test — verifies real connectivity to the Lob API using
 * whatever LOB_SECRET_KEY (test_... or live_...) is available in the
 * environment or .dev.vars, without touching the Cloudflare Worker.
 *
 * What it does:
 *   1. Reports configured/mode from lobPublicStatus()
 *   2. Calls POST /us_verifications (address verification) — safe, no mail sent
 *   3. If --send-test-letter is passed AND the key is a test_ key, sends one
 *      real test letter via sendLetterViaLob() to Lob's own address (never a
 *      real client) so the full send pipeline (payload shape, auth, response
 *      parsing) is exercised end-to-end. Refuses to run with a live_ key
 *      unless --i-understand-this-is-live is also passed.
 *
 * Usage:
 *   node scripts/lob-live-test.mjs                       # status + address verify only
 *   node scripts/lob-live-test.mjs --send-test-letter     # + one letter (test mode only)
 *   LOB_SECRET_KEY=test_xxx node scripts/lob-live-test.mjs
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Load .dev.vars into process.env if present (does not override existing env).
const devVarsPath = path.join(root, '.dev.vars');
if (fs.existsSync(devVarsPath)) {
  const raw = fs.readFileSync(devVarsPath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

const {
  lobConfigured,
  lobPublicStatus,
  lobMode,
  verifyUsAddress,
  sendLetterViaLob,
} = await import(pathToFileURL(path.join(root, 'src/lib/lob.ts')).href);

const env = {
  LOB_SECRET_KEY: process.env.LOB_SECRET_KEY,
  LOB_PUBLISHABLE_KEY: process.env.LOB_PUBLISHABLE_KEY,
  LOB_API_KEY: process.env.LOB_API_KEY,
  LOB_TEST_SECRET_KEY: process.env.LOB_TEST_SECRET_KEY,
  LOB_TEST_PUBLISHABLE_KEY: process.env.LOB_TEST_PUBLISHABLE_KEY,
  LOB_LIVE_SECRET_KEY: process.env.LOB_LIVE_SECRET_KEY,
  LOB_LIVE_PUBLISHABLE_KEY: process.env.LOB_LIVE_PUBLISHABLE_KEY,
  LOB_MODE: process.env.LOB_MODE,
  COMPANY_NAME: process.env.COMPANY_NAME,
  COMPANY_ADDRESS: process.env.COMPANY_ADDRESS,
  COMPANY_OWNER: process.env.COMPANY_OWNER,
};

const sendTestLetter = process.argv.includes('--send-test-letter');
const iUnderstandLive = process.argv.includes('--i-understand-this-is-live');

console.log('=== Lob live re-test ===');

if (!lobConfigured(env)) {
  console.error('FAIL: Lob is not configured. Set LOB_SECRET_KEY (test_... for sandbox, live_... for production) in .dev.vars or the environment.');
  process.exit(1);
}

const status = lobPublicStatus(env);
const mode = lobMode(env);
console.log('Configured: true');
console.log('Mode:', mode);
console.log('Status label:', status.label);
console.log('Publishable key present:', status.publishableConfigured);

if (mode === 'live' && !iUnderstandLive) {
  console.warn('\nWARNING: a live_ secret key was detected. Address verification below is read-only and safe, but --send-test-letter is BLOCKED for live keys unless you also pass --i-understand-this-is-live (a live key will incur real USPS postage cost).');
}

// Step 1: address verification (always safe — no mail sent, no cost).
console.log('\n--- Step 1: POST /us_verifications ---');
try {
  const verified = await verifyUsAddress(env, {
    primary_line: '210 King St',
    secondary_line: 'Fl 6',
    city: 'San Francisco',
    state: 'CA',
    zip_code: '94107',
  });
  console.log('OK — Lob API reachable and authenticated.');
  console.log('deliverability:', verified.deliverability);
  console.log('primary_line:', verified.primary_line);
} catch (err) {
  console.error('FAIL: address verification call failed —', err.message);
  process.exit(1);
}

// Step 2 (optional): send one real test letter through the full pipeline.
if (sendTestLetter) {
  console.log('\n--- Step 2: sendLetterViaLob() end-to-end send ---');
  if (mode === 'live' && !iUnderstandLive) {
    console.error('Refusing to send a live letter without --i-understand-this-is-live. Exiting.');
    process.exit(1);
  }
  try {
    const result = await sendLetterViaLob(env, {
      title: 'Smart FCRA — Lob Live Re-Test Letter',
      content: 'This is an automated connectivity re-test of the Smart FCRA <-> Lob mailing pipeline. Safe to discard.',
      recipient: {
        name: 'Lob Test Recipient',
        address1: '210 King St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94107',
      },
      mailClass: 'FIRST_CLASS',
      metadata: { source: 'smart_fcra_live_test' },
    });
    console.log('OK — letter created.');
    console.log('mailingId:', result.mailingId);
    console.log('mode:', result.mode);
    console.log('mailClass:', result.mailClass);
    console.log('expectedDeliveryDate:', result.expectedDeliveryDate || '(n/a)');
    if (result.url) console.log('PDF proof URL:', result.url);
  } catch (err) {
    console.error('FAIL: sendLetterViaLob failed —', err.message);
    process.exit(1);
  }
} else {
  console.log('\n(Skipping Step 2 — pass --send-test-letter to exercise the full letter-send pipeline.)');
}

console.log('\n=== Lob live re-test PASSED ===');
