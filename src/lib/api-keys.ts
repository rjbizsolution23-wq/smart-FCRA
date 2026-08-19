/**
 * Org-scoped API keys for Zapier / external integrations.
 */
import { sha256Hex } from '../data/legal-contracts';

export const API_KEY_PREFIX = 'sf_live_';

export type ApiKeyScope = 'read' | 'write' | 'webhooks';

export async function generateApiKeyMaterial(): Promise<{ raw: string; prefix: string; hash: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const raw = `${API_KEY_PREFIX}${secret}`;
  const prefix = raw.slice(0, 16);
  return { raw, prefix, hash: await sha256Hex(raw) };
}

export async function hashApiKey(raw: string): Promise<string> {
  return sha256Hex(raw.trim());
}

export function parseApiKeyScopes(json?: string | null): ApiKeyScope[] {
  try {
    const arr = JSON.parse(json || '[]');
    if (!Array.isArray(arr)) return ['read'];
    return arr.filter((s) => s === 'read' || s === 'write' || s === 'webhooks') as ApiKeyScope[];
  } catch {
    return ['read'];
  }
}

export function scopesAllow(scopes: ApiKeyScope[], needed: ApiKeyScope): boolean {
  if (scopes.includes('write')) return true;
  return scopes.includes(needed);
}
