-- Paid SaaS entitlements from Stripe Checkout / Payment Links.
-- Pending rows attach to a real org on register/login by email. Demo hosts are never upgraded.
CREATE TABLE IF NOT EXISTS saas_entitlements (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  plan TEXT NOT NULL,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_session_id TEXT,
  org_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  applied_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_saas_entitlements_email_status ON saas_entitlements(email, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saas_entitlements_session ON saas_entitlements(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_saas_entitlements_org ON saas_entitlements(org_id, created_at DESC);
