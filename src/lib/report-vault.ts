/**
 * Store original credit-report bytes in R2 (DOCS) and pair them with credit_reports.
 * Parsed text stays in D1 (encrypted). Originals never go in a D1 BLOB.
 */
import { inspectUpload, decodeBase64Bytes, sanitizeFileName, type HygieneResult } from './upload-hygiene';

export type VaultPutResult = HygieneResult & {
  r2Key: string | null;
  stored: boolean;
};

export async function putOriginalReport(opts: {
  env: { DOCS?: R2Bucket };
  orgId: string;
  clientId: string;
  reportId: string;
  uploadedBy: string;
  fileName: string;
  fileBase64?: string;
  bytes?: Uint8Array;
  declaredMime?: string;
  extractedText?: string;
  ocrUsed?: boolean;
}): Promise<VaultPutResult> {
  const bytes = opts.bytes || (opts.fileBase64 ? decodeBase64Bytes(opts.fileBase64) : null);
  if (!bytes || !bytes.byteLength) {
    return {
      ok: true, stored: false, r2Key: null, scanStatus: 'clean', scanDetail: 'No original file attached',
      detectedMime: '', declaredMime: opts.declaredMime || '', byteSize: 0, sha256: '', ocrStatus: 'not_needed', ocrChars: 0,
    };
  }
  const hygiene = await inspectUpload({
    bytes,
    fileName: opts.fileName,
    declaredMime: opts.declaredMime,
    extractedText: opts.extractedText,
    ocrUsed: opts.ocrUsed,
    category: 'credit_report',
  });
  if (!hygiene.ok) return { ...hygiene, r2Key: null, stored: false };
  if (!opts.env.DOCS) {
    return { ...hygiene, ok: false, scanStatus: 'blocked', scanDetail: 'Document vault (R2) is not bound on this deployment', r2Key: null, stored: false };
  }
  const safe = sanitizeFileName(opts.fileName);
  const r2Key = `org/${opts.orgId}/client/${opts.clientId}/reports/${opts.reportId}/${safe}`;
  await opts.env.DOCS.put(r2Key, bytes, {
    httpMetadata: { contentType: hygiene.detectedMime || opts.declaredMime || 'application/octet-stream' },
    customMetadata: {
      orgId: opts.orgId,
      clientId: opts.clientId,
      reportId: opts.reportId,
      sha256: hygiene.sha256,
      uploadedBy: opts.uploadedBy,
      scanStatus: hygiene.scanStatus,
    },
  });
  return { ...hygiene, r2Key, stored: true };
}

export async function persistReportVaultMeta(db: D1Database, reportId: string, orgId: string, vault: VaultPutResult): Promise<void> {
  if (!vault.r2Key && !vault.scanStatus) return;
  try {
    await db.prepare(
      `UPDATE credit_reports SET r2_key = COALESCE(?, r2_key), original_sha256 = ?, original_mime = ?, original_byte_size = ?,
       scan_status = ?, scan_detail = ?, ocr_status = ?, ocr_text_chars = ?, file_size = COALESCE(?, file_size)
       WHERE id = ? AND org_id = ?`
    ).bind(
      vault.r2Key, vault.sha256 || null, vault.detectedMime || null, vault.byteSize || null,
      vault.scanStatus, vault.scanDetail || null, vault.ocrStatus, vault.ocrChars,
      vault.byteSize || null, reportId, orgId,
    ).run();
  } catch (e) {
    console.warn('[report-vault] column update skipped (apply migration 0022)', e);
  }
}

export async function vaultOriginalFromBody(opts: {
  env: { DOCS?: R2Bucket };
  db: D1Database;
  orgId: string;
  clientId: string;
  reportId: string;
  uploadedBy: string;
  fileName: string;
  fileBase64?: string;
  jsonPayload?: unknown;
  declaredMime?: string;
  extractedText?: string;
  ocrUsed?: boolean;
}): Promise<VaultPutResult> {
  let bytes: Uint8Array | undefined;
  let mime = opts.declaredMime;
  if (opts.fileBase64) {
    bytes = decodeBase64Bytes(opts.fileBase64);
  } else if (opts.jsonPayload != null) {
    bytes = new TextEncoder().encode(typeof opts.jsonPayload === 'string' ? opts.jsonPayload : JSON.stringify(opts.jsonPayload));
    mime = mime || 'application/json';
  }
  const vault = await putOriginalReport({
    env: opts.env,
    orgId: opts.orgId,
    clientId: opts.clientId,
    reportId: opts.reportId,
    uploadedBy: opts.uploadedBy,
    fileName: opts.fileName,
    bytes,
    declaredMime: mime,
    extractedText: opts.extractedText,
    ocrUsed: opts.ocrUsed,
  });
  if (vault.stored || vault.scanStatus === 'blocked') {
    await persistReportVaultMeta(opts.db, opts.reportId, opts.orgId, vault);
  }
  return vault;
}
