-- Client learned intelligence — semantic persistent memory per consumer
-- Stored in Cloudflare D1; embeddings via Workers AI; PII encrypted at rest where applicable

CREATE TABLE IF NOT EXISTS client_memory_chunks (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'system',
  category TEXT NOT NULL DEFAULT 'fact',
  content TEXT NOT NULL,
  embedding_json TEXT,
  metadata_json TEXT,
  importance REAL NOT NULL DEFAULT 0.5,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_client_memory_org_client
  ON client_memory_chunks(org_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_memory_category
  ON client_memory_chunks(org_id, client_id, category);

-- Org-level AI task preferences (model routing per feature)
CREATE TABLE IF NOT EXISTS org_ai_task_models (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  config_json TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(org_id, task_id)
);

CREATE INDEX IF NOT EXISTS idx_org_ai_task_models_org
  ON org_ai_task_models(org_id, task_id);
