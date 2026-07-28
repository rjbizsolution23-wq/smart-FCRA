# Secrets Wiring Status — Smart FCRA v2

Operator secrets live in **gitignored** `.dev.vars` / `secrets.env` only (never committed).

## Verified live

| Integration | Status |
|-------------|--------|
| **Cloudflare Email Sending** | **LIVE** — `welcome@noreply.smartfcra.com` / `onboarding.smartfcra.com` (test send OK) |
| **NVIDIA NIM free models** | **LIVE** — cascade starts with `meta/llama-3.1-70b-instruct` (smoke OK) |
| Groq / OpenRouter `:free` / Gemini / Together / HF / Workers AI | Free cascade fallbacks |
| Hugging Face + Replicate | Free media generation |
| Click2Mail / Stripe env / company branding | Wired |
| AI Mentors + case-law retrieval | Wired in CRM + client portal |

## Free-only policy

`FREE_AI_ONLY=true` — paid OpenAI/DeepSeek are **not** used in the cascade.

## Email priority

1. Cloudflare Email Sending (`noreply` / `onboarding`)
2. Resend fallback
3. SendGrid fallback

## Mentors / agents

- FCRA Rights Mentor
- Dispute Strategist Agent
- Client Success Coach
- Metro 2 Auditor Agent
- Litigation Scout Agent (case-law RAG)

Knowledge corpus: `src/data/case-law-database.ts` + statutes/damages docs (retrieval-augmented; offline Kaggle/HF fine-tunes can swap generators later).

## Still needed for full Cloudflare Pages deploy

1. Fresh **Cloudflare Workers/Pages/D1 API token** (previous general `cfat_` failed verify; email `cfut_` works for mail only)
2. Stripe `whsec_…` webhook secret
3. SmartCredit client key/secret (if using live import)
