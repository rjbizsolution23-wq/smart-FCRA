-- Mail postage wallets: org and client prepaid balances (USD cents).
-- Lob send deducts postage; Stripe Checkout funds wallets or pays per letter.

CREATE TABLE IF NOT EXISTS org_mail_credits (
  org_id TEXT PRIMARY KEY,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased_cents INTEGER NOT NULL DEFAULT 0,
  lifetime_used_cents INTEGER NOT NULL DEFAULT 0,
  postage_comped INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS client_mail_credits (
  org_id TEXT NOT NULL,
  client_id TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  lifetime_purchased_cents INTEGER NOT NULL DEFAULT 0,
  lifetime_used_cents INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, client_id)
);
CREATE INDEX IF NOT EXISTS idx_client_mail_credits_client ON client_mail_credits(client_id);

CREATE TABLE IF NOT EXISTS mail_postage_ledger (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  payer TEXT NOT NULL,
  event_type TEXT NOT NULL,
  mail_class TEXT,
  amount_cents INTEGER NOT NULL,
  balance_after_cents INTEGER,
  document_id TEXT,
  dispute_id TEXT,
  mailing_id TEXT,
  stripe_session_id TEXT,
  actor_user_id TEXT,
  note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mail_postage_ledger_org ON mail_postage_ledger(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mail_postage_ledger_client ON mail_postage_ledger(client_id, created_at DESC);

-- Seed platform demo org with starter postage for sandbox demos
INSERT OR IGNORE INTO org_mail_credits (org_id, balance_cents, lifetime_purchased_cents, postage_comped)
VALUES ('org_demo_001', 5000, 5000, 0);
