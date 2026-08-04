-- Seed data for Smart FCRA Supreme v2
-- Demo password: demo123456 (PBKDF2-SHA-256)

INSERT OR IGNORE INTO organizations (id, name, slug, plan, max_users, max_clients, max_reports_per_month, settings)
VALUES (
  'org_demo_001',
  'Demo Legal Firm',
  'demo-legal-firm',
  'professional',
  10,
  500,
  200,
  '{"letterhead":{"firmName":"Demo Legal Firm","attorneyName":"Demo Counsel, Esq.","address":"100 Justice Ave","city":"Dallas","state":"TX","zip":"75201","phone":"(214) 555-0100","email":"counsel@demolegalfirm.example","barNumber":"TX-000000"}}'
);

INSERT OR IGNORE INTO users (id, org_id, email, name, password_hash, role, is_active)
VALUES (
  'usr_demo_001',
  'org_demo_001',
  'demo@example.com',
  'Demo Admin',
  'pbkdf2$100000$9ded5ff8b462ab876495377355efad38$d0020e4d180c4e23935d80cf2c2a61375fb8c18de2f788dca43bb8408f269810',
  'super_admin',
  1
);

INSERT OR IGNORE INTO clients (
  id, org_id, created_by, first_name, last_name, email, phone,
  address_line1, city, state, zip, dob, ssn_last4, status, notes, tags,
  permissible_purpose_consent, croa_contract_agreed, tsr_advance_fee_waived, consent_timestamp,
  eq_score, ex_score, tu_score, estimated_monthly_income, estimated_monthly_debt
) VALUES (
  'cli_demo_001',
  'org_demo_001',
  'usr_demo_001',
  'Salisha',
  'McDowell',
  'salisha.mcdowell@example.com',
  '(414) 430-4277',
  '1342 NM 333',
  'Tijeras',
  'NM',
  '87059',
  '03/22/1982',
  '1642',
  'active',
  'Demo client pre-seeded for evaluation pipelines.',
  '["Premium", "Lead", "Demo"]',
  1, 1, 1, datetime('now'),
  642, 635, 648, 6200, 1650
);

-- Client portal login (same demo password as staff sandbox)
INSERT OR IGNORE INTO users (id, org_id, email, name, password_hash, role, is_active, must_change_password)
VALUES (
  'usr_demo_client_001',
  'org_demo_001',
  'salisha.mcdowell@example.com',
  'Salisha McDowell',
  'pbkdf2$100000$9ded5ff8b462ab876495377355efad38$d0020e4d180c4e23935d80cf2c2a61375fb8c18de2f788dca43bb8408f269810',
  'client',
  1,
  0
);

-- Keep demo client scores / portal password current on re-seed
UPDATE clients SET
  eq_score = COALESCE(eq_score, 642),
  ex_score = COALESCE(ex_score, 635),
  tu_score = COALESCE(tu_score, 648),
  estimated_monthly_income = COALESCE(estimated_monthly_income, 6200),
  estimated_monthly_debt = COALESCE(estimated_monthly_debt, 1650),
  tags = '["Premium", "Lead", "Demo"]'
WHERE id = 'cli_demo_001';

UPDATE users SET
  password_hash = 'pbkdf2$100000$9ded5ff8b462ab876495377355efad38$d0020e4d180c4e23935d80cf2c2a61375fb8c18de2f788dca43bb8408f269810',
  is_active = 1,
  must_change_password = 0,
  role = 'client'
WHERE id = 'usr_demo_client_001' OR (org_id = 'org_demo_001' AND lower(email) = 'salisha.mcdowell@example.com');

-- Isolation test users (Playwright)
INSERT OR IGNORE INTO organizations (id, name, slug, plan, max_users, max_clients, max_reports_per_month, settings)
VALUES ('org_iso_a', 'Isolation Firm A', 'isolation-a', 'professional', 5, 50, 50, '{}');

INSERT OR IGNORE INTO organizations (id, name, slug, plan, max_users, max_clients, max_reports_per_month, settings)
VALUES ('org_iso_b', 'Isolation Firm B', 'isolation-b', 'professional', 5, 50, 50, '{"suspended":true}');

INSERT OR IGNORE INTO users (id, org_id, email, name, password_hash, role, is_active)
VALUES (
  'usr_iso_member',
  'org_iso_a',
  'member@iso-a.example',
  'Iso Member',
  'pbkdf2$100000$9ded5ff8b462ab876495377355efad38$d0020e4d180c4e23935d80cf2c2a61375fb8c18de2f788dca43bb8408f269810',
  'member',
  1
);

INSERT OR IGNORE INTO users (id, org_id, email, name, password_hash, role, is_active)
VALUES (
  'usr_iso_suspended',
  'org_iso_b',
  'suspended@iso-b.example',
  'Suspended User',
  'pbkdf2$100000$9ded5ff8b462ab876495377355efad38$d0020e4d180c4e23935d80cf2c2a61375fb8c18de2f788dca43bb8408f269810',
  'admin',
  1
);
