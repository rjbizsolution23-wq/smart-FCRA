/**
 * Platform extensions — BYOK AI, AI credits, payment gateways, Zoom, custom contracts.
 * Cloudflare-native: D1 + R2 + Workers AI + encrypted vault.
 */
import { storeIntegrationSecret, loadIntegrationSecret, maskSecretPreview } from './credential-vault';
import { generateId } from './auth';
import { DEMO_ORG_ID } from '../engine/demo-experience';

export const BYOK_AI_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', secretKey: 'api_key', models: ['gpt-4o-mini', 'gpt-4o'] },
  { id: 'groq', name: 'Groq', secretKey: 'api_key', models: ['llama-3.3-70b-versatile'] },
  { id: 'gemini', name: 'Google Gemini', secretKey: 'api_key', models: ['gemini-2.0-flash'] },
  { id: 'anthropic', name: 'Anthropic', secretKey: 'api_key', models: ['claude-3-5-sonnet-latest'] },
  { id: 'openrouter', name: 'OpenRouter', secretKey: 'api_key', models: ['meta-llama/llama-3.3-70b-instruct:free'] },
  { id: 'together', name: 'Together AI', secretKey: 'api_key', models: [] },
  { id: 'nvidia', name: 'NVIDIA NIM', secretKey: 'api_key', models: [] },
] as const;

export const PAYMENT_GATEWAYS = [
  { id: 'stripe', name: 'Stripe (platform)', description: 'Default Smart FCRA billing — org SaaS + client checkout on platform Stripe.' },
  { id: 'stripe_connect', name: 'Stripe Connect', description: 'Tenant connects own Stripe account for client billing.' },
  { id: 'authorize_net', name: 'Authorize.net', description: 'API Login ID + Transaction Key for client invoices and subscriptions.' },
  { id: 'nmi', name: 'NMI (Network Merchants)', description: 'Security key + gateway ID for high-risk / CRO merchant accounts.' },
] as const;

export const AI_CREDIT_PACKS = [
  { id: 'starter', credits: 5000, amountCents: 4900, label: '5,000 AI credits — $49' },
  { id: 'growth', credits: 25000, amountCents: 19900, label: '25,000 AI credits — $199' },
  { id: 'scale', credits: 100000, amountCents: 69900, label: '100,000 AI credits — $699' },
] as const;

/** Demo sandbox uses deterministic vault key when platform PII key missing (preview only). */
export const DEMO_SANDBOX_VAULT_KEY = 'smart-fcra-demo-sandbox-vault-key-2026!!';

export function resolveOrgEncryptionKey(platformKey: string | undefined, orgId?: string | null): string {
  if (platformKey && platformKey.length >= 32) return platformKey;
  if (orgId === DEMO_ORG_ID) return DEMO_SANDBOX_VAULT_KEY;
  throw new Error('PII_ENCRYPTION_KEY must be set (minimum 32 characters) before processing reports.');
}

export function encryptionReady(platformKey: string | undefined, orgId?: string | null): boolean {
  if (platformKey && platformKey.length >= 32) return true;
  return orgId === DEMO_ORG_ID;
}

export async function listOrgAiProviders(db: D1Database, orgId: string, encryptionKey: string) {
  const rows = await db.prepare(
    'SELECT provider_id, enabled, priority, use_platform_fallback, config_json FROM org_ai_providers WHERE org_id = ? ORDER BY priority DESC',
  ).bind(orgId).all().catch(() => ({ results: [] }));

  const out = [];
  for (const p of BYOK_AI_PROVIDERS) {
    const row = (rows.results || []).find((r: any) => r.provider_id === p.id) as any;
    const key = await loadIntegrationSecret({
      db, orgId, provider: 'webhook', secretKey: `ai_${p.id}`, encryptionKey,
    }).catch(() => null);
    out.push({
      id: p.id,
      name: p.name,
      models: p.models,
      enabled: row ? !!row.enabled : false,
      priority: row?.priority ?? 0,
      usePlatformFallback: row ? !!row.use_platform_fallback : true,
      apiKeyMasked: key ? maskSecretPreview(key) : '',
      configured: !!key,
    });
  }
  return out;
}

export async function saveOrgAiProvider(opts: {
  db: D1Database;
  orgId: string;
  providerId: string;
  apiKey?: string;
  enabled?: boolean;
  priority?: number;
  usePlatformFallback?: boolean;
  encryptionKey: string;
  userId: string;
}) {
  const id = generateId();
  if (opts.apiKey?.trim()) {
    await storeIntegrationSecret({
      db: opts.db,
      orgId: opts.orgId,
      provider: 'webhook',
      secretKey: `ai_${opts.providerId}`,
      plaintext: opts.apiKey.trim(),
      encryptionKey: opts.encryptionKey,
      createdBy: opts.userId,
      id: generateId(),
    });
  }
  await opts.db.prepare(
    `INSERT INTO org_ai_providers (id, org_id, provider_id, enabled, priority, use_platform_fallback, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(org_id, provider_id) DO UPDATE SET
       enabled = excluded.enabled,
       priority = excluded.priority,
       use_platform_fallback = excluded.use_platform_fallback,
       updated_at = datetime('now')`,
  ).bind(
    id,
    opts.orgId,
    opts.providerId,
    opts.enabled !== false ? 1 : 0,
    opts.priority ?? 0,
    opts.usePlatformFallback !== false ? 1 : 0,
  ).run();
}

export async function loadOrgAiKey(
  db: D1Database,
  orgId: string,
  providerId: string,
  encryptionKey: string,
): Promise<string | null> {
  const row = await db.prepare(
    'SELECT enabled FROM org_ai_providers WHERE org_id = ? AND provider_id = ? AND enabled = 1',
  ).bind(orgId, providerId).first() as any;
  if (!row) return null;
  return loadIntegrationSecret({
    db, orgId, provider: 'webhook', secretKey: `ai_${providerId}`, encryptionKey,
  });
}

export async function getOrgAiCredits(db: D1Database, orgId: string) {
  const row = await db.prepare(
    'SELECT balance, lifetime_purchased, lifetime_used FROM org_ai_credits WHERE org_id = ?',
  ).bind(orgId).first() as any;
  if (!row) {
    await db.prepare(
      'INSERT OR IGNORE INTO org_ai_credits (org_id, balance) VALUES (?, 500)',
    ).bind(orgId).run();
    return { balance: 500, lifetimePurchased: 0, lifetimeUsed: 0, platformIncluded: true };
  }
  return {
    balance: Number(row.balance || 0),
    lifetimePurchased: Number(row.lifetime_purchased || 0),
    lifetimeUsed: Number(row.lifetime_used || 0),
    platformIncluded: orgId === DEMO_ORG_ID,
  };
}

export async function chargeAiCredits(opts: {
  db: D1Database;
  orgId: string;
  userId?: string;
  provider: string;
  model: string;
  feature: string;
  credits?: number;
}): Promise<{ ok: boolean; balance: number; error?: string }> {
  const cost = opts.credits ?? 1;
  const credits = await getOrgAiCredits(opts.db, opts.orgId);
  if (credits.balance < cost) {
    return { ok: false, balance: credits.balance, error: 'Insufficient AI credits. Purchase a pack in Settings → AI & Integrations.' };
  }
  await opts.db.prepare(
    `UPDATE org_ai_credits SET balance = balance - ?, lifetime_used = lifetime_used + ?, updated_at = datetime('now') WHERE org_id = ?`,
  ).bind(cost, cost, opts.orgId).run();
  await opts.db.prepare(
    `INSERT INTO org_ai_usage (id, org_id, user_id, provider, model, tokens_est, credits_charged, feature)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(generateId(), opts.orgId, opts.userId || null, opts.provider, opts.model, cost * 100, cost, opts.feature).run();
  const after = await getOrgAiCredits(opts.db, opts.orgId);
  return { ok: true, balance: after.balance };
}

export async function addOrgAiCredits(db: D1Database, orgId: string, credits: number) {
  await db.prepare(
    `INSERT INTO org_ai_credits (org_id, balance, lifetime_purchased) VALUES (?, ?, ?)
     ON CONFLICT(org_id) DO UPDATE SET
       balance = balance + excluded.balance,
       lifetime_purchased = lifetime_purchased + excluded.lifetime_purchased,
       updated_at = datetime('now')`,
  ).bind(orgId, credits, credits).run();
}

export async function listOrgPaymentGateways(db: D1Database, orgId: string, encryptionKey: string) {
  const rows = await db.prepare(
    'SELECT gateway, status, is_default, config_json FROM org_payment_gateways WHERE org_id = ?',
  ).bind(orgId).all().catch(() => ({ results: [] }));
  const configured = new Map((rows.results || []).map((r: any) => [r.gateway, r]));

  const out = [];
  for (const g of PAYMENT_GATEWAYS) {
    const row = configured.get(g.id) as any;
    let masked: Record<string, string> = {};
    if (g.id === 'authorize_net') {
      const login = await loadIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'authnet_login', encryptionKey }).catch(() => null);
      const trans = await loadIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'authnet_transaction_key', encryptionKey }).catch(() => null);
      masked = { loginId: login ? maskSecretPreview(login) : '', transactionKey: trans ? maskSecretPreview(trans) : '' };
    }
    if (g.id === 'nmi') {
      const sk = await loadIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'nmi_security_key', encryptionKey }).catch(() => null);
      masked = { securityKey: sk ? maskSecretPreview(sk) : '' };
    }
    if (g.id === 'stripe_connect') {
      const acct = await loadIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'connect_account_id', encryptionKey }).catch(() => null);
      masked = { accountId: acct ? maskSecretPreview(acct) : '' };
    }
    out.push({
      id: g.id,
      name: g.name,
      description: g.description,
      status: row?.status || 'not_configured',
      isDefault: !!row?.is_default,
      masked,
      configured: row?.status === 'active' || Object.values(masked).some(Boolean),
    });
  }
  return out;
}

export async function savePaymentGateway(opts: {
  db: D1Database;
  orgId: string;
  gateway: string;
  encryptionKey: string;
  userId: string;
  body: Record<string, unknown>;
}) {
  const { gateway, body, db, orgId, encryptionKey, userId } = opts;
  const id = generateId();

  if (gateway === 'authorize_net') {
    if (body.loginId) {
      await storeIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'authnet_login', plaintext: String(body.loginId), encryptionKey, createdBy: userId, id: generateId() });
    }
    if (body.transactionKey) {
      await storeIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'authnet_transaction_key', plaintext: String(body.transactionKey), encryptionKey, createdBy: userId, id: generateId() });
    }
  }
  if (gateway === 'nmi') {
    if (body.securityKey) {
      await storeIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'nmi_security_key', plaintext: String(body.securityKey), encryptionKey, createdBy: userId, id: generateId() });
    }
    if (body.gatewayId) {
      await storeIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'nmi_gateway_id', plaintext: String(body.gatewayId), encryptionKey, createdBy: userId, id: generateId() });
    }
  }
  if (gateway === 'stripe_connect' && body.accountId) {
    await storeIntegrationSecret({ db, orgId, provider: 'stripe', secretKey: 'connect_account_id', plaintext: String(body.accountId), encryptionKey, createdBy: userId, id: generateId() });
  }
  if (gateway === 'zoom') {
    if (body.clientId) await storeIntegrationSecret({ db, orgId, provider: 'webhook', secretKey: 'zoom_client_id', plaintext: String(body.clientId), encryptionKey, createdBy: userId, id: generateId() });
    if (body.clientSecret) await storeIntegrationSecret({ db, orgId, provider: 'webhook', secretKey: 'zoom_client_secret', plaintext: String(body.clientSecret), encryptionKey, createdBy: userId, id: generateId() });
    if (body.accountId) await storeIntegrationSecret({ db, orgId, provider: 'webhook', secretKey: 'zoom_account_id', plaintext: String(body.accountId), encryptionKey, createdBy: userId, id: generateId() });
  }

  const status = body.testOk ? 'active' : (body.loginId || body.securityKey || body.accountId || body.clientId ? 'pending' : 'not_configured');
  await db.prepare(
    `INSERT INTO org_payment_gateways (id, org_id, gateway, status, is_default, config_json, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(org_id, gateway) DO UPDATE SET status = excluded.status, is_default = excluded.is_default, config_json = excluded.config_json, updated_at = datetime('now')`,
  ).bind(id, orgId, gateway, status, body.isDefault ? 1 : 0, JSON.stringify({ sandbox: !!body.sandbox, publicClientId: body.publicClientId || null })).run();
}

export async function getZoomStatus(db: D1Database, orgId: string, encryptionKey: string) {
  const row = await db.prepare('SELECT status, config_json FROM org_zoom_connections WHERE org_id = ?').bind(orgId).first() as any;
  const clientId = await loadIntegrationSecret({ db, orgId, provider: 'webhook', secretKey: 'zoom_client_id', encryptionKey }).catch(() => null);
  const accountId = await loadIntegrationSecret({ db, orgId, provider: 'webhook', secretKey: 'zoom_account_id', encryptionKey }).catch(() => null);
  let config: any = {};
  try { config = JSON.parse(row?.config_json || '{}'); } catch { /* */ }
  return {
    status: row?.status || (clientId ? 'pending' : 'disconnected'),
    clientIdMasked: clientId ? maskSecretPreview(clientId) : '',
    accountIdMasked: accountId ? maskSecretPreview(accountId) : '',
    configured: !!clientId,
    scopes: ['meeting:write', 'meeting:read', 'user:read'],
    oauthUrl: '/api/platform-extensions/zoom/oauth/start',
    features: ['Schedule client meetings from Video tab', 'Staff join links on case file', 'Recording disclaimer for compliance'],
  };
}

export async function createZoomMeeting(opts: {
  db: D1Database;
  orgId: string;
  encryptionKey: string;
  topic: string;
  startTime?: string;
  durationMin?: number;
}): Promise<{ ok: boolean; joinUrl?: string; startUrl?: string; meetingId?: string; error?: string }> {
  const accountId = await loadIntegrationSecret({
    db: opts.db, orgId: opts.orgId, provider: 'webhook', secretKey: 'zoom_account_id', encryptionKey: opts.encryptionKey,
  }).catch(() => null);
  const clientSecret = await loadIntegrationSecret({
    db: opts.db, orgId: opts.orgId, provider: 'webhook', secretKey: 'zoom_client_secret', encryptionKey: opts.encryptionKey,
  }).catch(() => null);
  const clientId = await loadIntegrationSecret({
    db: opts.db, orgId: opts.orgId, provider: 'webhook', secretKey: 'zoom_client_id', encryptionKey: opts.encryptionKey,
  }).catch(() => null);

  if (!clientId || !clientSecret) {
    return { ok: false, error: 'Zoom is not configured. Add Server-to-Server OAuth credentials in Integration Hub → Zoom.' };
  }

  // Server-to-server token (Zoom OAuth account credentials)
  const tokenRes = await fetch(`https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(accountId || '')}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }).catch(() => null);

  if (!tokenRes?.ok) {
    return { ok: false, error: 'Zoom OAuth failed — verify Client ID, Secret, and Account ID in Integration Hub.' };
  }
  const tokenData = await tokenRes.json() as any;
  const accessToken = tokenData.access_token;
  if (!accessToken) return { ok: false, error: 'Zoom token response missing access_token' };

  const meetingRes = await fetch('https://api.zoom.us/v2/users/me/meetings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topic: opts.topic,
      type: 2,
      start_time: opts.startTime || new Date(Date.now() + 3600000).toISOString(),
      duration: opts.durationMin || 30,
      settings: { join_before_host: true, waiting_room: true, approval_type: 2 },
    }),
  });
  if (!meetingRes.ok) {
    const err = await meetingRes.text();
    return { ok: false, error: `Zoom meeting create failed: ${err.slice(0, 200)}` };
  }
  const meeting = await meetingRes.json() as any;
  return {
    ok: true,
    joinUrl: meeting.join_url,
    startUrl: meeting.start_url,
    meetingId: String(meeting.id || ''),
  };
}

export async function listOrgContractTemplates(db: D1Database, orgId: string) {
  const rows = await db.prepare(
    `SELECT id, template_type, name, version, is_active, content_hash, created_at
     FROM org_contract_templates WHERE org_id = ? ORDER BY template_type, version DESC`,
  ).bind(orgId).all().catch(() => ({ results: [] }));
  return rows.results || [];
}

export async function saveOrgContractTemplate(opts: {
  db: D1Database;
  orgId: string;
  userId: string;
  templateType: string;
  name: string;
  bodyText: string;
}) {
  const id = generateId();
  const body = opts.bodyText.trim();
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const hash = Array.from(new Uint8Array(hashBuf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const prev = await opts.db.prepare(
    'SELECT MAX(version) as v FROM org_contract_templates WHERE org_id = ? AND template_type = ?',
  ).bind(opts.orgId, opts.templateType).first() as any;
  const version = Number(prev?.v || 0) + 1;
  await opts.db.prepare(
    `UPDATE org_contract_templates SET is_active = 0 WHERE org_id = ? AND template_type = ?`,
  ).bind(opts.orgId, opts.templateType).run();
  await opts.db.prepare(
    `INSERT INTO org_contract_templates (id, org_id, template_type, name, version, body_text, content_hash, is_active, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
  ).bind(id, opts.orgId, opts.templateType, opts.name, version, body, hash, opts.userId).run();
  return { id, version, contentHash: hash };
}

export async function getActiveOrgContractTemplate(db: D1Database, orgId: string, templateType: string) {
  return db.prepare(
    `SELECT * FROM org_contract_templates WHERE org_id = ? AND template_type = ? AND is_active = 1 ORDER BY version DESC LIMIT 1`,
  ).bind(orgId, templateType).first() as Promise<any>;
}

export function renderOrgTemplate(body: string, vars: Record<string, string>): string {
  let out = body;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v);
    out = out.replace(new RegExp(`\\[${k}\\]`, 'gi'), v);
  }
  return out;
}
