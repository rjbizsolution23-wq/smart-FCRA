-- Comped enterprise tenant: 1028 Wealth Management
-- Portal: https://1028wealth.smartfcra.com
-- Logo: /static/brand/tenants/1028wealth-logo.svg
-- Brand: primary #FF8C00, accent #FF4D00
-- Initial owner: owner@1028wealth.com (password set via provision script or admin reset)

INSERT OR IGNORE INTO organizations (
  id, name, slug, subdomain, legal_name, plan,
  max_users, max_clients, max_reports_per_month,
  settings, blueprint_version, attribution_mode, timezone,
  provisioned_at, provisioned_by
) VALUES (
  'org_1028wealth_001',
  '1028 Wealth Management',
  '1028-wealth-management',
  '1028wealth',
  '1028 Wealth Management',
  'enterprise',
  1000,
  100000,
  100000,
  '{"blueprint_version":"2026.08.1","billing_comped":true,"company_name":"1028 Wealth Management","support_email":"support@smartfcra.com","timezone":"America/New_York","attribution_mode":"powered_by","portal_url":"https://1028wealth.smartfcra.com","letterhead":{"firmName":"1028 Wealth Management","legalName":"1028 Wealth Management","attorneyName":"1028 Wealth Management","phone":"","email":"support@smartfcra.com","address":"","city":"","state":"","zip":"","logoUrl":"/static/brand/tenants/1028wealth-logo.svg"},"branding":{"companyName":"1028 Wealth Management","productName":"1028 Wealth Management","tagline":"Building generational wealth","primary":"#FF8C00","secondary":"#FF4D00","gold":"#FF4D00","sky":"#FF8C00","logoUrl":"/static/brand/tenants/1028wealth-logo.svg"},"portal":{"welcomeTitle":"Welcome to 1028 Wealth Management","poweredBySmartFcra":true}}',
  '2026.08.1',
  'powered_by',
  'America/New_York',
  datetime('now'),
  'system_seed'
);

INSERT OR IGNORE INTO users (
  id, org_id, email, name, password_hash, role, is_active
) VALUES (
  'usr_1028wealth_admin',
  'org_1028wealth_001',
  'owner@1028wealth.com',
  '1028 Wealth Admin',
  'pbkdf2$100000$9ded5ff8b462ab876495377355efad38$d0020e4d180c4e23935d80cf2c2a61375fb8c18de2f788dca43bb8408f269810',
  'admin',
  1
);

INSERT OR IGNORE INTO org_ai_credits (
  org_id, balance, lifetime_purchased, lifetime_used, free_ai_override
) VALUES (
  'org_1028wealth_001',
  500000,
  500000,
  0,
  1
);

INSERT OR IGNORE INTO saas_entitlements (
  id, email, plan, org_id, status, applied_at
) VALUES (
  'ent_1028wealth_comp',
  'owner@1028wealth.com',
  'enterprise',
  'org_1028wealth_001',
  'applied',
  datetime('now')
);

INSERT OR IGNORE INTO tenant_provision_log (
  id, org_id, action, actor_user_id, detail_json
) VALUES (
  'tpl_1028wealth_seed',
  'org_1028wealth_001',
  'create_business',
  'system_seed',
  '{"subdomain":"1028wealth","ownerEmail":"owner@1028wealth.com","plan":"enterprise","portalUrl":"https://1028wealth.smartfcra.com","comped":true,"freeAiOverride":true}'
);
