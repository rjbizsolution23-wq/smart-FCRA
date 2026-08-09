-- GoHighLevel contact linkage for CRM sync
ALTER TABLE clients ADD COLUMN ghl_contact_id TEXT;
ALTER TABLE clients ADD COLUMN ghl_synced_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_clients_ghl_contact ON clients(ghl_contact_id);
