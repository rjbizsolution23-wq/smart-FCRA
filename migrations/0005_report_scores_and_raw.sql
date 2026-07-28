-- Bureau scores + import provenance for enterprise report workspace
ALTER TABLE clients ADD COLUMN eq_score INTEGER;
ALTER TABLE clients ADD COLUMN ex_score INTEGER;
ALTER TABLE clients ADD COLUMN tu_score INTEGER;

ALTER TABLE credit_reports ADD COLUMN eq_score INTEGER;
ALTER TABLE credit_reports ADD COLUMN ex_score INTEGER;
ALTER TABLE credit_reports ADD COLUMN tu_score INTEGER;
ALTER TABLE credit_reports ADD COLUMN fico_score INTEGER;
ALTER TABLE credit_reports ADD COLUMN vantage_score INTEGER;
ALTER TABLE credit_reports ADD COLUMN source_provider TEXT;
ALTER TABLE credit_reports ADD COLUMN source_payload_type TEXT;
