-- Knowledge base chunks (retrievable) + email template registry + violation reasoning
CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL, -- case_law | statute | faq | sop
  title TEXT NOT NULL,
  citation TEXT,
  body TEXT NOT NULL,
  statutes_json TEXT,
  tags_json TEXT,
  embedding_json TEXT, -- Workers AI vector when available
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_knowledge_source ON knowledge_chunks(source);

CREATE TABLE IF NOT EXISTS email_template_registry (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  event_type TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE violations ADD COLUMN fact_check_status TEXT;
ALTER TABLE violations ADD COLUMN confidence INTEGER;
ALTER TABLE violations ADD COLUMN reasoning_json TEXT;
ALTER TABLE violations ADD COLUMN analysis_mode TEXT DEFAULT 'live_rules_engine';
