-- RJ branded public lead forms → Smart FCRA CRM inbox
CREATE TABLE IF NOT EXISTS brand_leads (
  id TEXT PRIMARY KEY,
  org_id TEXT,
  form_id TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  payload_json TEXT NOT NULL,
  source_url TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | contacted | qualified | closed | spam
  ghl_contact_id TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_brand_leads_form ON brand_leads(form_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_leads_email ON brand_leads(email);
CREATE INDEX IF NOT EXISTS idx_brand_leads_org ON brand_leads(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_brand_leads_status ON brand_leads(status);
