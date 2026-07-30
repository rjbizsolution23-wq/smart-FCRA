-- Legal contracts, ESIGN audit, video conferences, RON sessions
CREATE TABLE IF NOT EXISTS legal_contracts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  document_id TEXT,
  vault_upload_id TEXT,
  contract_type TEXT NOT NULL, -- croa_service | limited_poa | esign_consent | representation_auth
  template_version TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  governing_state TEXT,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | awaiting_esign | signed | awaiting_ron | notarized | void
  content_text TEXT NOT NULL,
  signature_data TEXT,
  signature_ip TEXT,
  signature_ua TEXT,
  signature_timestamp TEXT,
  esign_consent_id TEXT,
  ron_session_id TEXT,
  notarized_at TEXT,
  notary_name TEXT,
  notary_commission TEXT,
  notary_state TEXT,
  notary_certificate_json TEXT,
  metadata_json TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_legal_contracts_client ON legal_contracts(client_id, org_id);
CREATE INDEX IF NOT EXISTS idx_legal_contracts_type ON legal_contracts(contract_type, status);

CREATE TABLE IF NOT EXISTS esign_consent_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  user_id TEXT,
  disclosure_version TEXT NOT NULL,
  disclosure_hash TEXT NOT NULL,
  disclosure_text TEXT NOT NULL,
  consent_granted INTEGER NOT NULL DEFAULT 1,
  intent_to_sign INTEGER NOT NULL DEFAULT 1,
  content_hash TEXT,
  document_id TEXT,
  contract_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_esign_consent_client ON esign_consent_events(client_id, org_id);

CREATE TABLE IF NOT EXISTS video_conference_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  room_name TEXT NOT NULL,
  room_sid TEXT,
  purpose TEXT NOT NULL DEFAULT 'advisor_consult', -- advisor_consult | ron_support | coaching
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled | live | completed | cancelled | failed
  host_user_id TEXT,
  recording_enabled INTEGER NOT NULL DEFAULT 1,
  recording_sid TEXT,
  composition_sid TEXT,
  recording_r2_key TEXT,
  vault_upload_id TEXT,
  scheduled_at TEXT,
  started_at TEXT,
  ended_at TEXT,
  max_participants INTEGER DEFAULT 4,
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_video_sessions_org ON video_conference_sessions(org_id, status);
CREATE INDEX IF NOT EXISTS idx_video_sessions_client ON video_conference_sessions(client_id);

CREATE TABLE IF NOT EXISTS ron_sessions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  contract_id TEXT,
  document_id TEXT,
  video_session_id TEXT,
  vendor TEXT NOT NULL DEFAULT 'sandbox', -- sandbox | proof | bluenotary | custom
  vendor_session_id TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  -- created | identity_pending | identity_verified | in_session | completed | failed | cancelled
  principal_state TEXT NOT NULL,
  notary_state TEXT,
  identity_method TEXT, -- kba_plus_credential | personal_knowledge | sandbox_checklist
  identity_result_json TEXT,
  journal_entry_json TEXT,
  a_v_recording_ref TEXT,
  sealed_document_hash TEXT,
  sealed_vault_upload_id TEXT,
  retention_years INTEGER NOT NULL DEFAULT 7,
  retention_until TEXT,
  error_message TEXT,
  metadata_json TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ron_sessions_client ON ron_sessions(client_id, org_id);
CREATE INDEX IF NOT EXISTS idx_ron_sessions_status ON ron_sessions(status);

CREATE TABLE IF NOT EXISTS ron_state_rules (
  state_code TEXT PRIMARY KEY,
  state_name TEXT NOT NULL,
  ron_allowed INTEGER NOT NULL DEFAULT 1,
  requires_kba INTEGER NOT NULL DEFAULT 1,
  requires_credential_analysis INTEGER NOT NULL DEFAULT 1,
  recording_retention_years INTEGER NOT NULL DEFAULT 7,
  platform_approval_required INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Harden documents with content integrity fields (soft-add)
ALTER TABLE documents ADD COLUMN content_hash TEXT;
ALTER TABLE documents ADD COLUMN esign_consent_id TEXT;
ALTER TABLE documents ADD COLUMN requires_notarization INTEGER DEFAULT 0;
ALTER TABLE documents ADD COLUMN ron_session_id TEXT;
ALTER TABLE documents ADD COLUMN notarized_at TEXT;

ALTER TABLE clients ADD COLUMN governing_state TEXT;
ALTER TABLE clients ADD COLUMN esign_consent_at TEXT;
ALTER TABLE clients ADD COLUMN croa_contract_id TEXT;
ALTER TABLE clients ADD COLUMN lpoa_contract_id TEXT;
