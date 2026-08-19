-- Platform extensions: BYOK AI, AI credits, payment gateways, Zoom, custom contracts

CREATE TABLE IF NOT EXISTS org_ai_providers (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  use_platform_fallback INTEGER NOT NULL DEFAULT 1,
  config_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, provider_id)
);
CREATE INDEX IF NOT EXISTS idx_org_ai_providers_org ON org_ai_providers(org_id);

CREATE TABLE IF NOT EXISTS org_ai_credits (
  org_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 500,
  lifetime_purchased INTEGER NOT NULL DEFAULT 0,
  lifetime_used INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS org_ai_usage (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT,
  provider TEXT,
  model TEXT,
  tokens_est INTEGER DEFAULT 0,
  credits_charged INTEGER NOT NULL DEFAULT 1,
  feature TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_org_ai_usage_org ON org_ai_usage(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS org_payment_gateways (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  gateway TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  is_default INTEGER NOT NULL DEFAULT 0,
  config_json TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(org_id, gateway)
);
CREATE INDEX IF NOT EXISTS idx_org_payment_gateways_org ON org_payment_gateways(org_id);

CREATE TABLE IF NOT EXISTS org_contract_templates (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  template_type TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  body_text TEXT,
  r2_key TEXT,
  content_hash TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_org_contract_templates_org ON org_contract_templates(org_id, template_type);

CREATE TABLE IF NOT EXISTS org_zoom_connections (
  org_id TEXT PRIMARY KEY,
  account_id TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  config_json TEXT DEFAULT '{}',
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Seed demo org with starter AI credits for sales sandbox
INSERT OR IGNORE INTO org_ai_credits (org_id, balance, lifetime_purchased, lifetime_used)
VALUES ('org_demo_001', 2500, 2500, 0);
