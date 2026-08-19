-- Platform guide progress, user feedback, org free-AI override

CREATE TABLE IF NOT EXISTS user_guide_progress (
  user_id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  tour_step INTEGER DEFAULT 0,
  tour_completed INTEGER DEFAULT 0,
  tour_dismissed INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_user_guide_progress_org ON user_guide_progress(org_id);

CREATE TABLE IF NOT EXISTS platform_feedback (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  user_email TEXT,
  category TEXT DEFAULT 'improvement',
  subject TEXT,
  body TEXT NOT NULL,
  integration_request TEXT,
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_platform_feedback_org ON platform_feedback(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_feedback_status ON platform_feedback(status, created_at DESC);

-- Org-level: platform owner can grant unlimited platform AI without credit charges
ALTER TABLE org_ai_credits ADD COLUMN free_ai_override INTEGER DEFAULT 0;
