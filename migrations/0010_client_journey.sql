-- Personalized client journey + daily motivational wake-up messages
CREATE TABLE IF NOT EXISTS client_journey_state (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL UNIQUE,
  phase TEXT NOT NULL DEFAULT 'get_started', -- get_started | discover | dispute | rebuild | fund_ready
  streak_days INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_check_in_date TEXT, -- YYYY-MM-DD (UTC)
  last_motivation_date TEXT, -- YYYY-MM-DD last daily message generated/sent
  focus_goal TEXT DEFAULT 'mortgage', -- mortgage | auto | student | debt | rebuild
  motivation_opt_in INTEGER NOT NULL DEFAULT 1,
  celebration_json TEXT, -- milestones unlocked
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_journey_state_org ON client_journey_state(org_id, phase);

CREATE TABLE IF NOT EXISTS daily_motivation_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  send_date TEXT NOT NULL, -- YYYY-MM-DD UTC
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  focus_action TEXT,
  suggestions_json TEXT,
  phase TEXT,
  channels_json TEXT, -- { in_app, email, sms }
  alert_ids_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, send_date),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_motivation_log_date ON daily_motivation_log(send_date, org_id);

ALTER TABLE clients ADD COLUMN journey_opt_in INTEGER DEFAULT 1;
