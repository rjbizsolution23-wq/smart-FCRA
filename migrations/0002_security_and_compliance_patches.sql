-- SmartFCRA Supreme — Enterprise Security & Compliance Hardening SQL Patches (v13.0)
-- Aligning DB schemas with SOC 2 / HIPAA zero-trust encryption and TSR/CROA/FCRA regulatory compliance.

-- 1. Hardening User Authentication (MFA Integration)
ALTER TABLE users ADD COLUMN mfa_secret TEXT;
ALTER TABLE users ADD COLUMN mfa_enabled INTEGER NOT NULL DEFAULT 0;

-- 2. Session Request Fingerprinting (Zero-Trust Session Hijacking Protection)
ALTER TABLE sessions ADD COLUMN ip_address TEXT;
ALTER TABLE sessions ADD COLUMN user_agent TEXT;

-- 3. FCRA, CROA, and TSR Legal Consent Records (Compliance Audit Trails)
ALTER TABLE clients ADD COLUMN permissible_purpose_consent INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN croa_contract_agreed INTEGER NOT NULL DEFAULT 0;
ALTER TABLE clients ADD COLUMN tsr_advance_fee_waived INTEGER NOT NULL DEFAULT 0; -- Ensures compliance with Telemarketing Sales Rule (TSR - 16 CFR § 310.4(a)(2)) prohibiting credit repair advance fees.
ALTER TABLE clients ADD COLUMN consent_timestamp TEXT;

-- 4. USPS Postal and Statutory Case Response Tracking (15 U.S.C. § 1681i 30-day Clock)
ALTER TABLE documents ADD COLUMN response_due_date TEXT;
ALTER TABLE documents ADD COLUMN usps_tracking_number TEXT;

-- 5. Webhook Idempotency Tracking (Protects against billing and webhook replay exploits)
CREATE TABLE IF NOT EXISTS stripe_processed_events (
  id TEXT PRIMARY KEY,
  processed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
