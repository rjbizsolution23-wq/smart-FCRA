/**
 * Upload hygiene for untrusted consumer/staff files.
 * Magic-byte allowlist + heuristic malware gates. Not a substitute for ClamAV
 * at the edge, but blocks the classes of payload that must never enter R2.
 */

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export type ScanStatus = 'clean' | 'blocked' | 'review';

export type HygieneResult = {
  ok: boolean;
  scanStatus: ScanStatus;
  scanDetail: string;
  detectedMime: string;
  declaredMime: string;
  byteSize: number;
  sha256: string;
  ocrStatus: 'not_needed' | 'client_tesseract' | 'insufficient' | 'text_ok';
  ocrChars: number;
};

const ALLOWED_EXT = /\.(pdf|txt|html?|json|xml|jpe?g|png|webp|gif|docx?|csv)$/i;

function startsWith(bytes: Uint8Array, sig: number[]): boolean {
  if (bytes.length < sig.length) return false;
  return sig.every((b, i) => bytes[i] === b);
}

function asciiHead(bytes: Uint8Array, n = 16): string {
  return Array.from(bytes.slice(0, n)).map((b) => (b >= 32 && b < 127 ? String.fromCharCode(b) : '.')).join('');
}

export function sniffMime(bytes: Uint8Array): string {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return 'application/pdf'; // %PDF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'image/png';
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) return 'image/gif';
  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && bytes.length > 11 && bytes[8] === 0x57) return 'image/webp';
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'application/zip';
  if (startsWith(bytes, [0x7b]) || startsWith(bytes, [0x5b])) return 'application/json'; // { or [
  const head = asciiHead(bytes, 64).trim().toLowerCase();
  if (head.startsWith('<!doctype html') || head.startsWith('<html')) return 'text/html';
  if (head.startsWith('<?xml')) return 'application/xml';
  // printable text
  let printable = 0;
  const sample = bytes.subarray(0, Math.min(bytes.length, 2048));
  for (const b of sample) {
    if (b === 9 || b === 10 || b === 13 || (b >= 32 && b < 127)) printable++;
  }
  if (sample.length && printable / sample.length > 0.92) return 'text/plain';
  return 'application/octet-stream';
}

function looksLikeExecutable(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0x4d, 0x5a])) return 'PE/DOS executable (MZ)';
  if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) return 'ELF executable';
  if (startsWith(bytes, [0xca, 0xfe, 0xba, 0xbe]) || startsWith(bytes, [0xcf, 0xfa, 0xed, 0xfe])) return 'Mach-O executable';
  return null;
}

function pdfHasActiveContent(bytes: Uint8Array): boolean {
  const sample = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 512 * 1024)));
  return /\/JavaScript\b|\/JS\b|\/Launch\b|\/EmbeddedFile\b|\/RichMedia\b/i.test(sample);
}

function zipContainsExecutables(bytes: Uint8Array): boolean {
  // Local file headers in ZIP: PK\x03\x04 then filename after 30-byte header + extra
  const names: string[] = [];
  for (let i = 0; i < bytes.length - 30 && names.length < 80; i++) {
    if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
      const nameLen = bytes[i + 26] | (bytes[i + 27] << 8);
      const extraLen = bytes[i + 28] | (bytes[i + 29] << 8);
      const start = i + 30;
      if (start + nameLen > bytes.length) break;
      const name = new TextDecoder('latin1').decode(bytes.subarray(start, start + nameLen)).toLowerCase();
      names.push(name);
      i = start + nameLen + extraLen - 1;
    }
  }
  return names.some((n) => /\.(exe|dll|js|vbs|ps1|bat|cmd|scr|msi|com|hta)$/i.test(n));
}

export function decodeBase64Bytes(fileBase64: string): Uint8Array {
  const raw = fileBase64.includes(',') ? fileBase64.split(',').pop()! : fileBase64;
  const bin = atob(raw);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function sha256HexBytes(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function inspectUpload(opts: {
  bytes: Uint8Array;
  fileName?: string;
  declaredMime?: string;
  extractedText?: string;
  ocrUsed?: boolean;
  category?: string;
}): Promise<HygieneResult> {
  const byteSize = opts.bytes.byteLength;
  const sha256 = await sha256HexBytes(opts.bytes);
  const fileName = String(opts.fileName || 'upload.bin');
  const declaredMime = String(opts.declaredMime || '').toLowerCase();
  const detectedMime = sniffMime(opts.bytes);
  const ocrChars = String(opts.extractedText || '').trim().length;
  const isReport = /report|credit/i.test(String(opts.category || '')) || /\.pdf$/i.test(fileName);

  if (byteSize <= 0) {
    return { ok: false, scanStatus: 'blocked', scanDetail: 'Empty file', detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars };
  }
  if (byteSize > MAX_UPLOAD_BYTES) {
    return { ok: false, scanStatus: 'blocked', scanDetail: 'File too large (15MB max)', detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars };
  }
  if (/\.(pdf|txt|html?|json|xml|jpe?g|png)\.(exe|dll|js|scr|bat|cmd)$/i.test(fileName)) {
    return { ok: false, scanStatus: 'blocked', scanDetail: 'Double extension executable blocked', detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars };
  }
  if (fileName.includes('.') && !ALLOWED_EXT.test(fileName) && detectedMime === 'application/octet-stream') {
    return { ok: false, scanStatus: 'blocked', scanDetail: `File type not allowed: ${fileName}`, detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars };
  }

  const exe = looksLikeExecutable(opts.bytes);
  if (exe) {
    return { ok: false, scanStatus: 'blocked', scanDetail: exe, detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars };
  }

  if (detectedMime === 'application/zip') {
    if (zipContainsExecutables(opts.bytes)) {
      return { ok: false, scanStatus: 'blocked', scanDetail: 'Archive contains an executable', detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars };
    }
    if (!/\.docx?$/i.test(fileName)) {
      return { ok: false, scanStatus: 'blocked', scanDetail: 'Generic ZIP archives are not accepted', detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars };
    }
  }

  if (declaredMime.includes('pdf') && detectedMime !== 'application/pdf') {
    return { ok: false, scanStatus: 'blocked', scanDetail: `Declared PDF but file is ${detectedMime}`, detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars };
  }

  let ocrStatus: HygieneResult['ocrStatus'] = 'not_needed';
  if (opts.ocrUsed) ocrStatus = ocrChars >= 80 ? 'client_tesseract' : 'insufficient';
  else if (detectedMime === 'application/pdf' || detectedMime.startsWith('image/')) {
    ocrStatus = ocrChars >= 80 ? 'text_ok' : (isReport ? 'insufficient' : 'not_needed');
  } else if (ocrChars >= 80) ocrStatus = 'text_ok';

  if (isReport && detectedMime.startsWith('image/') && ocrChars < 80) {
    return {
      ok: false, scanStatus: 'blocked', scanDetail: 'Image credit reports require OCR text (run Tesseract in the portal, then retry).',
      detectedMime, declaredMime, byteSize, sha256, ocrStatus: 'insufficient', ocrChars,
    };
  }

  if (detectedMime === 'application/pdf' && pdfHasActiveContent(opts.bytes)) {
    return {
      ok: true, scanStatus: 'review', scanDetail: 'PDF contains JavaScript or launch actions — stored for staff review, not auto-executed.',
      detectedMime, declaredMime, byteSize, sha256, ocrStatus, ocrChars,
    };
  }

  return {
    ok: true,
    scanStatus: 'clean',
    scanDetail: `Allowed ${detectedMime}`,
    detectedMime,
    declaredMime,
    byteSize,
    sha256,
    ocrStatus,
    ocrChars,
  };
}

export function sanitizeFileName(name: string): string {
  const base = String(name || 'upload.bin').split(/[/\\]/).pop() || 'upload.bin';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'upload.bin';
}
