#!/usr/bin/env node
/**
 * Wire a secrets intake file into local .dev.vars (gitignored).
 * Usage: node scripts/wire-secrets.mjs /path/to/your-secrets.env
 *
 * Never commits secrets. Production: also run wrangler secret put for each key
 * when CLOUDFLARE_API_TOKEN is available.
 */
import fs from 'fs';
import path from 'path';

const src = process.argv[2];
if (!src) {
  console.error('Usage: node scripts/wire-secrets.mjs <secrets.env>');
  process.exit(1);
}

const abs = path.resolve(src);
if (!fs.existsSync(abs)) {
  console.error('File not found:', abs);
  process.exit(1);
}

const raw = fs.readFileSync(abs, 'utf8');
const lines = raw.split(/\r?\n/);
const out = [];
const loaded = [];

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq <= 0) continue;
  const key = trimmed.slice(0, eq).trim();
  let val = trimmed.slice(eq + 1).trim();
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  if (!val || val.includes('REPLACE_') || val.includes('YOUR-') || val.endsWith('...')) {
    console.warn(`skip empty/placeholder: ${key}`);
    continue;
  }
  out.push(`${key}=${val}`);
  loaded.push(key);
}

const dest = path.resolve(process.cwd(), '.dev.vars');
fs.writeFileSync(dest, out.join('\n') + '\n', { mode: 0o600 });
console.log(`Wrote ${loaded.length} secrets to .dev.vars`);
console.log(loaded.join(', '));

// If Cloudflare token present, print wrangler secret commands (non-interactive hint)
if (loaded.includes('CLOUDFLARE_API_TOKEN')) {
  console.log('\nNext (production Pages secrets):');
  for (const key of loaded) {
    if (key.startsWith('CLOUDFLARE_') || key === 'D1_DATABASE_ID') continue;
    console.log(`  printf %s "…" | npx wrangler pages secret put ${key} --project-name smart-fcra-v2`);
  }
}
