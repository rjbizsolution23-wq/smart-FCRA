-- Interactive sales demo: gated sessions, one live MFSN pull per account.
CREATE TABLE IF NOT EXISTS demo_sessions (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  business_name TEXT NOT NULL,
  business_address TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  mfsn_pulls INTEGER NOT NULL DEFAULT 0,
  mfsn_member_email TEXT,
  live_client_id TEXT,
  auth_session_id TEXT,
  org_id TEXT,
  user_id TEXT,
  lead_id TEXT,
  tour_step INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_demo_sessions_token_hash ON demo_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_email ON demo_sessions(email);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_phone ON demo_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_auth ON demo_sessions(auth_session_id);
CREATE INDEX IF NOT EXISTS idx_demo_sessions_expires ON demo_sessions(expires_at);

CREATE TABLE IF NOT EXISTS demo_agent_turns (
  id TEXT PRIMARY KEY,
  demo_session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  actions_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (demo_session_id) REFERENCES demo_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_demo_agent_turns_session ON demo_agent_turns(demo_session_id, created_at);
