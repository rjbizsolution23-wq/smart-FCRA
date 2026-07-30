/**
 * Legal contract lifecycle — generate, ESIGN audit, sign, vault custody.
 */
import {
  type ContractType,
  type ContractParty,
  renderContract,
  sha256Hex,
  ESIGN_DISCLOSURE_TEXT,
  ESIGN_DISCLOSURE_VERSION,
  documentRequiresNotarization,
} from '../data/legal-contracts';
import { writeSecurityAudit } from './security-compliance';

export type ContractEnv = {
  DB: any;
  DOCS?: R2Bucket;
  PII_ENCRYPTION_KEY?: string;
  COMPANY_NAME?: string;
  COMPANY_ADDRESS?: string;
  COMPANY_EMAIL?: string;
};

function id(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 24);
}

export async function partyFromClient(env: ContractEnv, orgId: string, client: any): Promise<ContractParty> {
  const org = await env.DB.prepare('SELECT name, settings FROM organizations WHERE id = ?').bind(orgId).first() as any;
  let settings: any = {};
  try { settings = JSON.parse(org?.settings || '{}'); } catch { /* */ }
  return {
    clientName: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
    clientAddress: client.address_line1 || '',
    clientCity: client.city || '',
    clientState: client.governing_state || client.state || '',
    clientZip: client.zip || '',
    clientEmail: client.email || '',
    clientPhone: client.phone || '',
    orgName: org?.name || env.COMPANY_NAME || 'Smart FCRA / RJ Business Solutions',
    orgAddress: settings.business_address || env.COMPANY_ADDRESS || '',
    orgEmail: settings.business_email || env.COMPANY_EMAIL || '',
    planName: client.subscription_plan || 'Professional',
    monthlyFee: settings.disclosed_monthly_fee || 'Per selected plan',
    effectiveDate: new Date().toISOString().slice(0, 10),
  };
}

export async function recordEsignConsent(
  env: ContractEnv,
  opts: {
    orgId: string;
    clientId: string;
    userId?: string;
    contentHash?: string;
    documentId?: string;
    contractId?: string;
    ip?: string;
    ua?: string;
  },
): Promise<{ consentId: string; disclosureVersion: string; disclosureHash: string }> {
  const consentId = id();
  const disclosureHash = await sha256Hex(ESIGN_DISCLOSURE_TEXT);
  await env.DB.prepare(
    `INSERT INTO esign_consent_events
      (id, org_id, client_id, user_id, disclosure_version, disclosure_hash, disclosure_text, consent_granted, intent_to_sign, content_hash, document_id, contract_id, ip_address, user_agent, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    consentId,
    opts.orgId,
    opts.clientId,
    opts.userId || null,
    ESIGN_DISCLOSURE_VERSION,
    disclosureHash,
    ESIGN_DISCLOSURE_TEXT,
    opts.contentHash || null,
    opts.documentId || null,
    opts.contractId || null,
    opts.ip || null,
    (opts.ua || '').slice(0, 240) || null,
  ).run();

  try {
    await env.DB.prepare(
      `UPDATE clients SET esign_consent_at = datetime('now') WHERE id = ? AND org_id = ?`
    ).bind(opts.clientId, opts.orgId).run();
  } catch { /* soft */ }

  return { consentId, disclosureVersion: ESIGN_DISCLOSURE_VERSION, disclosureHash };
}

export async function storeContractInVault(
  env: ContractEnv,
  opts: {
    orgId: string;
    clientId: string;
    userId?: string;
    contractId: string;
    fileName: string;
    content: string;
    category?: string;
  },
): Promise<{ uploadId: string; r2Key: string | null; sha256: string }> {
  const uploadId = id();
  const sha = await sha256Hex(opts.content);
  const r2Key = `org/${opts.orgId}/client/${opts.clientId}/contracts/${opts.contractId}/${opts.fileName}`;
  let storedKey: string | null = null;
  if (env.DOCS) {
    await env.DOCS.put(r2Key, opts.content, {
      httpMetadata: { contentType: 'text/plain; charset=utf-8' },
      customMetadata: { sha256: sha, contractId: opts.contractId, category: opts.category || 'legal_contract' },
    });
    storedKey = r2Key;
  }
  try {
    await env.DB.prepare(
      `INSERT INTO portal_uploads (id, org_id, client_id, uploaded_by, category, file_name, mime_type, content_text, notes, r2_key, byte_size, sha256, encrypted, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'text/plain', ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(
      uploadId,
      opts.orgId,
      opts.clientId,
      opts.userId || null,
      opts.category || 'legal_contract',
      opts.fileName,
      storedKey ? null : opts.content,
      `Legal contract ${opts.contractId}`,
      storedKey,
      opts.content.length,
      sha,
      storedKey ? 0 : 1,
    ).run();
  } catch {
    // older schema without r2 columns
    await env.DB.prepare(
      `INSERT INTO portal_uploads (id, org_id, client_id, uploaded_by, category, file_name, mime_type, content_text, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'text/plain', ?, ?, datetime('now'))`
    ).bind(
      uploadId, opts.orgId, opts.clientId, opts.userId || null, opts.category || 'legal_contract',
      opts.fileName, opts.content, `Legal contract ${opts.contractId}`,
    ).run();
  }
  return { uploadId, r2Key: storedKey, sha256: sha };
}

export async function createLegalContract(
  env: ContractEnv,
  opts: {
    orgId: string;
    client: any;
    userId?: string;
    contractType: ContractType;
    governingState?: string;
  },
) {
  const party = await partyFromClient(env, opts.orgId, opts.client);
  if (opts.governingState) party.clientState = opts.governingState;
  const rendered = renderContract(opts.contractType, party);
  const contentHash = await sha256Hex(rendered.content);
  const contractId = id();

  // Also mirror into documents table for e-sign cockpit compatibility
  const docId = id();
  const titleMap: Record<ContractType, string> = {
    croa_service: 'CROA Service Agreement',
    limited_poa: 'Limited Power of Attorney',
    esign_consent: 'E-SIGN / UETA Consent',
    representation_auth: 'Representation Authorization',
  };
  const title = `${titleMap[opts.contractType]} — ${party.clientName}`;

  await env.DB.prepare(
    `INSERT INTO documents (id, org_id, client_id, doc_type, doc_subtype, title, content, status, created_by, content_hash, requires_notarization)
     VALUES (?, ?, ?, ?, 'legal_contract', ?, ?, 'draft', ?, ?, ?)`
  ).bind(
    docId,
    opts.orgId,
    opts.client.id,
    opts.contractType,
    title,
    rendered.content,
    opts.userId || null,
    contentHash,
    rendered.requiresNotarization ? 1 : 0,
  ).run().catch(async () => {
    await env.DB.prepare(
      `INSERT INTO documents (id, org_id, client_id, doc_type, doc_subtype, title, content, status, created_by)
       VALUES (?, ?, ?, ?, 'legal_contract', ?, ?, 'draft', ?)`
    ).bind(docId, opts.orgId, opts.client.id, opts.contractType, title, rendered.content, opts.userId || null).run();
  });

  await env.DB.prepare(
    `INSERT INTO legal_contracts
      (id, org_id, client_id, document_id, contract_type, template_version, content_hash, governing_state, status, content_text, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'awaiting_esign', ?, ?, datetime('now'), datetime('now'))`
  ).bind(
    contractId,
    opts.orgId,
    opts.client.id,
    docId,
    opts.contractType,
    rendered.templateVersion,
    contentHash,
    (party.clientState || opts.governingState || '').toUpperCase() || null,
    rendered.content,
    opts.userId || null,
  ).run();

  if (opts.governingState || party.clientState) {
    try {
      await env.DB.prepare(
        `UPDATE clients SET governing_state = COALESCE(?, governing_state, state) WHERE id = ? AND org_id = ?`
      ).bind((opts.governingState || party.clientState || '').toUpperCase(), opts.client.id, opts.orgId).run();
    } catch { /* soft */ }
  }

  await writeSecurityAudit(env, {
    orgId: opts.orgId,
    actorUserId: opts.userId,
    action: 'legal_contract_created',
    resourceType: 'legal_contract',
    resourceId: contractId,
    detail: { type: opts.contractType, contentHash, templateVersion: rendered.templateVersion },
  });

  return {
    contractId,
    documentId: docId,
    contractType: opts.contractType,
    templateVersion: rendered.templateVersion,
    contentHash,
    requiresNotarization: rendered.requiresNotarization,
    status: 'awaiting_esign',
    title,
    content: rendered.content,
  };
}

export async function signLegalContract(
  env: ContractEnv,
  opts: {
    orgId: string;
    contractId: string;
    userId?: string;
    signatureData: string;
    ip?: string;
    ua?: string;
    esignConsent?: boolean;
  },
) {
  if (!opts.esignConsent) {
    throw new Error('E-SIGN/UETA consent is required before signing');
  }
  const row = await env.DB.prepare(
    `SELECT * FROM legal_contracts WHERE id = ? AND org_id = ?`
  ).bind(opts.contractId, opts.orgId).first() as any;
  if (!row) throw new Error('Contract not found');
  if (row.status === 'void') throw new Error('Contract is void');

  const consent = await recordEsignConsent(env, {
    orgId: opts.orgId,
    clientId: row.client_id,
    userId: opts.userId,
    contentHash: row.content_hash,
    documentId: row.document_id,
    contractId: row.id,
    ip: opts.ip,
    ua: opts.ua,
  });

  const ts = new Date().toISOString();
  const nextStatus = documentRequiresNotarization(row.contract_type) ? 'awaiting_ron' : 'signed';

  await env.DB.prepare(
    `UPDATE legal_contracts SET status = ?, signature_data = ?, signature_ip = ?, signature_ua = ?, signature_timestamp = ?, esign_consent_id = ?, updated_at = datetime('now')
     WHERE id = ? AND org_id = ?`
  ).bind(nextStatus, opts.signatureData, opts.ip || null, (opts.ua || '').slice(0, 240), ts, consent.consentId, row.id, opts.orgId).run();

  if (row.document_id) {
    await env.DB.prepare(
      `UPDATE documents SET status = 'signed', signature_data = ?, signature_ip = ?, signature_timestamp = ?, esign_consent_id = ?, content_hash = COALESCE(content_hash, ?), updated_at = datetime('now')
       WHERE id = ? AND org_id = ?`
    ).bind(opts.signatureData, opts.ip || null, ts, consent.consentId, row.content_hash, row.document_id, opts.orgId).run().catch(async () => {
      await env.DB.prepare(
        `UPDATE documents SET status = 'signed', signature_data = ?, signature_ip = ?, signature_timestamp = ?, updated_at = datetime('now') WHERE id = ? AND org_id = ?`
      ).bind(opts.signatureData, opts.ip || null, ts, row.document_id, opts.orgId).run();
    });
  }

  const signedBody = `${row.content_text}\n\n--- ELECTRONIC SIGNATURE RECORD ---\nSigned at: ${ts}\nIP: ${opts.ip || 'n/a'}\nContent SHA-256: ${row.content_hash}\nE-SIGN consent: ${consent.consentId} (${consent.disclosureVersion})\nStatus: ${nextStatus}\n`;
  const vault = await storeContractInVault(env, {
    orgId: opts.orgId,
    clientId: row.client_id,
    userId: opts.userId,
    contractId: row.id,
    fileName: `${row.contract_type}-${row.id}.txt`,
    content: signedBody,
  });

  await env.DB.prepare(
    `UPDATE legal_contracts SET vault_upload_id = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(vault.uploadId, row.id).run();

  if (row.contract_type === 'croa_service') {
    await env.DB.prepare(
      `UPDATE clients SET croa_contract_agreed = 1, croa_contract_id = ?, consent_timestamp = COALESCE(consent_timestamp, datetime('now')) WHERE id = ? AND org_id = ?`
    ).bind(row.id, row.client_id, opts.orgId).run().catch(async () => {
      await env.DB.prepare(
        `UPDATE clients SET croa_contract_agreed = 1, consent_timestamp = COALESCE(consent_timestamp, datetime('now')) WHERE id = ? AND org_id = ?`
      ).bind(row.client_id, opts.orgId).run();
    });
  }
  if (row.contract_type === 'limited_poa') {
    try {
      await env.DB.prepare(
        `UPDATE clients SET lpoa_contract_id = ? WHERE id = ? AND org_id = ?`
      ).bind(row.id, row.client_id, opts.orgId).run();
    } catch { /* soft */ }
  }

  await writeSecurityAudit(env, {
    orgId: opts.orgId,
    actorUserId: opts.userId,
    action: 'legal_contract_signed',
    resourceType: 'legal_contract',
    resourceId: row.id,
    ip: opts.ip,
    detail: { status: nextStatus, contentHash: row.content_hash, esignConsentId: consent.consentId },
  });

  return {
    contractId: row.id,
    documentId: row.document_id,
    status: nextStatus,
    esignConsentId: consent.consentId,
    vaultUploadId: vault.uploadId,
    contentHash: row.content_hash,
    requiresNotarization: nextStatus === 'awaiting_ron',
    signedAt: ts,
  };
}

export async function issueClientContractPack(
  env: ContractEnv,
  opts: { orgId: string; client: any; userId?: string; governingState?: string },
) {
  const types: ContractType[] = ['esign_consent', 'croa_service', 'limited_poa', 'representation_auth'];
  const created = [];
  for (const t of types) {
    created.push(await createLegalContract(env, {
      orgId: opts.orgId,
      client: opts.client,
      userId: opts.userId,
      contractType: t,
      governingState: opts.governingState,
    }));
  }
  return { contracts: created, count: created.length };
}
