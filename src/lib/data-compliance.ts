/**
 * Canonical data inventory, tenant/session persistence helpers, and privacy pack.
 * Source of truth for docs/DATA_AND_COMPLIANCE.md and GET /api/compliance/data-inventory.
 */
export type DataStore = 'd1' | 'r2' | 'kv' | 'localStorage';

export type DataCollection = {
  table: string;
  store: DataStore;
  orgScoped: boolean | 'nullable' | 'n/a';
  pii: boolean;
  purpose: string;
  retention: string;
  backup: 'admin' | 'ops' | 'both' | 'none';
};

/** Every persisted collection the platform owns. */
export const DATA_CATALOG: DataCollection[] = [
  { table: 'organizations', store: 'd1', orgScoped: 'n/a', pii: false, purpose: 'Tenant root (plan, limits, Stripe, settings)', retention: 'Life of tenant + 7 years billing', backup: 'both' },
  { table: 'users', store: 'd1', orgScoped: true, pii: true, purpose: 'Staff and consumer logins, roles, MFA', retention: 'Account life; hashed passwords', backup: 'both' },
  { table: 'sessions', store: 'd1', orgScoped: true, pii: true, purpose: 'Opaque session tokens, IP/UA, last seen, demo isolation', retention: 'Rows kept after revoke/expiry for audit', backup: 'admin' },
  { table: 'session_events', store: 'd1', orgScoped: true, pii: true, purpose: 'Login, logout, MFA, demo enter, fingerprint mismatch', retention: '7 years security audit', backup: 'both' },
  { table: 'clients', store: 'd1', orgScoped: true, pii: true, purpose: 'Consumer CRM identity, consents, FCRA/CROA/TSR flags, legal hold', retention: 'Case life; purge anonymizes unless legal hold', backup: 'both' },
  { table: 'credit_reports', store: 'd1', orgScoped: true, pii: true, purpose: 'Encrypted raw/parsed reports + R2 original pointer', retention: 'Case life; content scrubbed on purge', backup: 'both' },
  { table: 'violations', store: 'd1', orgScoped: true, pii: true, purpose: 'Grounded FCRA/FDCPA findings', retention: 'Case life / litigation', backup: 'both' },
  { table: 'documents', store: 'd1', orgScoped: true, pii: true, purpose: 'Generated letters, e-sign, mail, § 611 clock link', retention: 'Case life / litigation', backup: 'both' },
  { table: 'activity_log', store: 'd1', orgScoped: true, pii: true, purpose: 'Operator actions per tenant', retention: '7 years', backup: 'both' },
  { table: 'security_audit_log', store: 'd1', orgScoped: 'nullable', pii: true, purpose: 'Auth, privacy, vault, backup, rate-limit events', retention: '7 years', backup: 'both' },
  { table: 'privacy_requests', store: 'd1', orgScoped: true, pii: true, purpose: 'CCPA/GDPR export and delete queue', retention: '7 years (kept through purge)', backup: 'both' },
  { table: 'stripe_processed_events', store: 'd1', orgScoped: false, pii: false, purpose: 'Stripe webhook idempotency', retention: '2 years', backup: 'admin' },
  { table: 'email_verification_tokens', store: 'd1', orgScoped: false, pii: true, purpose: 'Email verify secrets', retention: 'Until used or expired (housekeeping deletes)', backup: 'none' },
  { table: 'password_reset_tokens', store: 'd1', orgScoped: false, pii: true, purpose: 'Password reset secrets', retention: 'Until used or expired', backup: 'none' },
  { table: 'mfa_challenges', store: 'd1', orgScoped: false, pii: true, purpose: 'Short-lived MFA login challenges', retention: 'Minutes; housekeeping deletes', backup: 'none' },
  { table: 'mailing_webhook_events', store: 'd1', orgScoped: false, pii: false, purpose: 'Click2Mail delivery webhooks', retention: '2 years', backup: 'admin' },
  { table: 'portal_messages', store: 'd1', orgScoped: true, pii: true, purpose: 'Staff ↔ consumer portal messages', retention: 'Case life; purged on delete', backup: 'both' },
  { table: 'portal_uploads', store: 'd1', orgScoped: true, pii: true, purpose: 'ID/SSN/evidence vault metadata + R2 key', retention: 'Case life; R2 deleted on purge', backup: 'both' },
  { table: 'education_progress', store: 'd1', orgScoped: true, pii: false, purpose: 'Consumer education lessons', retention: 'Case life', backup: 'both' },
  { table: 'tutor_memory', store: 'd1', orgScoped: true, pii: true, purpose: 'AI tutor notes and goals', retention: 'Case life', backup: 'both' },
  { table: 'fundability_snapshots', store: 'd1', orgScoped: true, pii: true, purpose: 'Funding readiness scores', retention: 'Case life', backup: 'both' },
  { table: 'underwriting_snapshots', store: 'd1', orgScoped: true, pii: true, purpose: 'Income/debt/DTI underwriting', retention: 'Case life / 7 years credit', backup: 'both' },
  { table: 'tradeline_orders', store: 'd1', orgScoped: true, pii: true, purpose: 'Authorized-user tradeline checkout', retention: '7 years billing', backup: 'both' },
  { table: 'portal_alerts', store: 'd1', orgScoped: true, pii: true, purpose: 'Email/SMS/in-app notices', retention: '180 days unless legal hold', backup: 'both' },
  { table: 'roadmap_progress', store: 'd1', orgScoped: true, pii: false, purpose: 'Mortgage/auto/student/debt roadmap', retention: 'Case life', backup: 'both' },
  { table: 'client_journey_state', store: 'd1', orgScoped: true, pii: false, purpose: 'Journey phase and streak', retention: 'Case life', backup: 'both' },
  { table: 'daily_motivation_log', store: 'd1', orgScoped: true, pii: false, purpose: 'Daily motivation send log', retention: '2 years', backup: 'both' },
  { table: 'knowledge_chunks', store: 'd1', orgScoped: false, pii: false, purpose: 'Statute/case-law RAG corpus (global)', retention: 'Product life', backup: 'both' },
  { table: 'email_template_registry', store: 'd1', orgScoped: false, pii: false, purpose: 'Lifecycle email template flags', retention: 'Product life', backup: 'both' },
  { table: 'legal_contracts', store: 'd1', orgScoped: true, pii: true, purpose: 'CROA, LPOA, E-SIGN contracts + signatures', retention: '7 years (CROA recordkeeping)', backup: 'both' },
  { table: 'esign_consent_events', store: 'd1', orgScoped: true, pii: true, purpose: 'E-SIGN/UETA disclosure + IP/UA', retention: '7 years', backup: 'both' },
  { table: 'video_conference_sessions', store: 'd1', orgScoped: true, pii: true, purpose: 'Twilio Video rooms + recording key', retention: 'Per recording policy', backup: 'both' },
  { table: 'ron_sessions', store: 'd1', orgScoped: true, pii: true, purpose: 'Remote online notarization journal', retention: 'State RON years (often 7–10)', backup: 'both' },
  { table: 'ron_state_rules', store: 'd1', orgScoped: false, pii: false, purpose: 'State RON eligibility matrix', retention: 'Product life', backup: 'both' },
  { table: 'email_delivery_log', store: 'd1', orgScoped: 'nullable', pii: true, purpose: 'Outbound email status', retention: '2 years', backup: 'both' },
  { table: 'onboarding_drip_log', store: 'd1', orgScoped: true, pii: false, purpose: 'Onboarding drip idempotency', retention: '2 years', backup: 'both' },
  { table: 'scheduled_job_runs', store: 'd1', orgScoped: 'nullable', pii: false, purpose: 'Ops cron run history', retention: '90 days', backup: 'ops' },
  { table: 'email_suppressions', store: 'd1', orgScoped: 'nullable', pii: true, purpose: 'Unsubscribe / TSR do-not-email', retention: 'Indefinite (legal)', backup: 'both' },
  { table: 'newsletter_subscriptions', store: 'd1', orgScoped: true, pii: true, purpose: 'Newsletter opt-in', retention: 'Until unsubscribe + 3 years', backup: 'both' },
  { table: 'newsletter_issues', store: 'd1', orgScoped: true, pii: false, purpose: 'Newsletter issue copy', retention: 'Product life', backup: 'both' },
  { table: 'newsletter_deliveries', store: 'd1', orgScoped: true, pii: true, purpose: 'Per-recipient newsletter status', retention: '2 years', backup: 'both' },
  { table: 'compliance_snapshots', store: 'd1', orgScoped: true, pii: false, purpose: 'Monthly tenant compliance posture', retention: '7 years', backup: 'both' },
  { table: 'ops_alerts', store: 'd1', orgScoped: 'nullable', pii: false, purpose: 'Platform ops alerts', retention: '1 year', backup: 'both' },
  { table: 'tradeline_inventory', store: 'd1', orgScoped: false, pii: false, purpose: 'TradelineMaster cache (global)', retention: 'Refresh daily', backup: 'admin' },
  { table: 'tradeline_inventory_meta', store: 'd1', orgScoped: false, pii: false, purpose: 'Inventory fetch ledger', retention: 'Refresh daily', backup: 'admin' },
  { table: 'tradeline_master_orders', store: 'd1', orgScoped: true, pii: true, purpose: 'Submitted tradeline orders + client JSON', retention: '7 years billing', backup: 'both' },
  { table: 'brand_leads', store: 'd1', orgScoped: 'nullable', pii: true, purpose: 'Public form + demo leads, IP/UA', retention: 'Sales life / 5 years', backup: 'both' },
  { table: 'client_consents', store: 'd1', orgScoped: true, pii: true, purpose: 'Typed GRANT/REVOKE consents', retention: '7 years', backup: 'both' },
  { table: 'service_cancellations', store: 'd1', orgScoped: true, pii: true, purpose: 'CROA cancellation confirmations', retention: '7 years (CROA)', backup: 'both' },
  { table: 'client_attestations', store: 'd1', orgScoped: true, pii: true, purpose: 'Immutable consumer fact statements', retention: 'Case life / litigation', backup: 'both' },
  { table: 'tradeline_snapshots', store: 'd1', orgScoped: true, pii: true, purpose: 'Per-account credit twin', retention: 'Case life', backup: 'both' },
  { table: 'credit_events', store: 'd1', orgScoped: true, pii: true, purpose: 'Append-only credit field diffs', retention: 'Case life', backup: 'both' },
  { table: 'case_findings', store: 'd1', orgScoped: true, pii: true, purpose: 'Cross-bureau findings', retention: 'Case life', backup: 'both' },
  { table: 'portal_disputes', store: 'd1', orgScoped: true, pii: true, purpose: 'Evidence-first dispute files', retention: 'Case life / FCRA', backup: 'both' },
  { table: 'letter_approvals', store: 'd1', orgScoped: true, pii: true, purpose: 'Consumer letter accuracy confirmations', retention: 'Case life / CROA', backup: 'both' },
  { table: 'compliance_decisions', store: 'd1', orgScoped: true, pii: false, purpose: 'ALLOW/BLOCK/MANUAL_REVIEW gate results', retention: '7 years', backup: 'both' },
  { table: 'action_receipts', store: 'd1', orgScoped: true, pii: true, purpose: 'Immutable action confirmation numbers', retention: '7 years', backup: 'both' },
  { table: 'investigation_clocks', store: 'd1', orgScoped: true, pii: false, purpose: 'FCRA § 611 30/35-day clocks', retention: '7 years (kept through purge)', backup: 'both' },
  { table: 'service_records', store: 'd1', orgScoped: true, pii: false, purpose: 'CROA service-performed ledger', retention: '7 years (kept through purge)', backup: 'both' },
  { table: 'billing_ledger', store: 'd1', orgScoped: true, pii: true, purpose: 'Stripe events gated by CROA completion', retention: '7 years (kept through purge)', backup: 'both' },
  { table: 'demo_sessions', store: 'd1', orgScoped: 'nullable', pii: true, purpose: 'CRO interactive demo identity, IP/UA, live-pull cap', retention: 'Expired rows kept (status=expired)', backup: 'both' },
  { table: 'demo_agent_turns', store: 'd1', orgScoped: 'nullable', pii: true, purpose: 'Demo chat transcript', retention: 'With demo session', backup: 'both' },
  { table: 'credit_reports.r2_key', store: 'r2', orgScoped: true, pii: true, purpose: 'Original PDF/JSON report bytes', retention: 'Case life; deleted on privacy purge', backup: 'none' },
  { table: 'portal_uploads.r2_key', store: 'r2', orgScoped: true, pii: true, purpose: 'Vault binaries (ID, evidence)', retention: 'Case life; deleted on privacy purge', backup: 'none' },
  { table: 'video_conference_sessions.recording_r2_key', store: 'r2', orgScoped: true, pii: true, purpose: 'Advisor video recordings', retention: 'Per session policy', backup: 'none' },
  { table: 'backups/d1/*', store: 'r2', orgScoped: false, pii: true, purpose: 'JSON snapshots of D1 tables', retention: 'Operator-defined', backup: 'none' },
  { table: 'RATE_LIMIT_KV', store: 'kv', orgScoped: false, pii: false, purpose: 'Edge rate-limit counters by IP', retention: '60 seconds', backup: 'none' },
  { table: 'fcra_token / fcra_user / fcra_org / fcra_demo_session', store: 'localStorage', orgScoped: false, pii: true, purpose: 'Browser session pointer (not system of record)', retention: 'Until logout / browser clear', backup: 'none' },
];

export const COMPLIANCE_CONTROLS = [
  { id: 'fcra-1681b', law: 'FCRA § 604 / 15 U.S.C. § 1681b', coverage: 'Permissible purpose consent stored on clients and client_consents before ingest', status: 'enforced' },
  { id: 'fcra-611', law: 'FCRA § 611 / 15 U.S.C. § 1681i', coverage: 'investigation_clocks 30-day statutory + 35-day operational on every Click2Mail send', status: 'enforced' },
  { id: 'fcra-605', law: 'FCRA § 605 / 15 U.S.C. § 1681c', coverage: 'DOFD education in report sandbox; no guaranteed-deletion copy', status: 'enforced' },
  { id: 'fcra-609', law: 'FCRA § 609', coverage: 'Consumer file access via portal export + report sandbox (owner-only)', status: 'enforced' },
  { id: 'croa', law: 'CROA 15 U.S.C. § 1679', coverage: 'CROA contract, in-portal cancellation, service_records, billing_ledger gate', status: 'enforced' },
  { id: 'tsr', law: 'TSR 16 CFR 310.4', coverage: 'Advance-fee waiver flag; telemarketed charges evaluated before Stripe unlock', status: 'enforced' },
  { id: 'esign', law: 'E-SIGN 15 U.S.C. § 7001 / UETA', coverage: 'esign_consent_events with disclosure hash, IP, UA, content SHA-256', status: 'enforced' },
  { id: 'ron', law: 'State RON statutes', coverage: 'ron_state_rules + ron_sessions journal and retention_until', status: 'available' },
  { id: 'ccpa', law: 'CCPA/CPRA', coverage: 'privacy_requests export + delete; legal hold; we do not sell personal information', status: 'enforced' },
  { id: 'gdpr', law: 'GDPR Arts. 15–17, 20', coverage: 'Same privacy workflow (access, erasure, portability metadata pack)', status: 'enforced' },
  { id: 'can-spam-tsr-email', law: 'CAN-SPAM / TSR', coverage: 'email_suppressions + newsletter unsubscribe', status: 'enforced' },
  { id: 'aes-gcm', law: 'Security control', coverage: 'AES-256-GCM on report raw/parsed, vault text, MFA secret_enc, DOB/SSN enc columns', status: 'enforced' },
  { id: 'tenancy', law: 'Security control', coverage: 'org_id on tenant tables; brand leads scoped; demo sessions isolated by demo_session_id', status: 'enforced' },
  { id: 'sessions', law: 'Security control', coverage: 'Opaque D1 sessions (not JWT); IP/UA; last_seen; revoke keeps row; security_audit_log + session_events', status: 'enforced' },
  { id: 'legal-hold', law: 'Litigation hold', coverage: 'clients.data_retention_holds blocks delete; admin setter; housekeeping skips held alerts', status: 'enforced' },
  { id: 'backup', law: 'Operational', coverage: 'Admin + ops D1 snapshots to R2 covering catalog backup=admin|ops|both', status: 'enforced' },
  { id: 'headers', law: 'Security control', coverage: 'CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy', status: 'enforced' },
] as const;

export const COMPLIANCE_LIMITATIONS = [
  'Authentication is opaque D1 session tokens, not JWT RS256.',
  'clients.dob and clients.ssn_last4 remain in plaintext for matching; dob_enc / ssn_last4_enc are also written when PII_ENCRYPTION_KEY is set.',
  'users.mfa_secret is dual-written with mfa_secret_enc for TOTP verify compatibility.',
  'email_suppressions uniqueness is global (email+reason), not per tenant.',
  'RATE_LIMIT_KV counters are ephemeral and not in D1 backups.',
  'Admin D1 snapshots include live session token ids — treat backup objects as secret.',
  'Public privacy policy contact for CCPA is email; no guaranteed phone number is published in-app.',
];

export const D1_BACKUP_TABLES: string[] = DATA_CATALOG
  .filter((c) => c.store === 'd1' && (c.backup === 'admin' || c.backup === 'both'))
  .map((c) => c.table)
  .filter((t, i, arr) => arr.indexOf(t) === i && !t.includes('.'));

export const OPS_BACKUP_TABLES: string[] = DATA_CATALOG
  .filter((c) => c.store === 'd1' && (c.backup === 'ops' || c.backup === 'both'))
  .map((c) => c.table)
  .filter((t, i, arr) => arr.indexOf(t) === i && !t.includes('.'));

/** Consumer PII tables deleted on privacy fulfill. Legal ledgers (clocks, service, billing, privacy_requests, audit) are kept. */
export const PRIVACY_PURGE_TABLES = [
  'portal_messages',
  'portal_uploads',
  'portal_alerts',
  'education_progress',
  'tutor_memory',
  'roadmap_progress',
  'fundability_snapshots',
  'underwriting_snapshots',
  'tradeline_orders',
  'violations',
  'documents',
  'client_consents',
  'service_cancellations',
  'client_attestations',
  'tradeline_snapshots',
  'credit_events',
  'case_findings',
  'portal_disputes',
  'letter_approvals',
  'action_receipts',
  'legal_contracts',
  'esign_consent_events',
  'video_conference_sessions',
  'ron_sessions',
  'client_journey_state',
  'daily_motivation_log',
  'tradeline_master_orders',
  'email_delivery_log',
  'onboarding_drip_log',
  'newsletter_subscriptions',
  'newsletter_deliveries',
] as const;

export const PRIVACY_EXPORT_COLLECTIONS: { key: string; sql: string }[] = [
  { key: 'reports', sql: `SELECT id, bureau, report_date, file_name, status, created_at, CASE WHEN r2_key IS NOT NULL THEN 1 ELSE 0 END AS has_original FROM credit_reports WHERE client_id = ? AND org_id = ?` },
  { key: 'violations', sql: `SELECT id, statute, severity, status, created_at FROM violations WHERE client_id = ? AND org_id = ?` },
  { key: 'documents', sql: `SELECT id, doc_type, title, status, created_at FROM documents WHERE client_id = ? AND org_id = ?` },
  { key: 'messages', sql: `SELECT id, sender_role, subject, created_at FROM portal_messages WHERE client_id = ? AND org_id = ?` },
  { key: 'uploads', sql: `SELECT id, category, file_name, created_at, sha256 FROM portal_uploads WHERE client_id = ? AND org_id = ?` },
  { key: 'consents', sql: `SELECT id, consent_type, version, status, accepted_at, revoked_at, created_at FROM client_consents WHERE client_id = ? AND org_id = ?` },
  { key: 'attestations', sql: `SELECT id, question_id, response, created_at FROM client_attestations WHERE client_id = ? AND org_id = ?` },
  { key: 'disputes', sql: `SELECT id, status, recipient, created_at, sent_at FROM portal_disputes WHERE client_id = ? AND org_id = ?` },
  { key: 'letterApprovals', sql: `SELECT id, dispute_id, confirmed_accurate, created_at FROM letter_approvals WHERE client_id = ? AND org_id = ?` },
  { key: 'creditEvents', sql: `SELECT id, event_type, field, bureau, detected_at FROM credit_events WHERE client_id = ? AND org_id = ?` },
  { key: 'findings', sql: `SELECT id, finding_type, severity, status, created_at FROM case_findings WHERE client_id = ? AND org_id = ?` },
  { key: 'clocks', sql: `SELECT id, deadline_type, received_date, calculated_target_date, operational_target_date, status FROM investigation_clocks WHERE client_id = ? AND org_id = ?` },
  { key: 'serviceRecords', sql: `SELECT id, service_type, performed_at, status FROM service_records WHERE client_id = ? AND org_id = ?` },
  { key: 'cancellations', sql: `SELECT id, confirmation_number, status, requested_at, effective_at FROM service_cancellations WHERE client_id = ? AND org_id = ?` },
  { key: 'contracts', sql: `SELECT id, contract_type, status, signature_timestamp, created_at FROM legal_contracts WHERE client_id = ? AND org_id = ?` },
  { key: 'esign', sql: `SELECT id, disclosure_version, consent_granted, created_at FROM esign_consent_events WHERE client_id = ? AND org_id = ?` },
  { key: 'ron', sql: `SELECT id, status, principal_state, created_at, completed_at FROM ron_sessions WHERE client_id = ? AND org_id = ?` },
  { key: 'video', sql: `SELECT id, purpose, status, created_at FROM video_conference_sessions WHERE client_id = ? AND org_id = ?` },
  { key: 'billing', sql: `SELECT id, event_type, amount_cents, decision, status, created_at FROM billing_ledger WHERE client_id = ? AND org_id = ?` },
  { key: 'receipts', sql: `SELECT id, action, confirmation_number, created_at FROM action_receipts WHERE client_id = ? AND org_id = ?` },
  { key: 'privacyRequests', sql: `SELECT id, request_type, status, legal_basis, created_at, fulfilled_at FROM privacy_requests WHERE client_id = ? AND org_id = ?` },
  { key: 'journey', sql: `SELECT phase, streak, focus_goal, motivation_opt_in FROM client_journey_state WHERE client_id = ? AND org_id = ?` },
  { key: 'emails', sql: `SELECT id, status, subject, created_at FROM email_delivery_log WHERE client_id = ? AND org_id = ?` },
];

const R2_KEY_QUERIES: { sql: string; column: string }[] = [
  { sql: `SELECT r2_key AS k FROM credit_reports WHERE client_id = ? AND org_id = ? AND r2_key IS NOT NULL`, column: 'k' },
  { sql: `SELECT r2_key AS k FROM portal_uploads WHERE client_id = ? AND org_id = ? AND r2_key IS NOT NULL`, column: 'k' },
  { sql: `SELECT recording_r2_key AS k FROM video_conference_sessions WHERE client_id = ? AND org_id = ? AND recording_r2_key IS NOT NULL`, column: 'k' },
];

/** Brand / demo lead inbox is platform-owner only — never tenant-admin scoped. */
export function brandLeadsVisibleTo(isPlatformOwner: boolean): 'all' | 'none' {
  return isPlatformOwner ? 'all' : 'none';
}

export function sessionsListScope(session: { demo_session_id?: string | null }) {
  if (session?.demo_session_id) return { mode: 'demo' as const, demoSessionId: session.demo_session_id };
  return { mode: 'staff' as const, demoSessionId: null };
}

export const SQL_ACTIVE_SESSION = `SELECT s.*, u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role, u.is_active, u.org_id, COALESCE(u.must_change_password, 0) as must_change_password, COALESCE(u.mfa_enabled, 0) as mfa_enabled FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now") AND s.revoked_at IS NULL`;

export const SQL_ACTIVE_SESSION_LEGACY = `SELECT s.*, u.id as user_id, u.name as user_name, u.email as user_email, u.role as user_role, u.is_active, u.org_id, COALESCE(u.must_change_password, 0) as must_change_password, COALESCE(u.mfa_enabled, 0) as mfa_enabled FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.id = ? AND s.expires_at > datetime("now")`;

export const SQL_REVOKE_SESSION = `UPDATE sessions SET revoked_at = datetime('now') WHERE id = ? AND user_id = ? AND revoked_at IS NULL`;
export const SQL_REVOKE_OTHERS = `UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND id != ? AND revoked_at IS NULL`;
export const SQL_REVOKE_ALL_USER = `UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`;

type SessionDb = { prepare: (sql: string) => any };

export async function lookupActiveSession(db: SessionDb, sessionId: string) {
  try {
    return await db.prepare(SQL_ACTIVE_SESSION).bind(sessionId).first();
  } catch {
    return await db.prepare(SQL_ACTIVE_SESSION_LEGACY).bind(sessionId).first();
  }
}

export async function insertSessionRow(
  db: SessionDb,
  row: { id: string; userId: string; orgId: string; expires: string; ip: string; ua: string; demoSessionId?: string | null },
) {
  try {
    await db.prepare(
      `INSERT INTO sessions (id, user_id, org_id, expires_at, ip_address, user_agent, last_seen_at, demo_session_id) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
    ).bind(row.id, row.userId, row.orgId, row.expires, row.ip, row.ua, row.demoSessionId || null).run();
  } catch {
    await db.prepare(
      `INSERT INTO sessions (id, user_id, org_id, expires_at, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(row.id, row.userId, row.orgId, row.expires, row.ip, row.ua).run();
  }
}

export async function revokeSessions(
  db: SessionDb,
  opts: { userId: string; sessionId?: string; exceptId?: string; allForUser?: boolean },
) {
  try {
    if (opts.allForUser) {
      await db.prepare(SQL_REVOKE_ALL_USER).bind(opts.userId).run();
    } else if (opts.exceptId) {
      await db.prepare(SQL_REVOKE_OTHERS).bind(opts.userId, opts.exceptId).run();
    } else if (opts.sessionId) {
      await db.prepare(SQL_REVOKE_SESSION).bind(opts.sessionId, opts.userId).run();
    }
  } catch {
    if (opts.allForUser) {
      await db.prepare('DELETE FROM sessions WHERE user_id = ?').bind(opts.userId).run();
    } else if (opts.exceptId) {
      await db.prepare('DELETE FROM sessions WHERE user_id = ? AND id != ?').bind(opts.userId, opts.exceptId).run();
    } else if (opts.sessionId) {
      await db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?').bind(opts.sessionId, opts.userId).run();
    }
  }
}

type D1Like = { prepare: (sql: string) => any };

export async function collectPrivacyExport(
  db: D1Like,
  opts: { orgId: string; client: any; requestId: string; legalBasis: string },
) {
  const collections: Record<string, unknown[]> = {};
  for (const col of PRIVACY_EXPORT_COLLECTIONS) {
    try {
      const rows = await db.prepare(col.sql).bind(opts.client.id, opts.orgId).all();
      collections[col.key] = rows?.results || [];
    } catch {
      collections[col.key] = [];
    }
  }
  try {
    const leads = await db.prepare(
      `SELECT id, form_id, status, created_at FROM brand_leads WHERE org_id = ? AND email = ?`,
    ).bind(opts.orgId, opts.client.email || '').all();
    collections.brandLeads = leads?.results || [];
  } catch {
    collections.brandLeads = [];
  }

  return {
    exportedAt: new Date().toISOString(),
    requestId: opts.requestId,
    legalBasis: opts.legalBasis,
    client: {
      id: opts.client.id,
      first_name: opts.client.first_name,
      last_name: opts.client.last_name,
      email: opts.client.email,
      phone: opts.client.phone,
      city: opts.client.city,
      state: opts.client.state,
      zip: opts.client.zip,
      ssn_last4: opts.client.ssn_last4 || null,
    },
    ...collections,
    notice: 'Raw credit report payloads remain in the encrypted vault for authorized staff. This consumer pack is a metadata inventory plus consent, clock, contract, and case records. Original files are listed as has_original only.',
  };
}

export async function purgeClientRecords(
  env: { DB: D1Like; DOCS?: { delete: (key: string) => Promise<unknown> } },
  opts: { orgId: string; clientId: string; priorEmail?: string | null },
) {
  const r2Deleted: string[] = [];
  for (const q of R2_KEY_QUERIES) {
    try {
      const rows = await env.DB.prepare(q.sql).bind(opts.clientId, opts.orgId).all();
      for (const row of rows?.results || []) {
        const key = (row as any)[q.column];
        if (!key || !env.DOCS) continue;
        try {
          await env.DOCS.delete(key);
          r2Deleted.push(key);
        } catch { /* soft */ }
      }
    } catch { /* table/column may be missing */ }
  }

  const purgedTables: string[] = [];
  for (const table of PRIVACY_PURGE_TABLES) {
    try {
      await env.DB.prepare(`DELETE FROM ${table} WHERE client_id = ? AND org_id = ?`).bind(opts.clientId, opts.orgId).run();
      purgedTables.push(table);
    } catch { /* soft */ }
  }

  try {
    await env.DB.prepare(
      `UPDATE credit_reports SET raw_text = NULL, parsed_data = NULL, file_name = 'REDACTED', status = 'purged', r2_key = NULL WHERE client_id = ? AND org_id = ?`,
    ).bind(opts.clientId, opts.orgId).run();
  } catch { /* soft */ }

  await env.DB.prepare(
    `UPDATE clients SET first_name = 'REDACTED', last_name = 'REDACTED', email = ?, phone = NULL, phone_e164 = NULL,
       address_line1 = NULL, address_line2 = NULL, city = NULL, state = NULL, zip = NULL, dob = NULL, ssn_last4 = NULL,
       ssn_last4_enc = NULL, dob_enc = NULL, notes = 'Purged per privacy request', status = 'purged', updated_at = datetime('now')
     WHERE id = ? AND org_id = ?`,
  ).bind(`purged+${opts.clientId.slice(0, 8)}@privacy.local`, opts.clientId, opts.orgId).run();

  if (opts.priorEmail) {
    try {
      await env.DB.prepare(
        `UPDATE users SET is_active = 0, email = ? WHERE org_id = ? AND role = 'client' AND email = ?`,
      ).bind(`purged+${opts.clientId.slice(0, 8)}@privacy.local`, opts.orgId, opts.priorEmail).run();
    } catch { /* soft */ }
    try {
      await env.DB.prepare(
        `UPDATE brand_leads SET email = ?, phone = NULL, first_name = 'REDACTED', last_name = 'REDACTED', payload_json = '{}', source_ip = NULL, user_agent = NULL, status = 'closed' WHERE org_id = ? AND email = ?`,
      ).bind(`purged+${opts.clientId.slice(0, 8)}@privacy.local`, opts.orgId, opts.priorEmail).run();
    } catch { /* soft */ }
  }

  return { purgedTables, r2Deleted: r2Deleted.length };
}

export async function writeSessionEvent(
  env: { DB: D1Like },
  row: {
    sessionId?: string | null;
    orgId?: string | null;
    userId?: string | null;
    demoSessionId?: string | null;
    eventType: string;
    ip?: string | null;
    ua?: string | null;
    path?: string | null;
    detail?: Record<string, unknown>;
  },
) {
  try {
    await env.DB.prepare(
      `INSERT INTO session_events (id, session_id, org_id, user_id, demo_session_id, event_type, ip_address, user_agent, path, detail_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    ).bind(
      crypto.randomUUID(),
      row.sessionId || null,
      row.orgId || null,
      row.userId || null,
      row.demoSessionId || null,
      row.eventType,
      row.ip || null,
      (row.ua || '').slice(0, 240) || null,
      (row.path || '').slice(0, 200) || null,
      row.detail ? JSON.stringify(row.detail) : null,
    ).run();
  } catch { /* migration 0024 may not be applied yet */ }
}

export function touchSessionActivity(env: { DB: D1Like }, sessionId: string, path: string) {
  return env.DB.prepare(
    `UPDATE sessions SET last_seen_at = datetime('now'), last_path = ? WHERE id = ? AND revoked_at IS NULL`,
  ).bind((path || '').slice(0, 200), sessionId).run().catch(() => {});
}

export function dataInventoryPayload() {
  return {
    product: 'Smart FCRA',
    operator: 'RJ Business Solutions',
    generatedAt: new Date().toISOString(),
    stores: ['d1', 'r2', 'kv', 'localStorage'],
    collections: DATA_CATALOG,
    collectionCount: DATA_CATALOG.length,
    d1BackupTables: D1_BACKUP_TABLES,
    opsBackupTables: OPS_BACKUP_TABLES,
    privacyPurgeTables: PRIVACY_PURGE_TABLES,
    privacyExportCollections: PRIVACY_EXPORT_COLLECTIONS.map((c) => c.key),
    compliance: COMPLIANCE_CONTROLS,
    limitations: COMPLIANCE_LIMITATIONS,
  };
}
