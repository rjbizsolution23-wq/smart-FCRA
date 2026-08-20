-- Multi-tenant subdomain routing + blueprint provisioning
-- Model: newcreditservices.smartfcra.com → organization_id

ALTER TABLE organizations ADD COLUMN subdomain TEXT;
ALTER TABLE organizations ADD COLUMN legal_name TEXT;
ALTER TABLE organizations ADD COLUMN blueprint_version TEXT DEFAULT '2026.08.1';
ALTER TABLE organizations ADD COLUMN attribution_mode TEXT DEFAULT 'powered_by';
ALTER TABLE organizations ADD COLUMN timezone TEXT DEFAULT 'America/New_York';
ALTER TABLE organizations ADD COLUMN provisioned_at TEXT;
ALTER TABLE organizations ADD COLUMN provisioned_by TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organizations_subdomain
  ON organizations(subdomain) WHERE subdomain IS NOT NULL AND subdomain != '';

-- Audit trail for tenant provisioning and config clones
CREATE TABLE IF NOT EXISTS tenant_provision_log (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_user_id TEXT,
  detail_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_tenant_provision_log_org
  ON tenant_provision_log(org_id, created_at DESC);
