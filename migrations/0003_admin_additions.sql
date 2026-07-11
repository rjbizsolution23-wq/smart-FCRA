-- SmartFCRA Supreme — Admin and Client Portal Database Schema Enhancements (v14.0)
-- Supporting administrative workflows, litigation pipelines, LVS calculations, and E-SIGN digital signatures.

-- 1. Client Table Enhancements
ALTER TABLE clients ADD COLUMN case_status TEXT DEFAULT 'ONBOARDING';
ALTER TABLE clients ADD COLUMN lvs_score INTEGER DEFAULT 0;
ALTER TABLE clients ADD COLUMN estimated_recovery REAL DEFAULT 0.0;
ALTER TABLE clients ADD COLUMN subscription_plan TEXT DEFAULT 'free';
ALTER TABLE clients ADD COLUMN subscription_status TEXT DEFAULT 'inactive';

-- 2. Document Table Digital Signature Audit Trail
ALTER TABLE documents ADD COLUMN signature_data TEXT;
ALTER TABLE documents ADD COLUMN signature_ip TEXT;
ALTER TABLE documents ADD COLUMN signature_timestamp TEXT;
