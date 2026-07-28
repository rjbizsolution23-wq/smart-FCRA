// Enterprise auth helpers — PBKDF2-SHA-256 (Web Crypto) for Cloudflare Workers edge.
// Legacy SHA-256+static-salt hashes remain verifiable and upgrade on successful login.

// Cloudflare Workers Web Crypto caps PBKDF2 iterations at 100_000.
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_PREFIX = 'pbkdf2';

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function toHex(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) return new Uint8Array();
  return new Uint8Array(matches.map(byte => parseInt(byte, 16)));
}

async function pbkdf2Hash(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return `${PBKDF2_PREFIX}$${iterations}$${toHex(salt)}$${toHex(derived)}`;
}

/** Legacy SHA-256 + static salt (pre-hardening). Kept only for verify/migrate. */
async function legacyHashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'fcra-salt-2026');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return toHex(hashBuffer);
}

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return pbkdf2Hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;

  if (hash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const parts = hash.split('$');
    if (parts.length !== 4) return false;
    const iterations = parseInt(parts[1], 10);
    const salt = fromHex(parts[2]);
    const expected = parts[3];
    const computed = await pbkdf2Hash(password, salt, iterations);
    const computedDigest = computed.split('$')[3];
    return timingSafeEqual(computedDigest, expected);
  }

  // Legacy migration path
  const legacy = await legacyHashPassword(password);
  return timingSafeEqual(legacy, hash);
}

/** True when stored hash should be upgraded to PBKDF2 after successful login. */
export function needsPasswordRehash(hash: string): boolean {
  return !hash?.startsWith(`${PBKDF2_PREFIX}$`);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function createSessionToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

export function generateEmailToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return toHex(arr);
}

export function generateMFASecret(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  let out = '';
  for (let i = 0; i < 20; i++) out += alphabet[arr[i] % 32];
  return out;
}

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

export async function verifyTOTP(secret: string, code: string, window = 1): Promise<boolean> {
  if (!secret || !code || !/^\d{6}$/.test(code)) return false;
  try {
    const keyBytes = decodeBase32(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'HMAC', hash: { name: 'SHA-1' } },
      false,
      ['sign']
    );

    const now = Math.floor(Date.now() / 1000 / 30);

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
      const otpVal =
        ((sigBytes[offset] & 127) << 24) |
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

/** Send transactional email via Resend, with SendGrid fallback. */
export async function sendTransactionalEmail(
  apiKey: string | undefined,
  opts: { to: string; subject: string; html: string; from?: string; sendgridKey?: string }
): Promise<{ sent: boolean; simulated: boolean; provider?: string }> {
  const from = opts.from || 'Smart FCRA <support@rjbusinesssolutions.org>';

  if (apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    if (res.ok) return { sent: true, simulated: false, provider: 'resend' };
    console.error('[EMAIL] Resend failed:', res.status, await res.text());
  }

  if (opts.sendgridKey) {
    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.sendgridKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: opts.to }] }],
        from: { email: from.includes('<') ? from.replace(/.*</, '').replace('>', '') : from, name: 'Smart FCRA' },
        subject: opts.subject,
        content: [{ type: 'text/html', value: opts.html }],
      }),
    });
    if (res.ok || res.status === 202) return { sent: true, simulated: false, provider: 'sendgrid' };
    console.error('[EMAIL] SendGrid failed:', res.status, await res.text());
  }

  console.log(`[EMAIL:SIMULATED] to=${opts.to} subject=${opts.subject}`);
  return { sent: false, simulated: true };
}
