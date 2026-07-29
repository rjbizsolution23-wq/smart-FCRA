-- Ultimate security, compliance, vault binary, alerts, privacy, tradeline orders
ALTER TABLE portal_uploads ADD COLUMN r2_key TEXT;
ALTER TABLE portal_uploads ADD COLUMN byte_size INTEGER;
ALTER TABLE portal_uploads ADD COLUMN sha256 TEXT;
ALTER TABLE portal_uploads ADD COLUMN encrypted INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS security_audit_log (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  actor_user_id TEXT,
  actor_role TEXT,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success INTEGER DEFAULT 1,
  detail_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_security_audit_org ON security_audit_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_action ON security_audit_log(action, created_at DESC);

CREATE TABLE IF NOT EXISTS privacy_requests (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  requester_user_id TEXT,
  request_type TEXT NOT NULL, -- export | delete | restrict
  status TEXT NOT NULL DEFAULT 'pending', -- pending | in_progress | fulfilled | rejected
  legal_basis TEXT, -- ccpa | gdpr | fcra | consumer_request
  notes TEXT,
  fulfillment_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  fulfilled_at DATETIME,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
CREATE INDEX IF NOT EXISTS idx_privacy_org ON privacy_requests(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_alerts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  channel TEXT NOT NULL, -- email | sms | in_app
  event_type TEXT NOT NULL, -- staff_message | bureau_update | invite | privacy | tradeline
  title TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'queued', -- queued | sent | failed | read
  provider_ref TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_portal_alerts_client ON portal_alerts(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tradeline_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  user_id TEXT,
  product_id TEXT NOT NULL,
  product_name TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | canceled | fulfilled
  metadata_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  paid_at DATETIME,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_tradeline_orders_client ON tradeline_orders(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS underwriting_snapshots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  upload_id TEXT,
  monthly_income REAL,
  monthly_debt REAL,
  dti_pct REAL,
  reserves_months REAL,
  cash_flow_json TEXT,
  report_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_underwriting_client ON underwriting_snapshots(client_id, created_at DESC);

ALTER TABLE clients ADD COLUMN ssn_last4_enc TEXT;
ALTER TABLE clients ADD COLUMN dob_enc TEXT;
ALTER TABLE clients ADD COLUMN notify_email INTEGER DEFAULT 1;
ALTER TABLE clients ADD COLUMN notify_sms INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN phone_e164 TEXT;
ALTER TABLE clients ADD COLUMN estimated_monthly_income REAL;
ALTER TABLE clients ADD COLUMN estimated_monthly_debt REAL;
ALTER TABLE clients ADD COLUMN data_retention_holds INTEGER DEFAULT 0;

ALTER TABLE users ADD COLUMN mfa_secret_enc TEXT;
ALTER TABLE users ADD COLUMN password_changed_at DATETIME;
ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0;
