-- Integration OS: credential vault, event bus, identity matching, DLQ, connections, maker-checker

CREATE TABLE IF NOT EXISTS integration_secrets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  ciphertext TEXT NOT NULL,
  masked_preview TEXT NOT NULL,
  created_by TEXT,
  rotated_at TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, provider, secret_key)
);
CREATE INDEX IF NOT EXISTS idx_integration_secrets_org ON integration_secrets(org_id, provider, revoked_at);

CREATE TABLE IF NOT EXISTS integration_connections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  auth_type TEXT NOT NULL DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'disconnected',
  location_id TEXT,
  location_name TEXT,
  scopes_json TEXT DEFAULT '[]',
  config_json TEXT DEFAULT '{}',
  health_status TEXT DEFAULT 'unknown',
  last_success_at TEXT,
  last_error_at TEXT,
  last_error TEXT,
  last_sync_at TEXT,
  next_sync_at TEXT,
  token_expires_at TEXT,
  records_pending INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  connected_by TEXT,
  connected_at TEXT,
  disconnected_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, provider)
);
CREATE INDEX IF NOT EXISTS idx_integration_connections_org ON integration_connections(org_id, status);

CREATE TABLE IF NOT EXISTS external_identity_links (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  external_system TEXT NOT NULL,
  external_record_id TEXT NOT NULL,
  external_email TEXT,
  match_confidence REAL DEFAULT 1.0,
  match_method TEXT DEFAULT 'manual',
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, external_system, external_record_id)
);
CREATE INDEX IF NOT EXISTS idx_external_identity_client ON external_identity_links(org_id, client_id);
CREATE INDEX IF NOT EXISTS idx_external_identity_email ON external_identity_links(org_id, external_email);

CREATE TABLE IF NOT EXISTS identity_resolution_queue (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  external_system TEXT NOT NULL,
  external_record_id TEXT,
  candidate_client_ids_json TEXT NOT NULL DEFAULT '[]',
  payload_json TEXT NOT NULL,
  match_score REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  resolved_client_id TEXT,
  resolved_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_identity_resolution_org ON identity_resolution_queue(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  aggregate_type TEXT,
  aggregate_id TEXT,
  client_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  source TEXT DEFAULT 'system',
  actor_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_platform_events_org ON platform_events(org_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_events_aggregate ON platform_events(org_id, aggregate_type, aggregate_id);

CREATE TABLE IF NOT EXISTS event_idempotency_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL,
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, idempotency_key)
);
CREATE INDEX IF NOT EXISTS idx_event_idempotency_org ON event_idempotency_keys(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS integration_job_queue (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  job_type TEXT NOT NULL,
  payload_json TEXT NOT NULL DEFAULT '{}',
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_error TEXT,
  dead_lettered_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_integration_job_queue_pending ON integration_job_queue(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_integration_job_queue_org ON integration_job_queue(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS maker_checker_requests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  client_id TEXT,
  initiated_by TEXT NOT NULL,
  approved_by TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_maker_checker_org ON maker_checker_requests(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS integration_access_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id TEXT,
  role TEXT,
  ip TEXT,
  success INTEGER NOT NULL DEFAULT 1,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_integration_access_log_org ON integration_access_log(org_id, created_at DESC);

ALTER TABLE ghl_webhook_events ADD COLUMN idempotency_key TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ghl_webhook_idempotency ON ghl_webhook_events(org_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE org_webhook_deliveries ADD COLUMN idempotency_key TEXT;
ALTER TABLE org_webhook_deliveries ADD COLUMN retry_count INTEGER DEFAULT 0;
ALTER TABLE org_webhook_deliveries ADD COLUMN next_retry_at TEXT;
ALTER TABLE org_webhook_deliveries ADD COLUMN dead_lettered INTEGER DEFAULT 0;
