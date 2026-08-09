#!/usr/bin/env node
/**
 * Agent helper: login to MyFreeScoreNow partner API using .dev.vars credentials.
 * Usage:
 *   node scripts/mfsn-login.mjs
 *   node scripts/mfsn-login.mjs --email rickyjefferson1006@gmail.com
 *   node scripts/mfsn-login.mjs --pull member@email.com --client-token 'MAPIK#…'
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadDevVars() {
  const out = {};
  for (const name of ['.dev.vars', 'secrets.env', 'secrets.local.env']) {
    const p = resolve(root, name);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (!(k in out)) out[k] = v;
    }
  }
  return out;
}

function arg(name, fallback = '') {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

const env = loadDevVars();
const apiUrl = (arg('--api') || env.MFSN_API_URL || 'https://api.myfreescorenow.com').replace(/\/$/, '');
const email = (arg('--email') || env.MFSN_EMAIL || '').trim();
const password = (arg('--password') || env.MFSN_PASSWORD || '').trim();
const pullEmail = (arg('--pull') || '').trim();
const clientToken = (arg('--client-token') || env.MFSN_CLIENT_TOKEN || '').trim();

if (!email || !password) {
  console.error('Missing MFSN_EMAIL / MFSN_PASSWORD in .dev.vars (or pass --email / --password).');
  process.exit(1);
}

const loginRes = await fetch(`${apiUrl}/api/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginJson = await loginRes.json().catch(() => ({}));
const token = loginJson?.token || loginJson?.accessToken || loginJson?.data?.accessToken || loginJson?.data?.token;
if (!loginRes.ok || !token) {
  console.error('Login failed', loginRes.status, loginJson);
  process.exit(2);
}
console.log(JSON.stringify({
  ok: true,
  email,
  apiUrl,
  tokenPreview: String(token).slice(0, 12) + '…',
  tokenLength: String(token).length,
  message: loginJson.message || 'Login successful',
}, null, 2));

if (pullEmail) {
  if (!clientToken) {
    console.error('Need --client-token or MFSN_CLIENT_TOKEN to pull a member report.');
    process.exit(3);
  }
  const fd = new FormData();
  fd.append('email', pullEmail);
  fd.append('client_token', clientToken);
  const pullRes = await fetch(`${apiUrl}/api/auth/fetch-3B-json`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });
  const pullJson = await pullRes.json().catch(() => ({}));
  const views = pullJson?.data?.providerViews || [];
  console.log(JSON.stringify({
    pullOk: pullRes.ok && pullJson.success !== false,
    status: pullRes.status,
    message: pullJson.message,
    memberEmail: pullEmail,
    bureauViews: views.length,
    scores: views.map((v) => ({
      provider: v.provider,
      score: v?.summary?.creditScore?.score,
    })),
  }, null, 2));
  if (!(pullRes.ok && pullJson.success !== false)) process.exit(4);
}
