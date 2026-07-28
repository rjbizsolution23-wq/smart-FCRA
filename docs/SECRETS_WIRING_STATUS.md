# Secrets Wiring Status — Smart FCRA v2

Operator secrets were loaded into **gitignored** `.dev.vars` / `secrets.env` (never committed).

## Wired & verified

| Integration | Status |
|-------------|--------|
| Groq free LLM | **Live** — AI rewrite/chat cascade (`llama-3.3-70b-versatile` smoke OK) |
| OpenRouter free models | Wired in cascade |
| Gemini / Together / DeepSeek / OpenAI | Wired as fallbacks |
| Hugging Face + Replicate | Wired for free media (`/api/ai/media/generate`) |
| Resend + SendGrid fallback | Wired for transactional email |
| Click2Mail | Wired (stage API URL from intake) |
| Stripe publishable + secret (restricted live) | Wired in env |
| Company branding | Wired (`/api/company`) |
| PII encryption + mailing webhook secrets | Generated & stored locally |

## New API endpoints

- `GET /api/ai/providers` — configured free/paid providers
- `POST /api/ai/chat` — CRM copilot / consumer education
- `POST /api/ai/media/generate` — free HF/Replicate image models
- `GET /api/billing/publishable-key`
- `GET /api/company`
- `POST /api/documents/:id/ai-rewrite` — now multi-provider (not Workers-AI-only)
- UI: **AI Studio** page in staff nav

## Blockers for remote Cloudflare deploy

1. **`CLOUDFLARE_API_TOKEN` returned Invalid API Token** against Cloudflare verify API — create a fresh token with D1 + Pages + Account read permissions, then re-wire.
2. **`STRIPE_WEBHOOK_SECRET`** still placeholder in intake — add real `whsec_…` from Stripe Dashboard → Webhooks.
3. **SmartCredit client key/secret** were not in the intake file — add `SMARTCREDIT_CLIENT_KEY` / `SMARTCREDIT_CLIENT_SECRET` if using live SmartCredit import.
4. Stripe key provided is **`rk_live_` (restricted)** — confirm it has Checkout + Customers + Subscriptions permissions (or supply `sk_live_` / `sk_test_`).

## Security note

Live secrets were pasted in chat. **Rotate Cloudflare, Stripe, GitHub PATs, Twilio, and bootstrap passwords** after this session. Keep the vault copy in 1Password/Bitwarden only.
