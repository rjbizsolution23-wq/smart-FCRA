# Smart FCRA — Data catalog and compliance coverage

**Product:** Smart FCRA  
**Operator:** RJ Business Solutions  
**Stores:** Cloudflare D1 (system of record), R2 `DOCS` (binaries + backups), Workers KV (rate-limit counters only), browser `localStorage` (session pointer, not the record)  
**Live inventory API:** `GET /api/compliance/data-inventory` (staff)  
**Source of truth in code:** `src/lib/data-compliance.ts` + `migrations/0001`–`0039`

This document lists **every collection the platform stores**, **how tenants and sessions are isolated**, and **which laws those records satisfy**. It is an operator map, not marketing copy.

---

## 1. How tenant and session data is stored

| Rule | Implementation |
|---|---|
| Every tenant is an `organizations` row | Staff, consumers, reports, letters, consents, clocks, billing all carry `org_id` |
| Sessions are opaque D1 tokens (not JWT) | `sessions.id` is a 32-byte hex token; auth joins `sessions` → `users` |
| Session rows are **kept** after logout or expiry | `revoked_at` is set; housekeeping does **not** delete session history |
| Last activity is stored | `sessions.last_seen_at`, `sessions.last_path` on each authenticated request |
| Login / logout / MFA / demo enter are stored twice | `session_events` (lifecycle) + `security_audit_log` (security) |
| Shared demo host (`usr_demo_001`) does not leak visitors | `sessions.demo_session_id`; list/revoke scoped to that demo only |
| Public leads belong to the signup org | `brand_leads.org_id`; tenant `admin` sees **own org only**; `super_admin` sees all |
| Demo gate stores identity + network | `demo_sessions` email, phone, firm, `org_id`, `source_ip`, `user_agent`; chat in `demo_agent_turns` with `org_id` |
| Expired demos are marked, not erased | Housekeeping sets `demo_sessions.status = 'expired'` |

Apply D1 migration **`0024_tenant_session_compliance.sql`** (after 0021–0023) for the new columns and `session_events`.

---

## 2. Data catalog (every store)

| Collection | Store | Tenant | PII | Purpose | Retention |
|---|---|---|---|---|---|
| `organizations` | D1 | root | light | Tenant plan, limits, Stripe, settings | Life of tenant + 7 years billing |
| `users` | D1 | yes | yes | Logins, roles, MFA | Account life; password hashes |
| `sessions` | D1 | yes | yes | Token, IP/UA, last seen, demo id, revoke | Kept after revoke/expiry |
| `session_events` | D1 | yes | yes | login, logout, MFA, demo enter, fingerprint mismatch | 7 years |
| `clients` | D1 | yes | **heavy** | Identity, FCRA/CROA/TSR flags, legal hold | Case life; anonymize on purge unless hold |
| `credit_reports` | D1 | yes | **heavy** | AES-GCM raw/parsed + R2 pointer | Case life; content scrubbed on purge |
| `violations` | D1 | yes | yes | Grounded FCRA/FDCPA findings | Case / litigation |
| `documents` | D1 | yes | yes | Generated letters, e-sign, mail, § 611 link | Case / litigation |
| `activity_log` | D1 | yes | yes | Operator actions | 7 years |
| `security_audit_log` | D1 | nullable | yes | Auth, privacy, vault, backup | 7 years |
| `privacy_requests` | D1 | yes | yes | CCPA/GDPR export & delete queue | 7 years (kept through purge) |
| `stripe_processed_events` | D1 | no | no | Stripe idempotency | 2 years |
| `email_verification_tokens` | D1 | via user | yes | Email verify secrets | Until used/expired (deleted) |
| `password_reset_tokens` | D1 | via user | yes | Reset secrets | Until used/expired (deleted) |
| `mfa_challenges` | D1 | via user | yes | Short MFA login challenges | Minutes (deleted) |
| `mailing_webhook_events` | D1 | no | possible | Mailing vendor (Lob primary, Click2Mail legacy) status webhooks | 2 years |
| `org_mail_credits` | D1 | yes | no | Org prepaid postage wallet, comped flag, card-on-file/unlock state | Life of tenant |
| `client_mail_credits` | D1 | yes | no | Client prepaid postage wallet | Case life |
| `mail_postage_ledger` | D1 | yes | light | Postage purchase/charge audit trail (payer, mail class, amount, balance after) | 7 years billing |
| `portal_messages` | D1 | yes | yes | Staff ↔ consumer messages | Case life |
| `portal_uploads` | D1 | yes | **heavy** | Vault metadata + R2 key | Case life; R2 deleted on purge |
| `education_progress` | D1 | yes | light | Lessons | Case life |
| `tutor_memory` | D1 | yes | yes | Tutor notes | Case life |
| `fundability_snapshots` | D1 | yes | yes | Funding scores | Case life |
| `underwriting_snapshots` | D1 | yes | **financial** | Income/debt/DTI | 7 years credit |
| `tradeline_orders` | D1 | yes | yes | AU tradeline checkout | 7 years billing |
| `portal_alerts` | D1 | yes | yes | Email/SMS/in-app | 180 days unless legal hold |
| `roadmap_progress` | D1 | yes | light | Goal roadmaps | Case life |
| `client_journey_state` | D1 | yes | light | Phase / streak | Case life |
| `daily_motivation_log` | D1 | yes | light | Motivation sends | 2 years |
| `knowledge_chunks` | D1 | global | no | Statute/case-law RAG | Product life |
| `email_template_registry` | D1 | global | no | Template flags | Product life |
| `legal_contracts` | D1 | yes | **contracts + sig** | CROA, LPOA, E-SIGN | 7 years CROA |
| `esign_consent_events` | D1 | yes | yes | Disclosure hash, IP/UA | 7 years |
| `video_conference_sessions` | D1 | yes | yes | Twilio Video + recording key | Per recording policy |
| `ron_sessions` | D1 | yes | **ID + notary** | RON journal | State years (often 7–10) |
| `ron_state_rules` | D1 | global | no | RON eligibility | Product life |
| `email_delivery_log` | D1 | nullable | yes | Outbound email status | 2 years |
| `onboarding_drip_log` | D1 | yes | no | Drip idempotency | 2 years |
| `scheduled_job_runs` | D1 | nullable | no | Cron history | 90 days |
| `email_suppressions` | D1 | nullable | yes | Unsubscribe / do-not-email | Indefinite (legal) |
| `newsletter_subscriptions` | D1 | yes | yes | Newsletter opt-in | Until unsub + 3 years |
| `newsletter_issues` | D1 | yes | no | Issue copy | Product life |
| `newsletter_deliveries` | D1 | yes | yes | Per-recipient status | 2 years |
| `compliance_snapshots` | D1 | yes | no | Monthly posture | 7 years |
| `ops_alerts` | D1 | nullable | no | Ops alerts | 1 year |
| `tradeline_inventory` | D1 | global | no | TradelineMaster cache | Daily refresh |
| `tradeline_inventory_meta` | D1 | global | no | Fetch ledger | Daily refresh |
| `tradeline_master_orders` | D1 | yes | yes | Submitted orders + client JSON | 7 years billing |
| `brand_leads` | D1 | nullable | yes | Public forms + demo, IP/UA | Sales / 5 years |
| `client_consents` | D1 | yes | yes | Typed GRANT/REVOKE | 7 years |
| `service_cancellations` | D1 | yes | yes | CROA cancel confirmations | 7 years CROA |
| `client_attestations` | D1 | yes | yes | Immutable fact statements | Case / litigation |
| `tradeline_snapshots` | D1 | yes | **credit** | Per-account twin | Case life |
| `credit_events` | D1 | yes | yes | Append-only diffs | Case life |
| `case_findings` | D1 | yes | yes | Cross-bureau findings | Case life |
| `portal_disputes` | D1 | yes | yes | Evidence-first disputes | Case / FCRA |
| `letter_approvals` | D1 | yes | yes | Letter accuracy confirms | Case / CROA |
| `compliance_decisions` | D1 | yes | light | ALLOW/BLOCK/MANUAL_REVIEW | 7 years |
| `action_receipts` | D1 | yes | yes | Confirmation numbers | 7 years |
| `investigation_clocks` | D1 | yes | dates | FCRA § 611 30/35-day clocks | 7 years (**kept on purge**) |
| `service_records` | D1 | yes | light | CROA service performed | 7 years (**kept on purge**) |
| `billing_ledger` | D1 | yes | yes | Stripe + CROA gate | 7 years (**kept on purge**) |
| `demo_sessions` | D1 | nullable | yes | CRO demo identity + live-pull cap | Expired rows kept |
| `demo_agent_turns` | D1 | nullable | yes | Demo chat transcript | With demo session |
| `credit_reports.r2_key` | R2 | yes | **file** | Original PDF/JSON | Deleted on privacy purge |
| `portal_uploads.r2_key` | R2 | yes | **file** | ID / evidence binaries | Deleted on privacy purge |
| `video_conference_sessions.recording_r2_key` | R2 | yes | **file** | Video recordings | Per session policy |
| `backups/d1/*` | R2 | platform | yes | JSON D1 snapshots | Operator-defined |
| `RATE_LIMIT_KV` | KV | no | no | IP rate-limit counters | 60 seconds |
| `fcra_token` etc. | localStorage | no | yes | Browser pointer only | Logout / clear site data |

There are **no** tables named `credit_accounts`, `consent_records`, `mfsn_members`, `ghl_sync_log`, `audit_logs`, or `refresh_tokens`. Closest maps: tradelines live in `parsed_data` / `tradeline_snapshots`; consents in `client_consents` + client flags; MFSN on `clients`; audit in `activity_log` + `security_audit_log`; sessions are D1 rows.

---

## 3. Compliance coverage

| Control | Law / rule | What is stored | Status |
|---|---|---|---|
| Permissible purpose | FCRA § 604 / 15 U.S.C. § 1681b | `clients.permissible_purpose_consent`, `client_consents` | Enforced at ingest |
| Reinvestigation clocks | FCRA § 611 / 15 U.S.C. § 1681i | `investigation_clocks` 30-day statutory + 35-day operational | Enforced on every Lob send (Click2Mail legacy fallback) |
| Obsolete / DOFD education | FCRA § 605 / 15 U.S.C. § 1681c | Report sandbox education; **no guaranteed-deletion copy** | Enforced |
| File disclosure | FCRA § 609 | Portal report sandbox + privacy export | Enforced |
| Credit repair contract + cancel | CROA 15 U.S.C. § 1679 | `legal_contracts`, `service_cancellations`, `service_records`, `billing_ledger` | Enforced |
| Advance-fee telemarketing | TSR 16 CFR 310.4 | `clients.tsr_advance_fee_waived`; billing eval | Enforced |
| Electronic signatures | E-SIGN 15 U.S.C. § 7001 / UETA | `esign_consent_events` (hash, IP, UA, intent) | Enforced |
| Remote online notarization | State RON statutes | `ron_state_rules`, `ron_sessions` journal + `retention_until` | Available (vendor-keyed) |
| Access / delete / portability | CCPA/CPRA + GDPR Arts. 15–17, 20 | `privacy_requests`; export pack; admin purge + R2 delete | Enforced |
| Do-not-email | CAN-SPAM / TSR | `email_suppressions`, newsletter unsubscribe | Enforced |
| Litigation hold | Common-law / discovery | `clients.data_retention_holds`; `POST /api/admin/clients/:id/legal-hold` | Enforced |
| Encryption at rest | Security | AES-256-GCM on report text, vault text, MFA `mfa_secret_enc`, `dob_enc` / `ssn_last4_enc` | Enforced when `PII_ENCRYPTION_KEY` set |
| Tenant isolation | Security | `org_id` filters; brand-lead scope; demo session scope | Enforced |
| Session audit | Security | IP/UA, last seen, `session_events`, `GET /api/security/audit-log` | Enforced |
| Backups | Operational | Admin + ops snapshots to R2 (`D1_BACKUP_TABLES` / `OPS_BACKUP_TABLES`) | Enforced |
| HTTP hardening | Security | CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy | Enforced |

### Privacy export pack (consumer)

Metadata + case records, **org-scoped**: reports, violations, documents, messages, uploads, consents, attestations, disputes, letter approvals, credit events, findings, § 611 clocks, service records, CROA cancellations, contracts, E-SIGN events, RON, video, billing ledger, receipts, privacy requests, journey, email log, brand leads for that email.

Raw bureau payloads stay in the encrypted vault; the pack lists `has_original` only.

### Privacy purge (admin fulfill)

Deletes consumer PII tables listed in `PRIVACY_PURGE_TABLES`, scrubs `credit_reports` text, **deletes R2 originals**, anonymizes the `clients` row, disables the portal login, redacts matching `brand_leads`. **Keeps** `investigation_clocks`, `service_records`, `billing_ledger`, `privacy_requests`, `activity_log`, and `security_audit_log` as legal stubs. Blocked when `data_retention_holds = 1`.

---

## 4. Honest limitations (do not claim otherwise)

- Auth is **opaque D1 sessions**, not JWT RS256.
- `clients.dob` and `clients.ssn_last4` are still stored in plaintext for matching; encrypted copies are also written when the PII key is set.
- `users.mfa_secret` is dual-written with `mfa_secret_enc` so TOTP verify still works.
- `email_suppressions` uniqueness is **global** (email + reason), not per tenant.
- KV rate-limit counters are not in D1 backups.
- Admin D1 snapshots include **live session token ids** — treat backup objects as secret.
- This product is **not** a HIPAA covered entity and does not claim SOC 2 / ISO 27001 certification in code.

---

## 5. Operator checklist

1. Apply D1 migrations through **0024**.
2. Set `PII_ENCRYPTION_KEY` (≥ 32 chars) on Pages.
3. Bind D1 `DB`, R2 `DOCS`, KV `RATE_LIMIT_KV`.
4. Staff: `GET /api/compliance/data-inventory` and `GET /api/security/audit-log`.
5. Legal hold before litigation: `POST /api/admin/clients/:id/legal-hold` `{ "hold": true, "reason": "…" }`.
6. Consumer rights: portal export / delete-request; admin fulfill after review.
