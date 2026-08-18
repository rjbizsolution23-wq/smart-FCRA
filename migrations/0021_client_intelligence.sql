-- Client portal intelligence: attestations, digital twin, disputes, CROA cancel, consents, compliance
-- Smart FCRA — not a separate product brand.

CREATE TABLE IF NOT EXISTS client_consents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PRESENTED', -- PRESENTED | GRANTED | REVOKED | DENIED
  presented_at DATETIME,
  accepted_at DATETIME,
  revoked_at DATETIME,
  source TEXT DEFAULT 'CLIENT_PORTAL',
  document_hash TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, consent_type, version)
);
CREATE INDEX IF NOT EXISTS idx_client_consents_client ON client_consents(client_id, consent_type);

CREATE TABLE IF NOT EXISTS service_cancellations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  contract_id TEXT,
  requested_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  effective_at DATETIME,
  channel TEXT NOT NULL DEFAULT 'CLIENT_PORTAL',
  reason_optional TEXT,
  confirmation_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'REQUESTED', -- REQUESTED | EFFECTIVE | WITHDRAWN
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_service_cancellations_client ON service_cancellations(client_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS client_attestations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  account_key TEXT,
  violation_id TEXT,
  dispute_id TEXT,
  question_id TEXT NOT NULL,
  response TEXT NOT NULL, -- YES | NO | UNSURE
  client_statement TEXT,
  evidence_ids_json TEXT,
  accepted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  statement_hash TEXT NOT NULL,
  created_by TEXT NOT NULL,
  immutable INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_client_attestations_client ON client_attestations(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tradeline_snapshots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  report_id TEXT,
  account_key TEXT NOT NULL,
  bureau TEXT NOT NULL,
  furnisher_name TEXT,
  account_number_masked TEXT,
  account_type TEXT,
  account_status TEXT,
  balance REAL,
  credit_limit REAL,
  past_due REAL,
  payment_status TEXT,
  remarks TEXT,
  date_opened TEXT,
  date_closed TEXT,
  date_reported TEXT,
  payment_history TEXT,
  raw_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tradeline_snapshots_client ON tradeline_snapshots(client_id, bureau, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tradeline_snapshots_key ON tradeline_snapshots(client_id, account_key, created_at DESC);

CREATE TABLE IF NOT EXISTS credit_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  report_id TEXT,
  account_key TEXT,
  bureau TEXT,
  event_type TEXT NOT NULL,
  field TEXT,
  previous_value TEXT,
  new_value TEXT,
  taxonomy TEXT NOT NULL DEFAULT 'UNKNOWN',
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_credit_events_client ON credit_events(client_id, detected_at DESC);

CREATE TABLE IF NOT EXISTS case_findings (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  finding_type TEXT NOT NULL,
  field TEXT,
  severity TEXT NOT NULL DEFAULT 'REVIEW',
  source_accounts_json TEXT,
  values_json TEXT,
  requires_consumer_confirmation INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_case_findings_client ON case_findings(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_disputes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  account_key TEXT,
  account_name TEXT,
  recipient_type TEXT NOT NULL DEFAULT 'CRA',
  recipient TEXT,
  status TEXT NOT NULL DEFAULT 'CLIENT_REVIEW',
  dispute_basis_json TEXT,
  requested_resolution_json TEXT,
  evidence_ids_json TEXT,
  client_attestation_ids_json TEXT,
  letter_id TEXT,
  firewall_verdict TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  approved_at DATETIME,
  sent_at DATETIME,
  created_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_portal_disputes_client ON portal_disputes(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS letter_approvals (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  dispute_id TEXT NOT NULL,
  letter_id TEXT,
  statements_json TEXT NOT NULL,
  evidence_json TEXT,
  confirmed_accurate INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS compliance_decisions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  action_type TEXT NOT NULL,
  rules_evaluated_json TEXT,
  result TEXT NOT NULL, -- ALLOW | BLOCK | MANUAL_REVIEW
  explanation_json TEXT,
  policy_version TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_compliance_decisions_client ON compliance_decisions(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS action_receipts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  action TEXT NOT NULL,
  confirmation_number TEXT NOT NULL,
  payload_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_action_receipts_client ON action_receipts(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS investigation_clocks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  dispute_id TEXT,
  received_date TEXT,
  calculated_target_date TEXT,
  deadline_type TEXT,
  rule_basis TEXT,
  exception_possible INTEGER NOT NULL DEFAULT 1,
  actual_response_date TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  service_type TEXT NOT NULL,
  performed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  performed_by TEXT,
  deliverable_id TEXT,
  status TEXT NOT NULL DEFAULT 'COMPLETED'
);
