// Simple auth helpers for session management
// Strictly using native Web Cryptography APIs for maximum compatibility and edge execution speed.

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'fcra-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

export function createSessionToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateEmailToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a standard Base32 TOTP secret seed for MFA authenticators.
 */
export function generateMFASecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const arr = new Uint8Array(16); // 80-bit secret is secure and standard
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < 16; i++) {
    out += alphabet[arr[i] % 32];
  }
  return out;
}

/**
 * Helper to decode base32 format seeds into raw binary arrays.
 */
function decodeBase32(b32: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = b32.toUpperCase().replace(/=+$/, '');
  const len = clean.length;
  const out = new Uint8Array(Math.floor((len * 5) / 8));
  let val = 0;
  let bits = 0;
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const charVal = alphabet.indexOf(clean[i]);
    if (charVal === -1) throw new Error('Invalid base32 character');
    val = (val << 5) | charVal;
    bits += 5;
    if (bits >= 8) {
      out[idx++] = (val >> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return out;
}

/**
 * Validates a standard RFC 6238 TOTP 6-digit code against a base32 secret.
 * Supports a customizable time-step window (default ±1 window drift allowance).
 */
export async function verifyTOTP(secret: string, code: string, window = 1): Promise<boolean> {
  if (!secret || !code) return false;
  try {
    const keyBytes = decodeBase32(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const now = Math.floor(Date.now() / 1000 / 30); // 30-second intervals

    for (let i = -window; i <= window; i++) {
      const time = now + i;
      const counter = new Uint8Array(8);
      let temp = time;
      for (let j = 7; j >= 0; j--) {
        counter[j] = temp & 255;
        temp = temp >> 8;
      }

      const signature = await crypto.subtle.sign('HMAC', cryptoKey, counter);
      const sigBytes = new Uint8Array(signature);
      const offset = sigBytes[19] & 15;
      const otpVal = ((sigBytes[offset] & 127) << 24) |
        (sigBytes[offset + 1] << 16) |
        (sigBytes[offset + 2] << 8) |
        sigBytes[offset + 3];
      const otpStr = (otpVal % 1000000).toString().padStart(6, '0');

      if (otpStr === code) return true;
    }
  } catch (e) {
    console.error('[TOTP] Verification error:', e);
  }
  return false;
}
