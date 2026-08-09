-- TradelineMaster live inventory cache + RJ order pipeline
CREATE TABLE IF NOT EXISTS tradeline_inventory (
  id INTEGER PRIMARY KEY,
  lender TEXT NOT NULL,
  spots_available INTEGER NOT NULL DEFAULT 0,
  credit_limit REAL NOT NULL DEFAULT 0,
  cycles INTEGER NOT NULL DEFAULT 0,
  date_opened TEXT,
  statement_date TEXT,
  posting_date TEXT,
  cardholder_address_id INTEGER,
  wholesale_price REAL NOT NULL,
  retail_price REAL NOT NULL,
  markup_rate REAL NOT NULL DEFAULT 0.125,
  statement_day INTEGER,
  posting_day INTEGER,
  account_age_label TEXT,
  posting_window_label TEXT,
  raw_json TEXT,
  fetched_at DATETIME NOT NULL,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tl_inv_lender ON tradeline_inventory(lender);
CREATE INDEX IF NOT EXISTS idx_tl_inv_stmt ON tradeline_inventory(statement_day);
CREATE INDEX IF NOT EXISTS idx_tl_inv_price ON tradeline_inventory(retail_price);
CREATE INDEX IF NOT EXISTS idx_tl_inv_limit ON tradeline_inventory(credit_limit);

CREATE TABLE IF NOT EXISTS tradeline_inventory_meta (
  id TEXT PRIMARY KEY DEFAULT 'default',
  last_fetched_at DATETIME,
  last_fetch_ok INTEGER DEFAULT 0,
  last_count INTEGER DEFAULT 0,
  last_error TEXT,
  ledger_balance REAL,
  ledger_user TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tradeline_master_orders (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  client_id TEXT,
  created_by TEXT,
  tradeline_id INTEGER NOT NULL,
  lender TEXT,
  credit_limit REAL,
  wholesale_price REAL,
  retail_price REAL,
  cycles INTEGER,
  status TEXT NOT NULL DEFAULT 'quote', -- quote | awaiting_payment | submitted | approved | declined | invalid | cancelled
  tlm_order_id INTEGER,
  tlm_status INTEGER,
  tlm_message TEXT,
  client_json TEXT NOT NULL,
  credit_portal_json TEXT,
  impact_json TEXT,
  notes TEXT,
  payment_email_sent INTEGER DEFAULT 0,
  placed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);
CREATE INDEX IF NOT EXISTS idx_tlm_orders_org ON tradeline_master_orders(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tlm_orders_client ON tradeline_master_orders(client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tlm_orders_status ON tradeline_master_orders(status);
