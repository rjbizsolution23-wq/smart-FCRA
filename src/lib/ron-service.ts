/**
 * Remote Online Notarization orchestration — vendor-agnostic.
 * Production: set RON_VENDOR=proof|bluenotary|custom + API credentials.
 * Sandbox: completes a labeled non-legal certificate for UX/testing only.
 */
import { sha256Hex } from '../data/legal-contracts';
import { writeSecurityAudit } from './security-compliance';
import { storeContractInVault } from './legal-contracts';
import {
  createRonVendorSession,
  ceremonyUrlFromMeta,
  extractRonWebhookIds,
  fetchRonVendorStatus,
  verifyRonWebhookSignature,
  webhookMarksComplete,
} from './ron-vendors';

export type RonEnv = {
  DB: any;
  DOCS?: R2Bucket;
  RON_VENDOR?: string;
  RON_VENDOR_API_KEY?: string;
  RON_VENDOR_API_URL?: string;
  RON_WEBHOOK_SECRET?: string;
  RON_DOCUMENT_URL?: string;
  COMPANY_NAME?: string;
  APP_BASE_URL?: string;
  FRONTEND_URL?: string;
};

export type RonStateRule = {
  state_code: string;
  state_name: string;
  ron_allowed: number;
  requires_kba: number;
  requires_credential_analysis: number;
  recording_retention_years: number;
  platform_approval_required: number;
  notes?: string;
};

/** Baseline multi-state matrix — verify with counsel before production launch per state. */
export const DEFAULT_RON_STATE_RULES: RonStateRule[] = [
  { state_code: 'AL', state_name: 'Alabama', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'AK', state_name: 'Alaska', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'AZ', state_name: 'Arizona', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'AR', state_name: 'Arkansas', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'CA', state_name: 'California', ron_allowed: 0, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 10, platform_approval_required: 1, notes: 'Confirm current remote notary authorization with counsel before enabling.' },
  { state_code: 'CO', state_name: 'Colorado', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 10, platform_approval_required: 1 },
  { state_code: 'CT', state_name: 'Connecticut', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'DE', state_name: 'Delaware', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'FL', state_name: 'Florida', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 10, platform_approval_required: 1, notes: 'Online notary + RON service provider recording duties apply.' },
  { state_code: 'GA', state_name: 'Georgia', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'HI', state_name: 'Hawaii', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'ID', state_name: 'Idaho', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'IL', state_name: 'Illinois', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'IN', state_name: 'Indiana', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'IA', state_name: 'Iowa', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'KS', state_name: 'Kansas', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'KY', state_name: 'Kentucky', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'LA', state_name: 'Louisiana', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'ME', state_name: 'Maine', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'MD', state_name: 'Maryland', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'MA', state_name: 'Massachusetts', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'MI', state_name: 'Michigan', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 10, platform_approval_required: 1, notes: 'Platform approval by Secretary of State required.' },
  { state_code: 'MN', state_name: 'Minnesota', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 10, platform_approval_required: 1 },
  { state_code: 'MS', state_name: 'Mississippi', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'MO', state_name: 'Missouri', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'MT', state_name: 'Montana', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'NE', state_name: 'Nebraska', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'NV', state_name: 'Nevada', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'NH', state_name: 'New Hampshire', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'NJ', state_name: 'New Jersey', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'NM', state_name: 'New Mexico', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'NY', state_name: 'New York', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 10, platform_approval_required: 1 },
  { state_code: 'NC', state_name: 'North Carolina', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'ND', state_name: 'North Dakota', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'OH', state_name: 'Ohio', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'OK', state_name: 'Oklahoma', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'OR', state_name: 'Oregon', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'PA', state_name: 'Pennsylvania', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'RI', state_name: 'Rhode Island', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'SC', state_name: 'South Carolina', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'SD', state_name: 'South Dakota', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'TN', state_name: 'Tennessee', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'TX', state_name: 'Texas', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 5, platform_approval_required: 1, notes: 'Online notary electronic record retention ≥ 5 years.' },
  { state_code: 'UT', state_name: 'Utah', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'VT', state_name: 'Vermont', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'VA', state_name: 'Virginia', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 5, platform_approval_required: 1 },
  { state_code: 'WA', state_name: 'Washington', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'WV', state_name: 'West Virginia', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'WI', state_name: 'Wisconsin', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'WY', state_name: 'Wyoming', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
  { state_code: 'DC', state_name: 'District of Columbia', ron_allowed: 1, requires_kba: 1, requires_credential_analysis: 1, recording_retention_years: 7, platform_approval_required: 1 },
];

function rid(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

export function resolveVendor(env: RonEnv): string {
  const v = String(env.RON_VENDOR || 'sandbox').toLowerCase();
  if (env.RON_VENDOR_API_KEY && v !== 'sandbox') return v;
  return 'sandbox';
}

export async function seedRonStateRules(env: RonEnv): Promise<number> {
  let n = 0;
  for (const r of DEFAULT_RON_STATE_RULES) {
    try {
      await env.DB.prepare(
        `INSERT INTO ron_state_rules (state_code, state_name, ron_allowed, requires_kba, requires_credential_analysis, recording_retention_years, platform_approval_required, notes, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
         ON CONFLICT(state_code) DO UPDATE SET
           ron_allowed = excluded.ron_allowed,
           requires_kba = excluded.requires_kba,
           requires_credential_analysis = excluded.requires_credential_analysis,
           recording_retention_years = excluded.recording_retention_years,
           platform_approval_required = excluded.platform_approval_required,
           notes = excluded.notes,
           updated_at = datetime('now')`
      ).bind(
        r.state_code, r.state_name, r.ron_allowed, r.requires_kba, r.requires_credential_analysis,
        r.recording_retention_years, r.platform_approval_required, r.notes || null,
      ).run();
      n++;
    } catch (e) {
      console.warn('[ron] seed state rule', r.state_code, e);
    }
  }
  return n;
}

export async function getRonStateRule(env: RonEnv, stateCode: string): Promise<RonStateRule | null> {
  const code = String(stateCode || '').toUpperCase();
  if (!code) return null;
  try {
    const row = await env.DB.prepare(`SELECT * FROM ron_state_rules WHERE state_code = ?`).bind(code).first();
    if (row) return row as RonStateRule;
  } catch { /* empty table */ }
  return DEFAULT_RON_STATE_RULES.find((r) => r.state_code === code) || null;
}

export async function createRonSession(
  env: RonEnv,
  opts: {
    orgId: string;
    clientId: string;
    contractId?: string;
    documentId?: string;
    videoSessionId?: string;
    principalState: string;
    userId?: string;
  },
) {
  const state = String(opts.principalState || '').toUpperCase();
  const rule = await getRonStateRule(env, state);
  if (!rule) throw new Error(`Unsupported or unknown principal state: ${state}`);
  if (!rule.ron_allowed) {
    throw new Error(`Remote online notarization is not enabled for ${rule.state_name} (${state}). Use in-person notary or update policy with counsel.`);
  }

  const vendor = resolveVendor(env);
  const sessionId = rid();
  const retentionYears = rule.recording_retention_years || 7;
  const retentionUntil = new Date();
  retentionUntil.setFullYear(retentionUntil.getFullYear() + retentionYears);

  let vendorSessionId: string | null = null;
  let ceremonyUrl: string | null = null;
  let status = 'identity_pending';
  const meta: any = {
    requiresKba: !!rule.requires_kba,
    requiresCredentialAnalysis: !!rule.requires_credential_analysis,
    platformApprovalRequired: !!rule.platform_approval_required,
  };

  if (vendor !== 'sandbox' && env.RON_VENDOR_API_KEY) {
    const client = await env.DB.prepare(`SELECT first_name, last_name, email FROM clients WHERE id = ? AND org_id = ?`)
      .bind(opts.clientId, opts.orgId).first() as any;
    const base = env.APP_BASE_URL || env.FRONTEND_URL || 'https://smart-fcra-v2.pages.dev';
    try {
      const created = await createRonVendorSession({
        vendor,
        apiKey: env.RON_VENDOR_API_KEY,
        apiUrl: env.RON_VENDOR_API_URL,
        sessionId,
        principalState: state,
        contractId: opts.contractId,
        documentUrl: env.RON_DOCUMENT_URL,
        callbackUrl: `${String(base).replace(/\/$/, '')}/api/webhooks/ron`,
        signer: {
          email: client?.email || `ron-${sessionId}@smartfcra.local`,
          firstName: client?.first_name || 'Client',
          lastName: client?.last_name || 'Signer',
        },
        transactionName: `Smart FCRA RON · ${client?.first_name || ''} ${client?.last_name || ''}`.trim(),
      });
      vendorSessionId = created.vendorSessionId;
      ceremonyUrl = created.ceremonyUrl;
      meta.vendorCreate = created.raw;
      meta.ceremonyUrl = ceremonyUrl;
      if (created.error) meta.vendorError = created.error;
      if (ceremonyUrl) status = 'in_session';
    } catch (e: any) {
      meta.vendorError = e.message;
    }
  } else {
    meta.sandbox = true;
    meta.legalDisclaimer = 'SANDBOX RON is for platform testing only and is NOT a lawful notarial act.';
  }

  await env.DB.prepare(
    `INSERT INTO ron_sessions
      (id, org_id, client_id, contract_id, document_id, video_session_id, vendor, vendor_session_id, status, principal_state, identity_method, retention_years, retention_until, metadata_json, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    sessionId,
    opts.orgId,
    opts.clientId,
    opts.contractId || null,
    opts.documentId || null,
    opts.videoSessionId || null,
    vendor,
    vendorSessionId,
    status,
    state,
    rule.requires_kba ? 'kba_plus_credential' : 'credential',
    retentionYears,
    retentionUntil.toISOString().slice(0, 10),
    JSON.stringify(meta),
    opts.userId || null,
  ).run();

  if (opts.contractId) {
    await env.DB.prepare(
      `UPDATE legal_contracts SET ron_session_id = ?, status = CASE WHEN status = 'signed' OR status = 'awaiting_ron' THEN 'awaiting_ron' ELSE status END, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
    ).bind(sessionId, opts.contractId, opts.orgId).run();
  }

  await writeSecurityAudit(env, {
    orgId: opts.orgId,
    actorUserId: opts.userId,
    action: 'ron_session_created',
    resourceType: 'ron_session',
    resourceId: sessionId,
    detail: { vendor, state, contractId: opts.contractId },
  });

  return {
    sessionId,
    vendor,
    status,
    principalState: state,
    retentionYears,
    retentionUntil: retentionUntil.toISOString().slice(0, 10),
    requiresKba: !!rule.requires_kba,
    requiresCredentialAnalysis: !!rule.requires_credential_analysis,
    sandbox: vendor === 'sandbox',
    ceremonyUrl,
    legalNotice: vendor === 'sandbox'
      ? 'Sandbox mode: complete identity checklist for UX testing. Connect a certified RON vendor for legally effective notarization.'
      : ceremonyUrl
        ? 'Live vendor ceremony created. Open the vendor room to complete identity proofing and notarization.'
        : 'Session created with configured RON vendor. Complete identity proofing in the vendor flow.',
  };
}

export async function submitRonIdentityChecklist(
  env: RonEnv,
  opts: {
    orgId: string;
    sessionId: string;
    userId?: string;
    fullNameMatchesId: boolean;
    governmentIdPresented: boolean;
    selfieMatchesId: boolean;
    kbaPassed?: boolean;
    credentialAnalysisPassed?: boolean;
    attestation: boolean;
  },
) {
  const row = await env.DB.prepare(
    `SELECT * FROM ron_sessions WHERE id = ? AND org_id = ?`
  ).bind(opts.sessionId, opts.orgId).first() as any;
  if (!row) throw new Error('RON session not found');

  const rule = await getRonStateRule(env, row.principal_state);
  if (!opts.attestation) throw new Error('Identity attestation required');
  if (!opts.fullNameMatchesId || !opts.governmentIdPresented || !opts.selfieMatchesId) {
    throw new Error('Identity checklist incomplete');
  }
  if (rule?.requires_kba && opts.kbaPassed === false) {
    throw new Error('KBA required for this state');
  }
  if (rule?.requires_credential_analysis && opts.credentialAnalysisPassed === false) {
    throw new Error('Credential analysis required for this state');
  }

  const identity = {
    fullNameMatchesId: opts.fullNameMatchesId,
    governmentIdPresented: opts.governmentIdPresented,
    selfieMatchesId: opts.selfieMatchesId,
    kbaPassed: opts.kbaPassed !== false,
    credentialAnalysisPassed: opts.credentialAnalysisPassed !== false,
    attestedAt: new Date().toISOString(),
    method: row.identity_method,
    sandbox: row.vendor === 'sandbox',
  };

  await env.DB.prepare(
    `UPDATE ron_sessions SET status = 'identity_verified', identity_result_json = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
  ).bind(JSON.stringify(identity), row.id, opts.orgId).run();

  return { sessionId: row.id, status: 'identity_verified', identity };
}

export async function completeRonSession(
  env: RonEnv,
  opts: {
    orgId: string;
    sessionId: string;
    userId?: string;
    notaryName?: string;
    notaryCommission?: string;
    notaryState?: string;
    aVRecordingRef?: string;
    forceSandbox?: boolean;
    fromWebhook?: boolean;
  },
) {
  const row = await env.DB.prepare(
    `SELECT * FROM ron_sessions WHERE id = ? AND org_id = ?`
  ).bind(opts.sessionId, opts.orgId).first() as any;
  if (!row) throw new Error('RON session not found');
  if (row.status === 'completed') {
    return {
      sessionId: row.id,
      status: 'completed',
      sealedHash: row.sealed_document_hash,
      vaultUploadId: row.sealed_vault_upload_id,
      certificate: row.journal_entry_json ? JSON.parse(row.journal_entry_json) : null,
      sandbox: row.vendor === 'sandbox',
      alreadyComplete: true,
    };
  }
  if (row.vendor === 'sandbox') {
    if (row.status !== 'identity_verified' && row.status !== 'in_session') {
      throw new Error(`Cannot complete from status ${row.status}`);
    }
  } else if (!opts.fromWebhook && !opts.forceSandbox) {
    const vendorStatus = await fetchRonVendorStatus({
      vendor: row.vendor,
      apiKey: env.RON_VENDOR_API_KEY || '',
      apiUrl: env.RON_VENDOR_API_URL,
      vendorSessionId: row.vendor_session_id,
    });
    if (!vendorStatus.completed) {
      const join = vendorStatus.ceremonyUrl || ceremonyUrlFromMeta(row.metadata_json);
      throw new Error(
        `Live ${row.vendor} ceremony is not complete.${join ? ` Open the vendor room: ${join}` : ' Finish identity + notarization in the vendor app, then retry or wait for the webhook.'}`,
      );
    }
    opts.notaryName = opts.notaryName || vendorStatus.notaryName;
    opts.notaryCommission = opts.notaryCommission || vendorStatus.notaryCommission;
    opts.notaryState = opts.notaryState || vendorStatus.notaryState;
    opts.aVRecordingRef = opts.aVRecordingRef || vendorStatus.recordingRef;
  }

  let contract: any = null;
  if (row.contract_id) {
    contract = await env.DB.prepare(`SELECT * FROM legal_contracts WHERE id = ? AND org_id = ?`)
      .bind(row.contract_id, opts.orgId).first();
  }

  const notaryName = opts.notaryName || (row.vendor === 'sandbox' ? 'SANDBOX NOTARY (NOT A LEGAL ACT)' : 'Vendor Notary');
  const notaryCommission = opts.notaryCommission || (row.vendor === 'sandbox' ? 'SANDBOX-0000' : 'pending-vendor');
  const notaryState = (opts.notaryState || row.principal_state || '').toUpperCase();
  const completedAt = new Date().toISOString();

  const certificate = {
    type: row.vendor === 'sandbox' ? 'sandbox_certificate' : 'ron_certificate',
    legalEffect: row.vendor === 'sandbox' ? 'NONE — sandbox only' : 'effective_under_vendor_and_state_law',
    sessionId: row.id,
    vendor: row.vendor,
    principalState: row.principal_state,
    notaryName,
    notaryCommission,
    notaryState,
    completedAt,
    identity: row.identity_result_json ? JSON.parse(row.identity_result_json) : null,
    documentContentHash: contract?.content_hash || null,
    aVRecordingRef: opts.aVRecordingRef || row.a_v_recording_ref || null,
    retentionUntil: row.retention_until,
    disclaimer: row.vendor === 'sandbox'
      ? 'This certificate is generated for software QA only and does not constitute a notarial act under any state law.'
      : 'Notarial act performed via configured RON vendor; retain A/V recording per state retention rules.',
  };

  const certJson = JSON.stringify(certificate, null, 2);
  const sealedHash = await sha256Hex(`${contract?.content_hash || ''}:${certJson}`);

  const sealedBody = `${contract?.content_text || '[document]'}\n\n===== NOTARIAL / RON CERTIFICATE =====\n${certJson}\n===== END CERTIFICATE =====\nSealed hash: ${sealedHash}\n`;

  const vault = await storeContractInVault(env, {
    orgId: opts.orgId,
    clientId: row.client_id,
    userId: opts.userId,
    contractId: row.contract_id || row.id,
    fileName: `ron-sealed-${row.id}.txt`,
    content: sealedBody,
    category: 'notarized_document',
  });

  const journal = {
    sessionId: row.id,
    act: 'remote_online_notarization',
    principal: row.client_id,
    documentHash: contract?.content_hash,
    sealedHash,
    notaryName,
    notaryCommission,
    notaryState,
    completedAt,
    recordingRef: certificate.aVRecordingRef,
    vaultUploadId: vault.uploadId,
  };

  await env.DB.prepare(
    `UPDATE ron_sessions SET
       status = 'completed',
       notary_state = ?,
       journal_entry_json = ?,
       a_v_recording_ref = COALESCE(?, a_v_recording_ref),
       sealed_document_hash = ?,
       sealed_vault_upload_id = ?,
       completed_at = ?,
       updated_at = datetime('now')
     WHERE id = ? AND org_id = ?`
  ).bind(
    notaryState,
    JSON.stringify(journal),
    opts.aVRecordingRef || null,
    sealedHash,
    vault.uploadId,
    completedAt,
    row.id,
    opts.orgId,
  ).run();

  // Fix: notary fields are on legal_contracts, not ron_sessions for name/commission
  if (row.contract_id) {
    await env.DB.prepare(
      `UPDATE legal_contracts SET
         status = 'notarized',
         ron_session_id = ?,
         notarized_at = ?,
         notary_name = ?,
         notary_commission = ?,
         notary_state = ?,
         notary_certificate_json = ?,
         vault_upload_id = COALESCE(?, vault_upload_id),
         updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`
    ).bind(
      row.id, completedAt, notaryName, notaryCommission, notaryState, certJson, vault.uploadId,
      row.contract_id, opts.orgId,
    ).run();
  }

  if (row.document_id) {
    await env.DB.prepare(
      `UPDATE documents SET ron_session_id = ?, notarized_at = ?, status = 'signed', updated_at = datetime('now') WHERE id = ? AND org_id = ?`
    ).bind(row.id, completedAt, row.document_id, opts.orgId).run().catch(() => {});
  }

  await writeSecurityAudit(env, {
    orgId: opts.orgId,
    actorUserId: opts.userId,
    action: 'ron_session_completed',
    resourceType: 'ron_session',
    resourceId: row.id,
    detail: { sealedHash, vendor: row.vendor, vaultUploadId: vault.uploadId, sandbox: row.vendor === 'sandbox' },
  });

  return {
    sessionId: row.id,
    status: 'completed',
    sealedHash,
    vaultUploadId: vault.uploadId,
    certificate,
    sandbox: row.vendor === 'sandbox',
  };
}

export async function handleRonWebhook(
  env: RonEnv,
  opts: { signature?: string | null; payload: any; rawBody?: string },
) {
  const ok = await verifyRonWebhookSignature({
    secret: env.RON_WEBHOOK_SECRET,
    signature: opts.signature,
    rawBody: opts.rawBody || JSON.stringify(opts.payload || {}),
  });
  if (!ok) throw new Error('Invalid RON webhook signature');

  const { sessionHint, event } = extractRonWebhookIds(opts.payload);
  if (!sessionHint) throw new Error('Missing session id in webhook');

  const row = await env.DB.prepare(
    `SELECT * FROM ron_sessions WHERE id = ? OR vendor_session_id = ?`
  ).bind(sessionHint, sessionHint).first() as any;
  if (!row) throw new Error('RON session not found for webhook');

  if (webhookMarksComplete(event, opts.payload)) {
    return completeRonSession(env, {
      orgId: row.org_id,
      sessionId: row.id,
      notaryName: opts.payload?.notary?.name || opts.payload?.data?.notary?.name,
      notaryCommission: opts.payload?.notary?.commission || opts.payload?.data?.notary?.commission,
      notaryState: opts.payload?.notary?.state || opts.payload?.data?.notary?.state,
      aVRecordingRef: opts.payload?.recordingUrl || opts.payload?.recordingRef || opts.payload?.data?.recording_url,
      fromWebhook: true,
    });
  }
  if (event.includes('identity')) {
    await env.DB.prepare(
      `UPDATE ron_sessions SET status = 'identity_verified', identity_result_json = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify(opts.payload?.identity || opts.payload), row.id).run();
    return { sessionId: row.id, status: 'identity_verified' };
  }
  await env.DB.prepare(
    `UPDATE ron_sessions SET metadata_json = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(JSON.stringify({ ...(JSON.parse(row.metadata_json || '{}')), lastWebhook: opts.payload }), row.id).run();
  return { sessionId: row.id, status: row.status, accepted: true };
}
