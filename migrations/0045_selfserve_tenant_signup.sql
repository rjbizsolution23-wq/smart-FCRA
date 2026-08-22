-- Self-serve tenant signup — "pay first, auto-provision full branded tenant" pipeline.
-- Flow: public branded signup form (business name, logo, colors, owner info, plan)
-- -> Stripe Checkout -> webhook (checkout.session.completed, metadata.type='tenant_signup')
-- -> provisionTenant() runs automatically -> owner emailed login -> platform owner notified.
--
-- Pending rows hold the branding payload (captured BEFORE payment) keyed by the Stripe
-- Checkout Session id, so the webhook (which only receives the session, not the original
-- form body) can look up exactly what the buyer typed/uploaded and build their tenant with it.

CREATE TABLE IF NOT EXISTS pending_tenant_signups (
  id TEXT PRIMARY KEY,
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | provisioned | failed | expired
  plan TEXT NOT NULL,
  business_name TEXT NOT NULL,
  legal_name TEXT,
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  phone TEXT,
  support_email TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  subdomain TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  logo_base64 TEXT,
  timezone TEXT,
  attribution_mode TEXT DEFAULT 'powered_by',
  org_id TEXT,
  user_id TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  provisioned_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_pending_tenant_signups_session ON pending_tenant_signups(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_pending_tenant_signups_email ON pending_tenant_signups(owner_email, status);
CREATE INDEX IF NOT EXISTS idx_pending_tenant_signups_status ON pending_tenant_signups(status, created_at DESC);
