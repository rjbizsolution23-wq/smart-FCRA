-- Tenant isolation, session retention, and full compliance coverage.
-- Keep session rows after logout/expiry (revoked_at) so every tenant visit is stored.
-- Demo visitors on the shared host user are isolated by demo_session_id.

ALTER TABLE sessions ADD COLUMN last_seen_at TEXT;
ALTER TABLE sessions ADD COLUMN last_path TEXT;
ALTER TABLE sessions ADD COLUMN demo_session_id TEXT;
ALTER TABLE sessions ADD COLUMN revoked_at TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_org ON sessions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_demo ON sessions(demo_session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON sessions(user_id, revoked_at, expires_at);

ALTER TABLE activity_log ADD COLUMN ip_address TEXT;
ALTER TABLE activity_log ADD COLUMN user_agent TEXT;

ALTER TABLE demo_sessions ADD COLUMN source_ip TEXT;
ALTER TABLE demo_sessions ADD COLUMN user_agent TEXT;
CREATE INDEX IF NOT EXISTS idx_demo_sessions_org ON demo_sessions(org_id, created_at DESC);

ALTER TABLE demo_agent_turns ADD COLUMN org_id TEXT;
CREATE INDEX IF NOT EXISTS idx_demo_agent_turns_org ON demo_agent_turns(org_id, created_at DESC);

ALTER TABLE brand_leads ADD COLUMN source_ip TEXT;
ALTER TABLE brand_leads ADD COLUMN user_agent TEXT;

-- Org-scoped indexes for client-intelligence tables (0021)
CREATE INDEX IF NOT EXISTS idx_client_consents_org ON client_consents(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_service_cancellations_org ON service_cancellations(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_client_attestations_org ON client_attestations(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_tradeline_snapshots_org ON tradeline_snapshots(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_credit_events_org ON credit_events(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_case_findings_org ON case_findings(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_portal_disputes_org ON portal_disputes(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_letter_approvals_org ON letter_approvals(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_compliance_decisions_org ON compliance_decisions(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_receipts_org ON action_receipts(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_investigation_clocks_org ON investigation_clocks(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_service_records_org ON service_records(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_billing_ledger_org ON billing_ledger(org_id, created_at DESC);

-- Append-only session lifecycle (login, logout, MFA, demo enter, fingerprint mismatch)
CREATE TABLE IF NOT EXISTS session_events (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  org_id TEXT,
  user_id TEXT,
  demo_session_id TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  path TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_session_events_org ON session_events(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_session ON session_events(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_events_user ON session_events(user_id, created_at DESC);
