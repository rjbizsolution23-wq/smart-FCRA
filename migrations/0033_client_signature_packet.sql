-- Client signature packet status (CRO Compliance OS checklist)

ALTER TABLE clients ADD COLUMN signature_packet_json TEXT;

CREATE TABLE IF NOT EXISTS platform_support_intake (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  user_id TEXT,
  user_email TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  escalated INTEGER DEFAULT 0,
  status TEXT DEFAULT 'new',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_platform_support_intake_status ON platform_support_intake(status, created_at DESC);
