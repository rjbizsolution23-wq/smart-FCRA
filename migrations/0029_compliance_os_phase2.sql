-- Compliance OS phase 2: automations, approvals, timeline, preferences, calls, GHL inbound, push

ALTER TABLE marketing_campaigns ADD COLUMN approval_status TEXT DEFAULT 'draft';
ALTER TABLE marketing_campaigns ADD COLUMN lane TEXT DEFAULT 'marketing';
ALTER TABLE marketing_campaigns ADD COLUMN category TEXT DEFAULT 'marketing';
ALTER TABLE marketing_campaigns ADD COLUMN approved_by TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN approved_at TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN compliance_reviewed_by TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN compliance_reviewed_at TEXT;
ALTER TABLE marketing_campaigns ADD COLUMN suppression_simulation_json TEXT;

CREATE TABLE IF NOT EXISTS automation_definitions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  conditions_json TEXT NOT NULL DEFAULT '[]',
  steps_json TEXT NOT NULL DEFAULT '[]',
  lane TEXT NOT NULL DEFAULT 'transactional',
  category TEXT NOT NULL DEFAULT 'custom',
  status TEXT NOT NULL DEFAULT 'draft',
  mandatory_controls INTEGER NOT NULL DEFAULT 1,
  version INTEGER NOT NULL DEFAULT 1,
  cloned_from TEXT,
  created_by TEXT,
  approved_by TEXT,
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_automation_definitions_org ON automation_definitions(org_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS campaign_approval_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  reviewer_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_campaign_approval_log_target ON campaign_approval_log(org_id, target_id, created_at DESC);

CREATE TABLE IF NOT EXISTS communication_preferences (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  email_service INTEGER NOT NULL DEFAULT 1,
  sms_service INTEGER NOT NULL DEFAULT 1,
  marketing_email INTEGER NOT NULL DEFAULT 0,
  marketing_sms INTEGER NOT NULL DEFAULT 0,
  marketing_calls INTEGER NOT NULL DEFAULT 0,
  push_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_communication_preferences_client ON communication_preferences(org_id, client_id);

CREATE TABLE IF NOT EXISTS client_timeline_events (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  related_object_type TEXT,
  related_object_id TEXT,
  actor_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_client_timeline_client ON client_timeline_events(org_id, client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  keys_json TEXT,
  user_agent TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_client ON push_subscriptions(org_id, client_id, active);

CREATE TABLE IF NOT EXISTS call_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  lead_id TEXT,
  direction TEXT NOT NULL DEFAULT 'outbound',
  phone TEXT,
  duration_sec INTEGER,
  recording_id TEXT,
  disclosure_required INTEGER DEFAULT 0,
  disclosure_played INTEGER DEFAULT 0,
  jurisdiction TEXT,
  purpose TEXT DEFAULT 'service',
  blocked_reason TEXT,
  staff_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_call_log_org ON call_log(org_id, client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ghl_webhook_events (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  event_type TEXT NOT NULL,
  contact_id TEXT,
  payload_json TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  result_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ghl_webhook_events_org ON ghl_webhook_events(org_id, processed, created_at DESC);
