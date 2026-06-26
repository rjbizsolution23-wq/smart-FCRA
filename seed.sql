-- Seed data for FCRA Supreme Violation Detector
-- Demo organization + admin user (password: demo123)

INSERT OR IGNORE INTO organizations (id, name, slug, plan, max_users, max_clients, max_reports_per_month)
VALUES ('org_demo_001', 'Demo Legal Firm', 'demo-legal-firm', 'pro', 10, 500, 200);

-- Password hash for "demo123" using argon2id
INSERT OR IGNORE INTO users (id, org_id, email, name, password_hash, role)
VALUES ('usr_demo_001', 'org_demo_001', 'demo@example.com', 'Demo Admin', '$argon2id$v=19$m=65536,t=3,p=4$WjfsRirxGbg2rw6qqKkcSA$ARY9s7H8iu3a2t7dClyek1qLg0CrKide6uKyjtK+rrI', 'admin');

-- Pre-seed default client Salisha McDowell (matches mock credit report profiles for reliable demos)
INSERT OR IGNORE INTO clients (id, org_id, created_by, first_name, last_name, email, phone, address_line1, city, state, zip, dob, ssn_last4, status, notes, tags)
VALUES (
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
  'Demo client pre-seeded for high-fidelity evaluation of corporate & credit-repair pipelines.',
  '["Premium", "Lead"]'
);

