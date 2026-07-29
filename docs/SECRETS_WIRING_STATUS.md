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
| Stripe / Click2Mail / company branding | Wired |
| Demo login | `demo@example.com` / `demo123456` |
| Platform bootstrap | env-based `PLATFORM_BOOTSTRAP_*` (super_admin) |
| AI Mentors + case-law retrieval | Wired |

## Free-only policy

`FREE_AI_ONLY=true` — paid OpenAI/DeepSeek are **not** used in the cascade.

## Auth note

PBKDF2 iterations are **100,000** (Cloudflare Workers Web Crypto hard cap).

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
