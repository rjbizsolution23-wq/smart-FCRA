# Smart FCRA — Complete product catalog

**Product:** Smart FCRA  
**Operator:** RJ Business Solutions  
**Live:** https://smart-fcra-v2.pages.dev  
**SPA:** `public/static/app.js` · **API:** `src/index.tsx` (Hono on Cloudflare Workers) · **DB:** D1

This is the operator map of **everything the app does today**, plus **what is still unfinished**. Use it to finish the product, not as marketing copy.

---

## 1. Who it is for

| Audience | How they get in | What they see |
|---|---|---|
| **Staff / admin / super_admin** | Email + password, MFA, demo `demo@example.com` | Full ops console: clients, reports, violations, letters, mailing, tradelines, brand library, billing, admin |
| **Client (consumer)** | Invite, register, MFSN signup, or demo `salisha.mcdowell@example.com` | Client portal: cockpit, journey, vault, fundability, tradelines, tutors, documents |
| **Public visitor** | No login | Login, register, forgot password, MFSN signup (`/?signup=mfsn`), brand forms (`/forms/*`), `/brand`, legal pages, API docs |
| **Partner / GHL / MFSN** | Webhooks + affiliate links | Inbound leads, MFSN members, CRM sync |

---

## 2. Public surfaces (no staff session)

| URL / entry | What it does |
|---|---|
| `/` | SPA shell. Login by default. `?signup=mfsn` opens MFSN partner signup. Hash routes after login (`#dashboard`, `#client-cockpit`, …). |
| `/login` `/register` `/forgot-password` `/reset-password` `/verify-email` `/mfa` | Auth screens |
| `/brand` | RJ Business Solutions brand library hub (69 assets: forms, marketing, legal, ops, founder) |
| `/forms/credit-qualify` | Interactive credit / dispute qualification |
| `/forms/funding-qualify` | Business funding qualification |
| `/forms/universal-funnel` | Combined credit + funding + consulting |
| `/forms/service-intake` | Service selection + payment intent |
| `/forms/growth-audit` | 12-question growth audit |
| `/forms/whitelabel` | White-label partner application |
| `/forms/partnership` | JV / referral / affiliate application |
| `/forms/podcast-guest` | 100 Millionaires Club podcast booking |
| `POST /api/public/lead/:formId` | Saves lead to D1 `brand_leads`, emails ops, upserts GHL |
| `/legal/terms` `/legal/privacy` `/compliance/disclaimers` | Public legal |
| `/api/docs` | OpenAPI 3.1 |
| `/api/health` `/api/health/ready` | Liveness / readiness |
| `/api/security/trust-center` | Public security posture |
| MFSN CTA | `https://myfreescorenow.com/?A_AID=A8289` affiliate |

**Demo logins (staff-seeded):**  
- Staff: `demo@example.com` / `demo123456`  
- Client: `salisha.mcdowell@example.com` / `demo123456` (Salisha McDowell)

---

## 3. Staff navigation (what operators click)

Defined in `window._nav` in `public/static/app.js`.

| Nav id | Page | What it does |
|---|---|---|
| `search` | Global search | Clients, reports, documents |
| `exec-overview` | Executive Overview | KPIs, pipeline, last-6-month revenue sparkline from paid tradeline orders |
| `admin-clients` | Client Management | Staff client list + create |
| `violation-review` | Violation Review QA | Approve / reject engine findings |
| `dashboard` | Dashboard | Staff home, alerts, quick stats |
| `clients` | Clients | Second client list (legacy; overlaps admin-clients) |
| `reports` | Reports | Credit report list + upload |
| `report-history` | Report History | Version history |
| `violations` | Violations | Org-wide violation queue |
| `documents` | Documents | Generated letters / PDFs |
| `compliance` | Compliance Hub | Disclaimers, consent, legal status |
| `mailing` | Mailing Campaigns | Click2Mail / certified campaigns |
| `founder-os` | Founder OS | Owner operating system |
| `sales-tools` | Sales Tools | ROI, pitch, close tools |
| `tradelines` | Tradelines | TradelineMaster inventory, filters, cart, order, smart match, GHL sync |
| `brand-library` | Brand Library | Forms, colors, copy, recent inbound leads |
| `product-map` | Product map | In-app catalog of every feature + finish-up list |
| `roi-calculator` | ROI Calculator | Deal math |
| `team` | Team | Users, roles, invites |
| `settings` | Settings | Integrations (GHL, MFSN, Twilio, Stripe, Click2Mail, TradelineMaster), security, brand |
| `ai-studio` | AI Studio | Mentors, prompts, usage |
| `billing` | Billing | Org Stripe, plans, invoices |
| `legal` | Legal | In-app terms / privacy / disclaimers |
| `admin` | Admin Console | Super-admin only: orgs, users, flags, health |

**Hidden staff routes (not in sidebar, still in `showPage`):**  
`client-detail`, `report-detail`, `full-analysis`, `report-comparison`, `onboarding-wizard`, `upload-report`, `generate-doc`.

---

## 4. Client portal (consumer)

Shown when `isClient` is true. Analysis / letters stay **locked** until staff runs `POST /api/clients/:id/unlock-analysis`.

| Nav id | Page | What it does |
|---|---|---|
| `client-cockpit` | Dashboard | Named-model scores, next-best action, result taxonomy, credit health, recent events. **No deletion/score-lift simulator.** |
| `client-credit` | My Credit | Tri-bureau compare, utilization (educational), credit event ledger |
| `client-case` | My Credit Case | Disputes, findings (not auto-labeled as FCRA violations), action receipts |
| `client-attest` | Confirm Facts | Structured interview; immutable attestations; identity-theft gate |
| `client-disputes` | Disputes | Evidence-first drafts; client approval required; staff impersonation cannot approve |
| `client-actions` | Action Plan | One primary consumer action |
| `client-progress` | Progress | Measured report-to-report changes |
| `client-rights` | Consumer Rights | FCRA / CROA / TSR / FDCPA / identity-theft education |
| `client-consents` | Consents | Separate grants/revokes (not a single T&C checkbox) |
| `client-billing` | Billing | Current/completed services; cancel link |
| `client-cancel` | Cancel Services | CROA cancellation in-portal (not buried in support) |
| `client-journey` | My Journey | 6-stage pipeline (New → Funded) |
| `onboarding-wizard` | Get Started | Intake wizard |
| `messages` | Messages | Client ↔ staff |
| `client-vault` | Documents / Vault | ID, SSN card, proof of address, reports (R2) |
| `client-fundability` | Readiness | Deterministic fundability score + lender matches |
| `client-boost` | Boost Tools | Educational tradeline / utilization guidance |
| `client-tradelines` | AU Tradelines | Client-facing TradelineMaster catalog + match + order request |
| `client-tutor` | Credit Tutor | Scripted Alex Rivera tutor |
| `client-documents` | Letters | Their letters / PDFs |
| `client-legal` | Legal & Notary | RON session request (sandbox unless live notary keys) |
| `client-video` | Video Consultation | Twilio Video JS join |
| `client-education` | Academy | Articles / lessons |
| `client-security` | Privacy & Security | Password, MFA, sessions, privacy export/delete, cancel link |
| `ai-mentors` | AI Mentors | Rick / Alex / Maya / Jordan chat (free-only AI cascade) |

---

## 5. Credit report & violation engine (core product)

### Ingest
- Upload PDF / XML / JSON credit reports (Experian / Equifax / TransUnion / tri-merge).
- Parse into `credit_reports` + `credit_accounts`.
- Store files in R2. Encrypt PII at rest.

### Engines (`src/engine/`)
| Module | Job |
|---|---|
| `violations.ts` + `fcra.ts` `fdcpa.ts` `ecoa.ts` `metro2.ts` `state.ts` `bankruptcy.ts` | Detect reportable issues |
| `fact-check.ts` | Cross-check findings |
| `lvs.ts` | Legal Vulnerability Score |
| `damages.ts` | Statutory / actual damage estimates |
| `documents.ts` | ~45 letter types (dispute, 623, method of verification, C&D, intent to sue, …) |
| `dispute-attestation.ts` | Structured fact interview; no fabricated reasons; identity-theft gate |
| `hallucination-firewall.ts` | Source-tagged assertions; blocks guaranteed-outcome copy and ID-theft injection |
| `credit-events.ts` | Digital twin diffs + result taxonomy (DELETED vs CORRECTED vs BALANCE_CHANGE, …) |
| `next-best-action.ts` | One primary consumer action + case stage |
| `metro2-findings.ts` | Cross-bureau variance as REVIEW/OBSERVATION — never auto “FCRA VIOLATION” |
| `utilization.ts` | Educational utilization targets (no score guarantee) |
| `letter-strategy.ts` | Which letter, which bureau, which round |
| `pdf-letterhead.ts` | Branded PDF output |
| `fundability.ts` | Business / consumer fundability |
| `tradeline-matcher.ts` | Educational AU match (not a score guarantee) |
| `scoring.ts` | Internal scores |
| `consent.ts` `gdpr.ts` `retention.ts` | Privacy / retention |

Staff flow: upload → parse → detect → **QA review** (`violation-review`) → generate letters → mail (Click2Mail) or client download.

---

## 6. Integrations (live wiring)

| System | What Smart FCRA does with it |
|---|---|
| **GoHighLevel** | Upsert contacts with **full custom-field map** (`ghl-custom-fields.ts`) + tags (`ghl-tags.ts`). Sync on login, MFSN signup, brand forms, client create, tradeline interest. Bulk: `POST /api/integrations/ghl/sync-crm-clients`, `sync-mfsn-members`. |
| **MyFreeScoreNow** | Public signup + staff partner form. Affiliate `A8289`. Requires live `MAPIK#` token. Members stored in `mfsn_members`. Analysis **locked** until staff unlock. Daily/ops cron can poll. |
| **TradelineMaster** | Live inventory `GET https://api.tradeline.master/v1/inventory`. **12.5% markup** on client price. Filters (bureau, slots, price, age, limit). Cart + `POST /api/tradelines/orders` + email `tradelines@smartfcra.com` / from `welcome@tradelines.smartfcra.com`. Daily `tradeline_inventory_refresh` job. |
| **Twilio** | SMS notifications, Verify OTP, Video **tokens**, webhook signature checks. |
| **Cloudflare Email / Email Routing** | Transactional mail (`src/lib/email.ts`). Ops alerts to `opsEmail`. |
| **Stripe** | Org billing, checkout, portal, invoices. **No client self-serve unlock checkout yet.** |
| **Click2Mail** | Certified / first-class letter campaigns. |
| **Proof (RON)** | Remote online notarization sessions — sandbox unless live keys. |
| **Cloudflare Turnstile** | Login / register captcha when keys present. Brand forms currently show a **placeholder**, not a live widget. |
| **Sentry** | Optional error reporting. |

---

## 7. AI (free-only cascade)

`src/lib/ai-providers.ts` — Groq → Gemini → Cloudflare Workers AI → OpenAI.  
**Paid OpenAI/Anthropic keys are ignored** so the platform stays on free tiers.

Used for: staff AI Studio, client mentors, letter drafting assistance, tradeline match **explanation** (the match math itself is deterministic).

Mentors: Rick Jefferson (strategy), Alex Rivera (credit tutor), Maya Chen (compliance), Jordan Blake (funding).

---

## 8. Data, security, ops

| Layer | Behavior |
|---|---|
| Auth | JWT (Web Crypto), refresh rotation, MFA TOTP, lockout, password reset |
| Tenancy | `org_id` on almost every table; `org_platform_master` for public brand leads |
| Roles | `super_admin`, `admin`, `staff`, `client` |
| PII | Encryption helpers, audit log, retention jobs |
| Files | R2 vault + report PDFs |
| Cron | GitHub Action `platform-ops.yml` → `POST /api/cron/ops` with packs: `daily`, `weekly`, `monthly`, plus `tradeline_inventory_refresh` inside daily |
| Health | `/api/health/ready` checks D1 |

---

## 9. Database (high-signal tables)

`users`, `clients`, `credit_reports`, `credit_accounts`, `violations`, `generated_documents`, `consent_records`, `mfsn_members`, `brand_leads`, `tradeline_orders`, `ghl_sync_log`, `audit_logs`, `refresh_tokens`, `orgs` / branding, mailing campaigns, journey stages, vault files.

Migrations live in `migrations/` (`0001`–`0021`+). Newest: `0021_client_intelligence.sql` (attestations, snapshots, credit events, portal disputes, CROA cancellations, consents, compliance decisions).

---

## 10. What is done vs what is left to finish

### Done (shipped on this branch / live)
- Auth, MFA, client + staff portals
- Report upload, violation engine, letter generation, QA review
- MFSN partner signup + token gate + analysis lock
- GHL custom fields + tags + CRM/MFSN bulk sync
- TradelineMaster marketplace (markup, filters, match, order, email, daily refresh)
- RJ brand kit at `/brand` + 8 interactive forms + `brand_leads` API
- Twilio / Email / Stripe org billing / Click2Mail wiring
- Free-only AI cascade
- Demo staff + Salisha client
- **Twilio Video JS** on client Video (live room when keys set; local preview otherwise)
- **Cloudflare Turnstile** on brand forms (`GET /api/public/turnstile` + siteverify when secret set)
- **Executive Overview sparkline** bound to last 6 months of paid tradeline orders (falls back to estimated pipeline)
- **Click2Mail** status from `GET /api/settings/integrations`
- **Nav** — duplicate Clients + Report History removed from sidebar (history lives on Reports)
- **Client Stripe checkout** `POST /api/client-portal/unlock/checkout` + webhook `analysis_unlock`
- **RON sandbox vs live** banners on Legal + Compliance Hub
- **PDF letterhead** Smart FCRA + RJ blue `#2563eb` + **Space Grotesk** headings (OFL subset bundled for Workers)
- **Per-tenant theme** Settings → Portal theme (CSS variables on login)
- **`src/frontend/`** archived as non-production prototypes
- **PWA** `/manifest.webmanifest` + `/sw.js`, Add to Home Screen, overlay mobile nav, horizontal table scroll
- **Playwright CI gate** login → upload → detect → letter (`tests/login-upload-letter.spec.ts`)
- **Live RON** Proof (`ApiKey` → `https://api.proof.com/transactions`) and BlueNotary (`Bearer` → `https://app.bluenotary.us/api/integrationsv2/sessions`) with ceremony join URLs + HMAC webhooks
- **Client intelligence portal** — evidence-first disputes, immutable attestations, hallucination firewall, credit event ledger, CROA in-portal cancellation, named score models, mobile Home/Credit/Case/Actions/More nav. Removed FICO deletion simulator / guaranteed-lift copy.

### Operator secrets still required in Pages (not code)

Production notarization, Turnstile, and Stripe unlock need Cloudflare Pages secrets (`RON_VENDOR` + `RON_VENDOR_API_KEY`, `TURNSTILE_*`, `STRIPE_API_KEY`). The app is wired; keys are not in git.

---

## 11. How to operate day-to-day

1. Client arrives via GHL, MFSN link, brand form, or staff create.
2. Collect ID / SSN / proof in vault; pull or upload credit report (MFSN or PDF).
3. Staff **unlocks analysis**.
4. Engine runs → staff QA on Violation Review.
5. Generate letters → mail via Click2Mail and/or portal download.
6. Journey moves New → Onboarding → Analysis → Disputes → Fundability → Funded.
7. Optional: match AU tradelines (educational), send order email to TradelineMaster.
8. Optional: business funding qualify via brand form + fundability engine.
9. Keep GHL in sync (login + bulk sync buttons in Settings).

---

## 12. Brand (must stay consistent)

| Token | Value |
|---|---|
| Blue | `#2563eb` |
| Sky | `#0ea5e9` |
| Navy | `#0f172a` |
| Gold | `#f59e0b` |
| Fonts | Space Grotesk (headings), Inter (body) |
| Logo | GHL CDN jpeg (see `public/static/brand/brand.css`) |
| Tagline | Empowering Generational Wealth |
| Product name | **Smart FCRA** presented by **RJ Business Solutions** — do not ship “FCRA Supreme” in UI |

---

*Generated for finish-up. When a row in section 10 is completed, check it off here and in the in-app Product map.*
