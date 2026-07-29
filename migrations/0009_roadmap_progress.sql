-- Interactive fundability roadmap progress (steps + document checklist)
CREATE TABLE IF NOT EXISTS roadmap_progress (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  roadmap_key TEXT NOT NULL, -- mortgage | auto | student | debt
  completed_steps_json TEXT NOT NULL DEFAULT '[]',
  completed_docs_json TEXT NOT NULL DEFAULT '[]',
  notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, roadmap_key),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_roadmap_progress_client ON roadmap_progress(client_id, roadmap_key);
