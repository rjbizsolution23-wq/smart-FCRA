-- Production ops: original report vault, upload hygiene, FCRA 611 clocks, CROA Stripe ledger
-- Smart FCRA — pairs imported files with the sandbox viewer; never stores originals in D1 BLOBs.

ALTER TABLE credit_reports ADD COLUMN r2_key TEXT;
ALTER TABLE credit_reports ADD COLUMN original_sha256 TEXT;
ALTER TABLE credit_reports ADD COLUMN original_mime TEXT;
ALTER TABLE credit_reports ADD COLUMN original_byte_size INTEGER;
ALTER TABLE credit_reports ADD COLUMN scan_status TEXT;
ALTER TABLE credit_reports ADD COLUMN scan_detail TEXT;
ALTER TABLE credit_reports ADD COLUMN ocr_status TEXT;
ALTER TABLE credit_reports ADD COLUMN ocr_text_chars INTEGER;

ALTER TABLE portal_uploads ADD COLUMN scan_status TEXT;
ALTER TABLE portal_uploads ADD COLUMN scan_detail TEXT;
ALTER TABLE portal_uploads ADD COLUMN ocr_status TEXT;
ALTER TABLE portal_uploads ADD COLUMN ocr_chars INTEGER;

ALTER TABLE documents ADD COLUMN dispute_result TEXT;
ALTER TABLE documents ADD COLUMN mailing_id TEXT;
ALTER TABLE documents ADD COLUMN mail_class TEXT;
ALTER TABLE documents ADD COLUMN investigation_clock_id TEXT;

ALTER TABLE investigation_clocks ADD COLUMN document_id TEXT;
ALTER TABLE investigation_clocks ADD COLUMN mailing_date TEXT;
ALTER TABLE investigation_clocks ADD COLUMN operational_target_date TEXT;
ALTER TABLE investigation_clocks ADD COLUMN status TEXT DEFAULT 'OPEN';

CREATE INDEX IF NOT EXISTS idx_investigation_clocks_client ON investigation_clocks(client_id, calculated_target_date);
CREATE INDEX IF NOT EXISTS idx_investigation_clocks_doc ON investigation_clocks(document_id);
CREATE INDEX IF NOT EXISTS idx_credit_reports_r2 ON credit_reports(org_id, r2_key);
CREATE INDEX IF NOT EXISTS idx_service_records_client ON service_records(client_id, service_type, performed_at DESC);

CREATE TABLE IF NOT EXISTS billing_ledger (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  stripe_object_id TEXT,
  event_type TEXT NOT NULL,
  amount_cents INTEGER,
  currency TEXT DEFAULT 'usd',
  service_type TEXT,
  service_record_id TEXT,
  decision TEXT NOT NULL,
  decision_id TEXT,
  status TEXT NOT NULL DEFAULT 'RECORDED',
  explanation_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_billing_ledger_client ON billing_ledger(org_id, client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_ledger_stripe ON billing_ledger(stripe_object_id);
