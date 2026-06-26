-- Seed data for FCRA Supreme Violation Detector
-- Demo organization + admin user (password: demo123)

INSERT OR IGNORE INTO organizations (id, name, slug, plan, max_users, max_clients, max_reports_per_month)
VALUES ('org_demo_001', 'Demo Legal Firm', 'demo-legal-firm', 'pro', 10, 500, 200);

-- Password hash for "demo123" using argon2id
INSERT OR IGNORE INTO users (id, org_id, email, name, password_hash, role)
VALUES ('usr_demo_001', 'org_demo_001', 'demo@example.com', 'Demo Admin', '$argon2id$v=19$m=65536,t=3,p=4$WjfsRirxGbg2rw6qqKkcSA$ARY9s7H8iu3a2t7dClyek1qLg0CrKide6uKyjtK+rrI', 'admin');
