-- Enterprise email delivery log + onboarding drip tracking
CREATE TABLE IF NOT EXISTS email_delivery_log (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  client_id TEXT,
  user_id TEXT,
  template_id TEXT,
  event_type TEXT,
  to_email TEXT NOT NULL,
  subject TEXT,
  provider TEXT,
  status TEXT NOT NULL, -- sent | simulated | failed | skipped
  error_message TEXT,
  message_id TEXT,
  brand_name TEXT,
  meta_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_email_delivery_org ON email_delivery_log(org_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_delivery_client ON email_delivery_log(client_id, created_at);
CREATE INDEX IF NOT EXISTS idx_email_delivery_status ON email_delivery_log(status);

CREATE TABLE IF NOT EXISTS onboarding_drip_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  drip_key TEXT NOT NULL, -- welcome_d1 | welcome_d3 | croa_nudge | dispute_due | admin_digest
  send_date TEXT NOT NULL,
  channels_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, drip_key, send_date)
);
CREATE INDEX IF NOT EXISTS idx_onboarding_drip_client ON onboarding_drip_log(client_id, drip_key);
