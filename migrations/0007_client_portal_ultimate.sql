-- Ultimate client portal: messaging, uploads, education, tutor memory
CREATE TABLE IF NOT EXISTS portal_messages (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  sender_user_id TEXT,
  sender_role TEXT NOT NULL, -- staff | client | system
  channel TEXT NOT NULL DEFAULT 'portal', -- portal | email
  subject TEXT,
  body TEXT NOT NULL,
  attachment_name TEXT,
  attachment_meta TEXT,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_portal_messages_client ON portal_messages(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_portal_messages_org ON portal_messages(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS portal_uploads (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  uploaded_by TEXT,
  category TEXT NOT NULL, -- id_doc | creditor_reply | bank_statement | other | tradeline_app
  file_name TEXT,
  mime_type TEXT,
  content_text TEXT, -- extracted / pasted text (encrypted at app layer when sensitive)
  notes TEXT,
  analysis_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_portal_uploads_client ON portal_uploads(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS education_progress (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  track TEXT NOT NULL, -- literacy | credit | fundability | expert
  status TEXT NOT NULL DEFAULT 'started', -- started | completed
  quiz_score INTEGER,
  quiz_total INTEGER,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, lesson_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS tutor_memory (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL UNIQUE,
  summary TEXT,
  goals_json TEXT,
  strengths_json TEXT,
  gaps_json TEXT,
  last_quiz_at DATETIME,
  sessions_count INTEGER DEFAULT 0,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS fundability_snapshots (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  overall_score INTEGER,
  mortgage_ready INTEGER,
  auto_ready INTEGER,
  student_ready INTEGER,
  debt_health INTEGER,
  report_json TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_fundability_client ON fundability_snapshots(client_id, created_at DESC);

ALTER TABLE clients ADD COLUMN preferred_language TEXT DEFAULT 'en';
ALTER TABLE clients ADD COLUMN portal_welcome_sent_at DATETIME;
