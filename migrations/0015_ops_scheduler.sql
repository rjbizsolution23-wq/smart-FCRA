-- Ops scheduler: job runs, newsletter, suppressions, compliance snapshots, engagement
CREATE TABLE IF NOT EXISTS scheduled_job_runs (
  id TEXT PRIMARY KEY,
  job_name TEXT NOT NULL,
  pack TEXT, -- hourly | daily | weekly | monthly | manual
  org_id TEXT,
  status TEXT NOT NULL DEFAULT 'running', -- running | ok | error | skipped
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  stats_json TEXT,
  error_message TEXT,
  triggered_by TEXT -- cron | admin | system
);
CREATE INDEX IF NOT EXISTS idx_job_runs_name ON scheduled_job_runs(job_name, started_at);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON scheduled_job_runs(status, started_at);

CREATE TABLE IF NOT EXISTS email_suppressions (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  email TEXT NOT NULL,
  reason TEXT NOT NULL, -- unsubscribe | bounce | complaint | manual
  source TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(email, reason)
);
CREATE INDEX IF NOT EXISTS idx_email_suppressions_email ON email_suppressions(email);

CREATE TABLE IF NOT EXISTS newsletter_subscriptions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | unsubscribed | bounced
  topics_json TEXT, -- ["education","fundability","compliance"]
  opted_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  opted_out_at TEXT,
  UNIQUE(org_id, email)
);
CREATE INDEX IF NOT EXISTS idx_newsletter_org ON newsletter_subscriptions(org_id, status);

CREATE TABLE IF NOT EXISTS newsletter_issues (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  issue_key TEXT NOT NULL, -- e.g. 2026-W31
  status TEXT NOT NULL DEFAULT 'draft', -- draft | sent
  sent_at TEXT,
  stats_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, issue_key)
);

CREATE TABLE IF NOT EXISTS newsletter_deliveries (
  id TEXT PRIMARY KEY,
  issue_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  client_id TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL, -- sent | simulated | failed | skipped
  provider TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(issue_id, email)
);

CREATE TABLE IF NOT EXISTS compliance_snapshots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  period_key TEXT NOT NULL, -- YYYY-MM
  snapshot_json TEXT NOT NULL,
  posture_score INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(org_id, period_key)
);

CREATE TABLE IF NOT EXISTS ops_alerts (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- info | warning | critical
  category TEXT NOT NULL, -- email_health | privacy_sla | bureau | backup | security
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  meta_json TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ops_alerts_org ON ops_alerts(org_id, created_at);

-- Soft-add engagement / marketing preference columns on clients
ALTER TABLE clients ADD COLUMN last_engaged_at TEXT;
ALTER TABLE clients ADD COLUMN newsletter_opt_in INTEGER DEFAULT 0;
