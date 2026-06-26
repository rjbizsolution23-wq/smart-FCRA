-- FCRA Supreme Violation Detector SaaS - Database Schema
-- Multi-tenant with organizations, users, clients, reports, violations

-- Organizations (tenants)
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  max_users INTEGER NOT NULL DEFAULT 3,
  max_clients INTEGER NOT NULL DEFAULT 50,
  max_reports_per_month INTEGER NOT NULL DEFAULT 25,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  settings TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  avatar_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_login DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

-- Clients (consumers whose reports are analyzed)
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  dob TEXT,
  ssn_last4 TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  tags TEXT DEFAULT '[]',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Credit Reports (uploaded files)
CREATE TABLE IF NOT EXISTS credit_reports (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  bureau TEXT NOT NULL,
  report_date TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  raw_text TEXT,
  parsed_data TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded',
  personal_info TEXT DEFAULT '{}',
  total_accounts INTEGER DEFAULT 0,
  total_inquiries INTEGER DEFAULT 0,
  total_public_records INTEGER DEFAULT 0,
  total_collections INTEGER DEFAULT 0,
  analysis_started_at DATETIME,
  analysis_completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- Violations (detected from reports)
CREATE TABLE IF NOT EXISTS violations (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  report_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  severity TEXT NOT NULL,
  statute TEXT NOT NULL,
  statute_text TEXT,
  legal_standard TEXT,
  evidence TEXT NOT NULL,
  explanation TEXT NOT NULL,
  case_law TEXT,
  account_name TEXT,
  account_number TEXT,
  dofd TEXT,
  falloff_date TEXT,
  days_overdue INTEGER,
  statutory_damages_min REAL DEFAULT 0,
  statutory_damages_max REAL DEFAULT 0,
  actual_damages_est REAL DEFAULT 0,
  punitive_damages_est REAL DEFAULT 0,
  attorney_fees_est REAL DEFAULT 0,
  total_damages_min REAL DEFAULT 0,
  total_damages_max REAL DEFAULT 0,
  defendant_type TEXT,
  defendant_name TEXT,
  status TEXT NOT NULL DEFAULT 'detected',
  dispute_sent_date TEXT,
  dispute_response_date TEXT,
  dispute_result TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (report_id) REFERENCES credit_reports(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

-- Generated Documents (dispute letters, complaints, court filings)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  report_id TEXT,
  violation_ids TEXT DEFAULT '[]',
  doc_type TEXT NOT NULL,
  doc_subtype TEXT,
  title TEXT NOT NULL,
  recipient_name TEXT,
  recipient_address TEXT,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_date TEXT,
  response_date TEXT,
  response_notes TEXT,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Case Timeline / Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  report_id TEXT,
  violation_id TEXT,
  document_id TEXT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_clients_org ON clients(org_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(org_id, status);
CREATE INDEX IF NOT EXISTS idx_reports_org ON credit_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_reports_client ON credit_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_violations_report ON violations(report_id);
CREATE INDEX IF NOT EXISTS idx_violations_client ON violations(client_id);
CREATE INDEX IF NOT EXISTS idx_violations_severity ON violations(org_id, severity);
CREATE INDEX IF NOT EXISTS idx_documents_client ON documents(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_org ON activity_log(org_id);
CREATE INDEX IF NOT EXISTS idx_activity_client ON activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
