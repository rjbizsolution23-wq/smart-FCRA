# Demo Walkthrough — Smart FCRA by RJ Business Solutions

Send this to a credit-repair firm or litigation desk. The interactive demo is the product: they enter as a time-boxed sandbox operator, walk every screen, upload a bureau file, and convert into a real organization signup.

**Public entry:** https://smart-fcra-v2.pages.dev/demo  
**Same gate on login:** https://smart-fcra-v2.pages.dev/login?mode=demo

Requires work email, phone, **business name**, and **business address**. Cloudflare Turnstile runs when `TURNSTILE_SECRET_KEY` is set (skipped in local/dev).

## What the visitor gets

1. **Gated session** — `POST /api/public/demo/start` → `/app?demo=TOKEN` → `POST /api/public/demo/enter` issues a staff sandbox token on `org_demo_001` (Professional plan so uploads are not blocked).
2. **Salisha McDowell sample case** — loaded automatically on enter and again from the overlay (`POST /api/demo/prepare`). Consents are set so **credit-report upload works**.
3. **Guided tour + text/voice agent** — overlay at `/static/demo-experience.js`. Agent navigates screens; scripted fallback if no AI key is configured.
4. **Upload** — tour pins Salisha. PDF/JSON/text hits `POST /api/reports/upload` (same engine as production). Optional one live MyFreeScoreNow pull (`POST /api/demo/mfsn-live`) — one person, one report per demo account.
5. **Convert to signup** — banner **Start your organization** → `POST /api/demo/convert` → `/login?mode=register&from=demo` with firm name, email, and contact prefilled. That creates a **new paid org**, not a continuation of the shared sandbox.

Letters are **generated from file facts**, not fill-in templates. No guaranteed deletions or score lifts.

## Visitor path (send this)

1. Open `/demo` or `/login?mode=demo`
2. Enter firm identity → land in the operator console with the tour
3. Walk: upload → violations → litigation score → generated letters → vault → mail clocks → Salisha → client portal / sandbox / tutor / CROA cancel
4. Optional: **Live report** with a member email + `MAPIK#` token
5. **Start your organization** when they are ready to buy

## Internal staff sandbox (still available)

| Role | Email | Password |
|------|-------|----------|
| Staff admin | `demo@example.com` | `demo123456` |
| Client portal | `salisha.mcdowell@example.com` | `demo123456` |

On `/login`, one-click **Live demo logins** (after this branch is deployed). Super-admin **Prepare Demo Now** remains at `POST /api/admin/demo/prepare`. Interactive visitors use `POST /api/demo/prepare` (session-gated, not super_admin).

## Cloudflare wiring

Worker is Cloudflare Pages + D1 + R2 + KV + Workers AI (`wrangler.toml`: `smart-fcra-v2`, D1 `fcra-detector-v2`, R2 `smart-fcra-v2-docs`, `[ai]` binding). Demo routes live in the same Hono worker — no extra Pages Function.

Apply D1 migrations **0021–0024** (0023 = `demo_sessions`) before sending traffic. Probe: `GET /api/health/ready` (DB + `PII_ENCRYPTION_KEY` required for `ready: true`).

**Pages secrets that make the demo complete:**

| Secret | Why |
|--------|-----|
| `PII_ENCRYPTION_KEY` (32+ chars) | Upload + report vault |
| `GROQ_API_KEY` / `OPENROUTER_API_KEY` / `GEMINI_API_KEY` / `TOGETHER_AI_API_KEY` / Workers `AI` binding | Demo agent + AI Studio (scripted fallback if none) |
| `MFSN_EMAIL` / `MFSN_PASSWORD` | Optional live MyFreeScoreNow pull |
| `TURNSTILE_SECRET_KEY` + site key | Bot gate on public demo form |
| `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` | CI Pages deploy |

`GET /api/demo/session` returns `uploadReady`, `sampleLoaded`, `convertUrl`, and which free AI providers are configured.

## Local sandbox

```bash
cp .dev.vars.example .dev.vars
npm install
npm run db:reset
npm run build
npm run preview
# http://localhost:3000/demo
```

## Notes

- Shared sandbox: many visitors share `org_demo_001` / Salisha. Converted signup is the isolation boundary.
- Rotate demo passwords before sharing a public staging URL outside the team.
- Live site does not include this walkthrough until the branch is merged and Pages is deployed.
