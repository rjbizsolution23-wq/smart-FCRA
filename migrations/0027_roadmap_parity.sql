-- Roadmap parity: client billing, PPD, campaigns, custom domains, escalation, progress reports

ALTER TABLE clients ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE clients ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE clients ADD COLUMN billing_amount_cents INTEGER;
ALTER TABLE clients ADD COLUMN billing_interval TEXT DEFAULT 'month';
ALTER TABLE clients ADD COLUMN dunning_stage INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN last_progress_report_at TEXT;

CREATE TABLE IF NOT EXISTS client_billing_plans (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  interval TEXT NOT NULL DEFAULT 'month',
  stripe_price_id TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_client_billing_plans_org ON client_billing_plans(org_id, active);

CREATE TABLE IF NOT EXISTS client_invoices (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  stripe_invoice_id TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  invoice_type TEXT NOT NULL DEFAULT 'subscription',
  description TEXT,
  ppd_event_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_client_invoices_org ON client_invoices(org_id, client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ppd_charges (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  credit_event_id TEXT,
  account_key TEXT,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  stripe_invoice_id TEXT,
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ppd_charges_org ON ppd_charges(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS escalation_queue (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  document_id TEXT,
  violation_id TEXT,
  trigger_type TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  letter_types_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  auto_generated_doc_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by TEXT
);
CREATE INDEX IF NOT EXISTS idx_escalation_queue_org ON escalation_queue(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS client_progress_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  period_key TEXT NOT NULL,
  summary_json TEXT,
  emailed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_progress_reports_period ON client_progress_reports(org_id, client_id, period_key);

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email',
  segment_json TEXT NOT NULL,
  subject TEXT,
  body_template TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TEXT,
  sent_at TEXT,
  stats_json TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_org ON marketing_campaigns(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_deliveries (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  campaign_id TEXT NOT NULL,
  client_id TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_campaign ON campaign_deliveries(campaign_id, status);

ALTER TABLE organizations ADD COLUMN custom_domain TEXT;
ALTER TABLE organizations ADD COLUMN custom_domain_verified INTEGER DEFAULT 0;
