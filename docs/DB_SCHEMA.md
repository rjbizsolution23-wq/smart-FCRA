# Database schema — Smart FCRA

Canonical table roster, tenancy, retention, and compliance mapping:

**[`docs/DATA_AND_COMPLIANCE.md`](./DATA_AND_COMPLIANCE.md)**  
Code: `src/lib/data-compliance.ts` · migrations `0001`–`0024`

High-signal tables: `organizations`, `users`, `sessions`, `session_events`, `clients`, `credit_reports`, `violations`, `documents`, `activity_log`, `security_audit_log`, `privacy_requests`, `brand_leads`, `client_consents`, `investigation_clocks`, `service_records`, `billing_ledger`, `demo_sessions`.

Sessions are opaque D1 tokens (IP/UA/last-seen). Activity logs are operational (`activity_log`); security events are `security_audit_log`. IP/UA on `activity_log` exist from migration 0024 onward for new optional writes.

Anchor: 2026-08-14 · RJ Business Solutions
