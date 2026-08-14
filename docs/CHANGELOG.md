# Changelog — Smart FCRA · RJ Business Solutions

All notable changes to this project will be documented in this file.

## [3.7.0] - 2026-08-14
### Added
- Gated **interactive sales demo** at `/demo`: work email, phone, business name, and business address required before the app opens. Lead stored + GHL/ops notify.
- In-app popup **product tour** of the full console (ingest, violations, LVS/damages, generated letters, mail clocks, portal, sandbox, tutors, CROA).
- **Demo agent** (text + browser voice) answers product questions and navigates screens. Does not disclose engine internals or promise lawsuit outcomes.
- Optional **one live MyFreeScoreNow report / one person per demo account**. Repeat pulls blocked.
- Migration `0023_demo_experience.sql`.

## [3.6.1] - 2026-08-13
### Changed
- Sales funnel copy: violations / LVS / damages, **generated** letters (no “templates” language), client portal + learning resources, and package cards that state what each tier does for litigation ops.
- In-app Billing plan bullets aligned: generated letters from file facts; removed template wording.

## [3.6.0] - 2026-08-13
### Added
- Public **Smart FCRA by RJ Business Solutions** sales funnel at `/` (`public/static/marketing/index.html`): full-bleed hero, product, compliance posture, SaaS pricing ($497 / $2,500 / $9,997), demo lead form → `POST /api/public/lead/saas-demo`.
- App shell moved to `/login` and `/app`. `/pricing` and `/demo` redirect to landing anchors.

### Changed
- Brand library hub links to the software site and Sign in. Auth flows keep users on `/login` / `/app` instead of the marketing root.

## [3.5.0] - 2026-08-13
### Added
- Original report files stored in R2 (`credit_reports.r2_key`) and opened beside the paper sandbox.
- Upload hygiene: magic-byte allowlist, executable/polyglot block, PDF JavaScript review, OCR-required for image reports. Migration `0022_production_ops.sql`.
- Portal **Mail via Click2Mail** on approved disputes. Persists `investigation_clocks` with FCRA § 611 30-day statutory + 35-day operational (mail buffer) targets.
- CROA Stripe completion ledger (`service_records` writers + `billing_ledger`). Analysis unlock is blocked until analysis is recorded as performed.
- GitHub Actions: PR preview skips Pages deploy with a comment when `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` are missing; production/hotfix fail with an explicit secrets error.

## [3.4.1] - 2026-08-13
### Added
- Interactive report sandbox: consumers open a scrollable paper copy of the imported Experian/Equifax/TransUnion file (accounts, payment history, inquiries, source text) in a scriptless iframe.
- Payment-history legend, hard vs soft inquiry labels, FCRA § 605 DOFD education (no deletion promise), print paper copy, section jump, confidential watermark.
- `GET /api/client-portal/reports` and `GET /api/client-portal/reports/:id` (owner-only, SSN redacted, view audit).
- Staff “Paper sandbox” on report detail. Clients are blocked from the staff `/api/reports/:id` payload (litigation pack).
- CSP `frame-src` allows `about:srcdoc` so the sandbox can render.

### Changed
- My Credit lists imported reports with **Open report**. Confirm-facts can be launched from a tradeline.

## [3.4.0] - 2026-08-13
### Added
- Client portal intelligence: D1 `0021_client_intelligence.sql` (attestations, tradeline snapshots, credit events, findings, disputes, consents, CROA cancellations, compliance decisions, action receipts).
- Evidence-first dispute engine, AI hallucination firewall, next-best-action, utilization education, CROA/TSR billing gate.
- Portal screens: My Credit, Credit Case, Confirm Facts, Disputes, Action Plan, Progress, Consumer Rights, Consents, Billing, **Cancel Services**.
- APIs under `/api/client-portal/intelligence`, attestations, disputes, cancel-services, consents, rights, plus `POST /api/compliance/evaluate`.
- Mobile bottom nav: Home / Credit / Case / Actions / More.
- Identity-theft letter generation and letter-strategy gated on affirmative consumer identification.

### Changed
- Dashboard no longer simulates FICO lifts from “deleting” accounts. Scores show the named model when known.
- Staff impersonation banner states that attestations, approvals, and cancellation are blocked.

## [3.3.0] - 2026-08-13
### Added
- Installable PWA: `/manifest.webmanifest`, `/sw.js` (app-shell cache, never caches `/api`), overlay mobile nav, table scroll, Add to Home Screen.
- Playwright CI gate `tests/login-upload-letter.spec.ts` (login → upload → detect → bureau-dispute letter) plus isolation specs.
- Space Grotesk (OFL Latin subset) embedded in audit and letter PDFs via jsPDF.
- Live Proof and BlueNotary RON adapters with vendor ceremony URLs, HMAC webhook verification, and vendor-driven completion.

### Changed
- CI runs the full Playwright spec set (`testMatch: *.spec.ts`).
- Legal & Notary UI: **Open live ceremony** for Proof/BlueNotary; sandbox seal remains test-only.

## [3.2.0] - 2026-08-13
### Added
- Twilio Video JS join on the client Video page (live room or camera preview).
- Cloudflare Turnstile on all 8 brand forms (`/api/public/turnstile` + siteverify).
- Client Stripe Checkout for analysis unlock (`POST /api/client-portal/unlock/checkout`).
- `GET /api/settings/integrations` for Click2Mail / Twilio / GHL / RON status.
- Per-tenant portal theme (Settings → colors/logo) applied as CSS variables.
- Executive Overview sparkline from last 6 months of paid tradeline orders.

### Changed
- Staff nav: removed duplicate Clients + Report History (history is a Reports action).
- PDF audit/letter headers: Smart FCRA + RJ blue; default firm RJ Business Solutions.
- RON Legal + Compliance Hub: explicit sandbox vs live vendor disclosure.
- `src/frontend/` marked archived (not in production build).

## [3.1.0] - 2026-08-13
### Added
- **Operator catalog**: `docs/FEATURES.md` — every public, staff, client, engine, and integration surface plus finish-up list.
- **Product Map** staff page: in-app feature inventory matching the catalog.
- **Brand Library** staff page restored: RJ tokens, live forms, inbound `brand_leads`.

### Changed
- **Brand consistency**: login, MFSN CTA, legal pages, OpenAPI, mentors, and letterhead copy use **Smart FCRA · RJ Business Solutions** (Space Grotesk + Inter, `#2563eb` / `#0ea5e9`). Removed leftover “FCRA Supreme” chrome from user-facing surfaces.

## [3.0.0] - 2026-04-18
### Added
- **Monetization**: Full Stripe integration with Billing UI and Webhooks.
- **Enterprise Documentation**: Added the 12 essential docs for RJ Business Solutions compliance.
- **Infrastructure**: Automated D1 and Cloudflare deployment configuration.
- **Improved UI**: Glassmorphism shell with litigation scoring visualizations.

## [2.1.0] - 2026-04-17
### Added
- **MFSN Integration**: Production API orchestration for 3-Bureau credit reports.
- **Data Mapping**: Automated mapping from MFSN JSON to internal violation detection engine.

## [2.0.0] - 2026-04-16
### Added
- **Multi-tenancy**: Organization and team management layer.
- **D1 Migration**: Initial schema for multi-tenant SaaS.

## [1.0.0] - 2026-04-12
### Added
- **Core Engine**: Initial rule-based FCRA violation detection.
- **Parser**: Basic text-based credit report parsing.
