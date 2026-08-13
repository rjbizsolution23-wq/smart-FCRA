#!/usr/bin/env node
/**
 * Local Pages preview without Cloudflare AI remote OAuth.
 * Temporarily strips the [ai] binding from wrangler.toml for this process only.
 */
import { spawn } from 'child_process';
import { copyFileSync, readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerPath = path.join(root, 'wrangler.toml');
const backupPath = path.join(root, 'wrangler.toml.__preview_bak');

const original = readFileSync(wranglerPath, 'utf8');
const withoutAi = original
  .replace(/\n\[ai\][\s\S]*?(?=\n\[|\n# |\s*$)/, '\n')
  .replace(/\[ai\]\s*\nbinding\s*=\s*"AI"\s*/g, '')
  .trimEnd() + '\n';

copyFileSync(wranglerPath, backupPath);
writeFileSync(wranglerPath, withoutAi);

const jsoncPath = path.join(root, 'wrangler.jsonc');
const jsoncBackupPath = path.join(root, 'wrangler.jsonc.__preview_bak');
if (existsSync(jsoncPath)) {
  const jsonc = readFileSync(jsoncPath, 'utf8');
  copyFileSync(jsoncPath, jsoncBackupPath);
  writeFileSync(jsoncPath, jsonc.replace(/,?\s*"ai"\s*:\s*\{[^}]*\}/, ''));
}
console.log('[preview] AI binding stripped for local sandbox (no Cloudflare OAuth)');

function restore() {
  try {
    if (existsSync(backupPath)) {
      copyFileSync(backupPath, wranglerPath);
      unlinkSync(backupPath);
      console.log('[preview] wrangler.toml restored');
    }
    if (existsSync(jsoncBackupPath)) {
      copyFileSync(jsoncBackupPath, jsoncPath);
      unlinkSync(jsoncBackupPath);
      console.log('[preview] wrangler.jsonc restored');
    }
  } catch (e) {
    console.error('[preview] restore failed', e);
  }
}

let restored = false;
function safeRestore() {
  if (restored) return;
  restored = true;
  restore();
}

process.on('exit', safeRestore);
process.on('SIGINT', () => { safeRestore(); process.exit(130); });
process.on('SIGTERM', () => { safeRestore(); process.exit(143); });
process.on('uncaughtException', (e) => { console.error(e); safeRestore(); process.exit(1); });

const child = spawn(
  'npx',
  [
    'wrangler',
    'pages',
    'dev',
    'dist',
    '--d1=fcra-detector-v2',
    '--ip',
    '127.0.0.1',
    '--port',
    '3000',
    '--show-interactive-dev-session',
    'false',
  ],
  {
    cwd: root,
    stdio: 'inherit',
    env: {
      ...process.env,
      WRANGLER_SEND_METRICS: 'false',
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    },
  },
);

child.on('exit', (code) => {
  safeRestore();
  process.exit(code ?? 1);
});
