# Secrets Wiring Status — Smart FCRA v2

Operator secrets live in **gitignored** `.dev.vars` / `secrets.env` only (never committed).

## Live production

| Resource | Value |
|----------|--------|
| Pages | **https://smart-fcra-v2.pages.dev** |
| D1 | `fcra-detector-v2` (`ae28993e-1c98-4f4e-a73d-42ae4337424d`) |
| Original app | Untouched — `https://smart-fcra.pages.dev` |

## Verified live

| Integration | Status |
|-------------|--------|
| **Cloudflare Pages deploy** | **LIVE** — production ready probe OK |
| **D1 + migrations 0001–0004 + seed** | **LIVE** |
| **Cloudflare Email Sending** | **LIVE** — `noreply` / `onboarding.smartfcra.com` |
| **NVIDIA NIM free models** | **LIVE** — free-only cascade |
| Groq / OpenRouter `:free` / Gemini / Together / HF / Workers AI | Wired |
| Stripe / Lob mail (primary) + Click2Mail (legacy fallback) / company branding | Wired |
| Demo login | `demo@example.com` / `demo123456` |
| Platform bootstrap | env-based `PLATFORM_BOOTSTRAP_*` (super_admin) |
| AI Mentors + case-law retrieval | Wired |

## Free-only policy

`FREE_AI_ONLY=true` — paid OpenAI/DeepSeek are **not** used in the cascade.

## Auth note

PBKDF2 iterations are **100,000** (Cloudflare Workers Web Crypto hard cap).

## MyFreeScoreNow (wired)

| Secret | Purpose |
|--------|---------|
| `MFSN_EMAIL` | Primary operator: `rickyjefferson1006@gmail.com` |
| `MFSN_PASSWORD` | Primary operator password (Pages secret + `.dev.vars`) |
| `MFSN_LEGACY_EMAIL` | `rickjefferson@rickjeffersonsolutions.com` |
| `MFSN_LEGACY_PASSWORD` | Legacy partner password |
| `MFSN_CLIENT_TOKEN` | Optional default; members usually supply own `MAPIK#` |
| `MFSN_API_URL` | `https://api.myfreescorenow.com` |

Agent runbook: `docs/agents/mfsn-partner/AGENT_ACCESS.md` · helper: `node scripts/mfsn-login.mjs`

## RJ Brand Library (wired)

Static hub: **https://smart-fcra-v2.pages.dev/brand** · short form URLs: `/forms/credit-qualify`, `/forms/funding-qualify`, etc.

Interactive forms POST to `POST /api/public/lead/:formId` → D1 `brand_leads` + ops email + GHL tag `RJ Lead`.

Staff nav → **Brand Library** lists forms, tokens, and recent leads. Assets live under `public/static/brand/` (forms, marketing, legal, ops, founder).

Design tokens: RJ Blue `#2563eb`, Sky `#0ea5e9`, Space Grotesk + Inter (`public/static/brand/brand.css`).

## Lob Print & Mail (wired — primary mailing vendor)

| Secret | Purpose |
|--------|---------|
| `LOB_SECRET_KEY` | Primary secret key (HTTP Basic username); prefix `test_`/`live_` selects mode automatically |
| `LOB_TEST_SECRET_KEY` / `LOB_TEST_PUBLISHABLE_KEY` | Optional explicit test-mode pair |
| `LOB_LIVE_SECRET_KEY` / `LOB_LIVE_PUBLISHABLE_KEY` | Optional explicit live-mode pair |
| `LOB_MODE` | `test` or `live` — used when key has no prefix |
| `LOB_WEBHOOK_SECRET` | Reserved for a future Lob delivery-tracking webhook (not yet wired to a route) |

Every mail send is gated by postage billing (`src/lib/mail-postage.ts`) **before** Lob is called — org/client prepaid wallets or a Stripe-held org card (`org_mail_credits.card_on_file` / `mail_unlocked`). No card numbers are ever stored in repo/env secrets; Stripe holds the payment method.

Routes: `GET /api/integrations/lob/status`, `POST /api/integrations/lob/verify-address`, `POST /api/documents/:id/send`, `POST /api/client-portal/disputes/:id/send`, plus `registerMailPostageRoutes` (`src/lib/mail-postage-routes.ts`) for wallet purchase/card-unlock endpoints.

Click2Mail (`CLICK2MAIL_USERNAME` / `CLICK2MAIL_AUTH_BASIC` / `CLICK2MAIL_API_URL`) is kept wired only as a legacy fallback — `GET /api/integrations/click2mail/addresses` now reports `replacedBy: 'lob'` and is not used by either default send path.

## TradelineMaster (wired)

| Secret | Purpose |
|--------|---------|
| `TRADELINEMASTER_USER_KEY` | API User Key (Basic auth) |
| `TRADELINEMASTER_PASS_KEY` | API Pass Key |
| `TRADELINEMASTER_API_URL` | `https://www.tradelinemaster.com/api` |
| `TRADELINE_MARKUP_RATE` | `0.125` (12.5% RJ Business Solutions markup) |
| `TRADELINE_OPS_EMAIL` | `tradelines@smartfcra.com` (payment / placement) |
| `TRADELINE_FROM_EMAIL` | `welcome@tradelines.smartfcra.com` |
| `CLOUDFLARE_EMAIL_API_TOKEN` | Cloudflare Email Sending token (`cfut_…`) |

**Staff / client nav → Tradelines** — live inventory, filters, smart match agent, order form, education, daily cron refresh (`tradeline_inventory_refresh` in ops daily pack + `POST /api/cron/tradelines-refresh`).

## GoHighLevel (wired)

| Secret | Purpose |
|--------|---------|
| `GHL_PIT_TOKEN` | Private Integration Token (LeadConnector v2) |
| `GHL_LOCATION_ID` | Sub-account / location ID |
| `GHL_API_BASE` | Optional override (default `https://services.leadconnectorhq.com`) |

**Staff Settings → GoHighLevel + MyFreeScoreNow Sync**
- Ensure GHL Fields — creates missing Smart FCRA / MFSN custom fields
- Sync All CRM Clients — upserts portal clients with scores, tags, offer codes
- Sync MFSN Active → GHL — pulls affiliate active members and upserts every contact

API routes: `GET /api/integrations/ghl/status`, `POST /api/integrations/ghl/ensure-fields`, `POST /api/integrations/ghl/sync-all-clients`, `POST /api/integrations/ghl/sync-mfsn-members`, `GET /api/integrations/mfsn/status`

Signup, unlock-analysis, per-client Sync GHL, and MFSN report import also push full custom fields + tags.

## Still optional

1. Stripe `whsec_…` webhook secret
2. SmartCredit client key/secret (live import)
3. New GitHub repo `smart-FCRA-v2` (do **not** merge this branch into original `main`)
4. `SENTRY_DSN` — edge error reporting (code wired via `src/lib/sentry.ts`)
5. `STAFF_MFA_REQUIRED_ALL=true` — require MFA for all staff API routes (elevated routes always require MFA)

## Infrastructure bindings (already in wrangler)

| Binding | Status |
|---------|--------|
| `RATE_LIMIT_KV` | Wired in `wrangler.toml` / `wrangler.jsonc` |
| `DOCS` (R2) | Wired for vault + D1 backup snapshots |
| `DB` (D1 `fcra-detector-v2`) | Live |
| `AI` | Wired for Workers AI fallback |

## Security

Rotate any tokens pasted in chat. Prefer `CLOUDFLARE_API_TOKEN_MASTER` for Wrangler. Never commit `.dev.vars` / `secrets.env`.
