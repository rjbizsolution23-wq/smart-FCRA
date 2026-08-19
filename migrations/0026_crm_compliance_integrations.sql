-- Customer Service / CRM compliance objects + Zapier-style integrations (API keys, outbound webhooks)

CREATE TABLE IF NOT EXISTS org_api_keys (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  scopes_json TEXT NOT NULL DEFAULT '["read","write"]',
  created_by TEXT,
  last_used_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_org_api_keys_org ON org_api_keys(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_api_keys_prefix ON org_api_keys(key_prefix);

CREATE TABLE IF NOT EXISTS org_webhook_endpoints (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  events_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_org_webhooks_org ON org_webhook_endpoints(org_id, active);

CREATE TABLE IF NOT EXISTS org_webhook_deliveries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  endpoint_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_org_webhook_deliveries_org ON org_webhook_deliveries(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  ticket_number TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'phone',
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  disposition TEXT,
  subject TEXT,
  summary TEXT,
  facts_text TEXT,
  action_text TEXT,
  result_text TEXT,
  next_step_text TEXT,
  escalation_level INTEGER NOT NULL DEFAULT 1,
  assigned_to TEXT,
  verified_identity INTEGER NOT NULL DEFAULT 0,
  recording_disclosed INTEGER,
  created_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_tickets_number ON support_tickets(org_id, ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_client ON support_tickets(org_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS support_interactions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  ticket_id TEXT NOT NULL,
  client_id TEXT,
  interaction_type TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'inbound',
  body TEXT,
  red_flag_terms_json TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_interactions_ticket ON support_interactions(ticket_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_complaints (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  ticket_id TEXT,
  complaint_number TEXT NOT NULL,
  classification TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  allegation_summary TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  owner_id TEXT,
  investigation_notes TEXT,
  resolution_summary TEXT,
  customer_response_sent INTEGER NOT NULL DEFAULT 0,
  root_cause TEXT,
  corrective_action TEXT,
  created_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_support_complaints_number ON support_complaints(org_id, complaint_number);
CREATE INDEX IF NOT EXISTS idx_support_complaints_org ON support_complaints(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS support_refund_requests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  ticket_id TEXT,
  amount_cents INTEGER,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  decision TEXT,
  decision_by TEXT,
  decision_at TEXT,
  stripe_refund_id TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_refunds_org ON support_refund_requests(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS do_not_contact_records (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  channel TEXT NOT NULL,
  consent_source TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  effective_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  permitted_exceptions_json TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dnc_org_client ON do_not_contact_records(org_id, client_id, channel, status);

CREATE TABLE IF NOT EXISTS ai_output_reviews (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  ticket_id TEXT,
  output_type TEXT NOT NULL,
  model_name TEXT,
  finding_id TEXT,
  document_id TEXT,
  suspected_error TEXT,
  source_evidence_json TEXT,
  correspondence_sent INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewer_id TEXT,
  resolution TEXT,
  created_by TEXT,
  resolved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_output_reviews_org ON ai_output_reviews(org_id, status, created_at DESC);
