-- Track which MyFreeScoreNow affiliate enroll offer a public signup used (A8289 family).

ALTER TABLE clients ADD COLUMN mfsn_affiliate_offer_code TEXT;
ALTER TABLE clients ADD COLUMN mfsn_enrolled_under_affiliate INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_clients_mfsn_affiliate_offer ON clients(org_id, mfsn_affiliate_offer_code);
