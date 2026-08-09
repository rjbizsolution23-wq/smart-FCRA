-- Public MFSN signup → gated client portal analysis
-- Existing clients default unlocked (1). Public signup sets unlocked = 0 until staff approves payment.

ALTER TABLE clients ADD COLUMN portal_analysis_unlocked INTEGER DEFAULT 1;
ALTER TABLE clients ADD COLUMN portal_analysis_unlocked_at DATETIME;
ALTER TABLE clients ADD COLUMN portal_analysis_unlocked_by TEXT;
ALTER TABLE clients ADD COLUMN signup_source TEXT;
ALTER TABLE clients ADD COLUMN mfsn_member_email TEXT;
ALTER TABLE clients ADD COLUMN payment_status TEXT DEFAULT 'active';

CREATE INDEX IF NOT EXISTS idx_clients_payment_status ON clients(org_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_clients_analysis_unlocked ON clients(org_id, portal_analysis_unlocked);
