-- Operator Academy (RICK_COURSES) progress — mirrors education_progress but namespaced
-- per course/lesson so it never collides with the EDUCATION_LIBRARY fundability curriculum.
CREATE TABLE IF NOT EXISTS academy_progress (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed', -- started | completed
  quiz_score INTEGER,
  quiz_total INTEGER,
  completed_at DATETIME,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(client_id, lesson_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);
CREATE INDEX IF NOT EXISTS idx_academy_progress_client ON academy_progress(client_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_academy_progress_org ON academy_progress(org_id, updated_at DESC);
