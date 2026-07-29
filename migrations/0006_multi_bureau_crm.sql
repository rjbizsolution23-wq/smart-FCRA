-- Multi-bureau CRM: mark current report per bureau + pack status
ALTER TABLE credit_reports ADD COLUMN is_current INTEGER DEFAULT 1;
ALTER TABLE credit_reports ADD COLUMN replaces_report_id TEXT;
ALTER TABLE clients ADD COLUMN bureau_pack_status TEXT DEFAULT 'NONE';
-- NONE | PARTIAL | TRI_BUREAU_READY | WORKFLOW_FIRED
