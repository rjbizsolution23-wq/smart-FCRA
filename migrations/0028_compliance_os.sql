-- Smart FCRA Compliance OS: communication lanes, lifecycle, workflows, consent evidence, tasks

ALTER TABLE clients ADD COLUMN lifecycle_stage TEXT DEFAULT 'onboarding';
ALTER TABLE clients ADD COLUMN lifecycle_updated_at TEXT;
ALTER TABLE clients ADD COLUMN marketing_email_consent INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN marketing_sms_consent INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN marketing_call_consent INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN comms_frozen INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN comms_freeze_reason TEXT;
ALTER TABLE clients ADD COLUMN mfsn_member_id TEXT;
ALTER TABLE clients ADD COLUMN mfsn_account_status TEXT;
ALTER TABLE clients ADD COLUMN mfsn_client_token_enc TEXT;
ALTER TABLE clients ADD COLUMN timezone TEXT DEFAULT 'America/Denver';

ALTER TABLE brand_leads ADD COLUMN lifecycle_stage TEXT DEFAULT 'lead';
ALTER TABLE brand_leads ADD COLUMN utm_source TEXT;
ALTER TABLE brand_leads ADD COLUMN utm_campaign TEXT;
ALTER TABLE brand_leads ADD COLUMN utm_medium TEXT;
ALTER TABLE brand_leads ADD COLUMN affiliate_id TEXT;
ALTER TABLE brand_leads ADD COLUMN marketing_email_consent INTEGER DEFAULT 0;
ALTER TABLE brand_leads ADD COLUMN marketing_sms_consent INTEGER DEFAULT 0;
ALTER TABLE brand_leads ADD COLUMN assigned_to TEXT;
ALTER TABLE brand_leads ADD COLUMN client_id TEXT;
ALTER TABLE brand_leads ADD COLUMN timezone TEXT;

CREATE TABLE IF NOT EXISTS consent_evidence (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  lead_id TEXT,
  channel TEXT NOT NULL,
  purpose TEXT NOT NULL,
  consent_language_version TEXT NOT NULL,
  exact_language TEXT,
  status TEXT NOT NULL DEFAULT 'GRANTED',
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  revocation_source TEXT,
  source_form TEXT,
  source_url TEXT,
  ip_address TEXT,
  user_agent TEXT,
  evidence_artifact TEXT,
  expires_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_consent_evidence_client ON consent_evidence(org_id, client_id, channel, purpose);
CREATE INDEX IF NOT EXISTS idx_consent_evidence_lead ON consent_evidence(org_id, lead_id, channel, purpose);

CREATE TABLE IF NOT EXISTS communication_attempts (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  lead_id TEXT,
  lane TEXT NOT NULL,
  channel TEXT NOT NULL,
  template_id TEXT,
  campaign_id TEXT,
  workflow_run_id TEXT,
  rendered_subject TEXT,
  decision TEXT NOT NULL,
  block_reasons_json TEXT,
  recipient_email TEXT,
  recipient_phone TEXT,
  sent INTEGER NOT NULL DEFAULT 0,
  provider_status TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_communication_attempts_org ON communication_attempts(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communication_attempts_client ON communication_attempts(org_id, client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS crm_workflow_runs (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  workflow_key TEXT NOT NULL,
  client_id TEXT,
  lead_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_step INTEGER NOT NULL DEFAULT 0,
  context_json TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  stopped_reason TEXT
);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_runs_active ON crm_workflow_runs(org_id, status, started_at DESC);

CREATE TABLE IF NOT EXISTS crm_workflow_steps (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_json TEXT NOT NULL,
  lane TEXT,
  channel TEXT,
  run_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  executed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_steps_due ON crm_workflow_steps(status, run_at);
CREATE INDEX IF NOT EXISTS idx_crm_workflow_steps_run ON crm_workflow_steps(run_id, step_index);

CREATE TABLE IF NOT EXISTS client_tasks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'normal',
  due_at TEXT,
  related_object_type TEXT,
  related_object_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_client_tasks_client ON client_tasks(org_id, client_id, status, due_at);

CREATE TABLE IF NOT EXISTS staff_action_queue (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  assigned_to TEXT,
  client_id TEXT,
  lead_id TEXT,
  priority TEXT NOT NULL DEFAULT 'P3',
  action_type TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  due_at TEXT,
  source TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_staff_action_queue_org ON staff_action_queue(org_id, status, priority, due_at);
