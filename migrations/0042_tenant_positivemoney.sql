-- Tenant: Positive Money Financial Services
-- Portal: https://positivemoney.smartfcra.com
-- Logo: /static/brand/tenants/positivemoney-logo.png
-- Brand: primary #20234e (navy), secondary #729555 (green)
-- Initial owner: admin@positivemoney.com / PositiveMoney2026! (rotate on first login)
-- Full integrations unlocked (enterprise plan, no per-org gating in code).
-- MFSN: uses platform default affiliate ID (A8289) — no per-org override, per owner instruction "same MFSN as before".
-- AI: BYOK enabled (tenant may add own provider keys in Settings -> AI & Integrations) +
--     100 complimentary AI tokens seeded now (org_ai_credits.balance). Additional 100-token
--     packs purchasable any time for $25 via the existing tokens_100 AI credit pack
--     (repeatable one-time top-up; NOT an auto-recurring monthly subscription).

INSERT OR IGNORE INTO organizations (
  id, name, slug, subdomain, legal_name, plan,
  max_users, max_clients, max_reports_per_month,
  settings, blueprint_version, attribution_mode, timezone,
  provisioned_at, provisioned_by
) VALUES (
  'org_mt3tnhq0csxj74af',
  'Positive Money Financial Services',
  'positive-money-financial-services',
  'positivemoney',
  'Positive Money Financial Services',
  'enterprise',
  1000,
  100000,
  100000,
  '{"blueprint_version":"2026.08.1","company_name":"Positive Money Financial Services","support_email":"support@positivemoney.com","business_phone":"","timezone":"America/New_York","attribution_mode":"powered_by","letterhead":{"firmName":"Positive Money Financial Services","legalName":"Positive Money Financial Services","attorneyName":"Positive Money Financial Services","phone":"","email":"support@positivemoney.com","address":"","city":"","state":"","zip":"","logoUrl":"/static/brand/tenants/positivemoney-logo.png","logoBase64":""},"branding":{"companyName":"Positive Money Financial Services","productName":"Positive Money Financial Services","tagline":"Your credit journey, organized","primary":"#20234e","secondary":"#729555","gold":"#729555","sky":"#20234e","logoUrl":"/static/brand/tenants/positivemoney-logo.png"},"portal":{"welcomeTitle":"Welcome to Positive Money Financial Services","poweredBySmartFcra":true},"integrations":{"mfsn":{"enabled":true}},"portal_url":"https://positivemoney.smartfcra.com"}',
  '2026.08.1',
  'powered_by',
  'America/New_York',
  datetime('now'),
  'system_seed'
);

INSERT OR IGNORE INTO users (
  id, org_id, email, name, password_hash, role, is_active
) VALUES (
  'usr_mt3tnhq7ogci6pe4',
  'org_mt3tnhq0csxj74af',
  'admin@positivemoney.com',
  'Positive Money Admin',
  'pbkdf2$100000$49a55e8d846fb1d849a2286d80367508$36bc1f3cf19460ac3a8eeed241f5e636944b03ad58786f0e8a5222557ce29463',
  'admin',
  1
);

-- 100 complimentary AI tokens to start; free_ai_override = 0 so future usage draws
-- down this balance and the tenant must purchase tokens_100 ($25/100) packs to top up.
INSERT OR IGNORE INTO org_ai_credits (
  org_id, balance, lifetime_purchased, lifetime_used, free_ai_override
) VALUES (
  'org_mt3tnhq0csxj74af',
  100,
  100,
  0,
  0
);

INSERT OR IGNORE INTO saas_entitlements (
  id, email, plan, org_id, status, applied_at
) VALUES (
  'ent_positivemoney_launch',
  'admin@positivemoney.com',
  'enterprise',
  'org_mt3tnhq0csxj74af',
  'applied',
  datetime('now')
);

INSERT OR IGNORE INTO tenant_provision_log (
  id, org_id, action, actor_user_id, detail_json
) VALUES (
  'tpl_positivemoney_seed',
  'org_mt3tnhq0csxj74af',
  'create_business',
  'system_seed',
  '{"subdomain":"positivemoney","ownerEmail":"admin@positivemoney.com","plan":"enterprise","portalUrl":"https://positivemoney.smartfcra.com","mfsnAffiliateId":"platform_default_A8289","aiTokensSeeded":100,"byokEnabled":true}'
);
