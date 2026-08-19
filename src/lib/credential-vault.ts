/**
 * Encrypted credential vault — secrets never stored plaintext in org settings.
 */
import { encryptText, decryptText } from './crypto';

export type VaultProvider = 'ghl' | 'mfsn' | 'twilio' | 'click2mail' | 'stripe' | 'sendgrid' | 'webhook';

export function maskSecretPreview(value: string): string {
  const s = String(value || '');
  if (!s) return '';
  if (s.length <= 4) return '••••';
  return `••••••••${s.slice(-4)}`;
}

export async function storeIntegrationSecret(opts: {
  db: D1Database;
  orgId: string;
  provider: VaultProvider;
  secretKey: string;
  plaintext: string;
  encryptionKey: string;
  createdBy?: string;
  id: string;
}): Promise<{ masked: string }> {
  if (!opts.plaintext?.trim()) {
    await opts.db.prepare(
      `UPDATE integration_secrets SET revoked_at = datetime('now'), updated_at = datetime('now')
       WHERE org_id = ? AND provider = ? AND secret_key = ? AND revoked_at IS NULL`,
    ).bind(opts.orgId, opts.provider, opts.secretKey).run();
    return { masked: '' };
  }
  const ciphertext = await encryptText(opts.plaintext.trim(), opts.encryptionKey);
  const masked = maskSecretPreview(opts.plaintext);
  await opts.db.prepare(
    `INSERT INTO integration_secrets (id, org_id, provider, secret_key, ciphertext, masked_preview, created_by, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(org_id, provider, secret_key) DO UPDATE SET
       ciphertext = excluded.ciphertext,
       masked_preview = excluded.masked_preview,
       rotated_at = datetime('now'),
       revoked_at = NULL,
       updated_at = datetime('now')`,
  ).bind(opts.id, opts.orgId, opts.provider, opts.secretKey, ciphertext, masked, opts.createdBy || null).run();
  return { masked };
}

export async function loadIntegrationSecret(opts: {
  db: D1Database;
  orgId: string;
  provider: VaultProvider;
  secretKey: string;
  encryptionKey: string;
}): Promise<string | null> {
  const row = await opts.db.prepare(
    `SELECT ciphertext FROM integration_secrets
     WHERE org_id = ? AND provider = ? AND secret_key = ? AND revoked_at IS NULL`,
  ).bind(opts.orgId, opts.provider, opts.secretKey).first() as any;
  if (!row?.ciphertext) return null;
  try {
    return await decryptText(row.ciphertext, opts.encryptionKey);
  } catch {
    return null;
  }
}

export async function listVaultPreviews(db: D1Database, orgId: string): Promise<Record<string, Record<string, string>>> {
  const rows = await db.prepare(
    `SELECT provider, secret_key, masked_preview FROM integration_secrets
     WHERE org_id = ? AND revoked_at IS NULL`,
  ).bind(orgId).all();
  const out: Record<string, Record<string, string>> = {};
  for (const r of rows.results || []) {
    const p = (r as any).provider;
    if (!out[p]) out[p] = {};
    out[p][(r as any).secret_key] = (r as any).masked_preview;
  }
  return out;
}

export async function logVaultAccess(opts: {
  db: D1Database;
  orgId: string;
  provider: string;
  action: string;
  userId?: string;
  role?: string;
  ip?: string;
  success?: boolean;
  detail?: string;
  id: string;
}): Promise<void> {
  await opts.db.prepare(
    `INSERT INTO integration_access_log (id, org_id, provider, action, user_id, role, ip, success, detail)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    opts.id, opts.orgId, opts.provider, opts.action,
    opts.userId || null, opts.role || null, opts.ip || null,
    opts.success !== false ? 1 : 0, opts.detail || null,
  ).run().catch(() => null);
}
