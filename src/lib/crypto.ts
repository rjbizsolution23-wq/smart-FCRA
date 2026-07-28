// SmartFCRA Supreme — AES-256-GCM PII encryption (Web Crypto).
// Production policy: encryption key REQUIRED for new writes (fail closed).

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(secret));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypts cleartext as `iv_hex:ciphertext_hex`.
 * Throws if secret is missing — never stores PLAIN: in production paths.
 */
export async function encryptText(plainText: string, secret: string | undefined): Promise<string> {
  if (!plainText) return '';
  if (!secret || secret.length < 32) {
    throw new Error('PII_ENCRYPTION_KEY is required (min 32 chars). Refusing to store plaintext.');
  }

  const key = await getCryptoKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(plainText);
  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encodedData);
  return `${toHex(iv)}:${toHex(new Uint8Array(encryptedBuffer))}`;
}

/**
 * Decrypts AES-GCM ciphertext. Legacy PLAIN: blobs still readable for migration.
 */
export async function decryptText(cipherText: string, secret: string | undefined): Promise<string> {
  if (!cipherText) return '';
  if (cipherText.startsWith('PLAIN:')) {
    return cipherText.slice(6);
  }
  if (!secret) {
    throw new Error('PII_ENCRYPTION_KEY is required to decrypt stored report data.');
  }

  const parts = cipherText.split(':');
  if (parts.length !== 2) {
    // Unencrypted legacy row (pre-encryption) — return as-is for migration reads
    return cipherText;
  }

  const [ivHex, cipherHex] = parts;
  const iv = new Uint8Array(ivHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const cipher = new Uint8Array(cipherHex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
  const key = await getCryptoKey(secret);
  const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(decryptedBuffer);
}

export function requireEncryptionKey(secret: string | undefined): string {
  if (!secret || secret.length < 32) {
    throw new Error('PII_ENCRYPTION_KEY must be set (minimum 32 characters) before processing reports.');
  }
  return secret;
}
