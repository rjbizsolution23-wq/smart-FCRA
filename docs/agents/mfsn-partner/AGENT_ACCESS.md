# MyFreeScoreNow — Agent Access Runbook

Owner: Rick Jefferson / RJ Business Solutions  
Affiliate ID: `A8289`  
Docs: https://www.myfreescorenow.com/api-integration  
OpenAPI: https://api.swaggerhub.com/apis/myfreescorenowinc/MyFreeScoreNow-Reports/1.0.0/swagger.json  
Swagger UI: https://myfreescorenow.portal.swaggerhub.com/reporting/docs/mfsn-reports-v-1-0-0  
Affiliate portal: https://myfreescorenow.com/login

## Whitelisted operator logins

| Role | Email | Password location |
|------|-------|-------------------|
| **Primary API + affiliate dashboard** | `rickyjefferson1006@gmail.com` | `.dev.vars` → `MFSN_EMAIL` / `MFSN_PASSWORD` |
| Legacy partner API | `rickjefferson@rickjeffersonsolutions.com` | `.dev.vars` → `MFSN_LEGACY_EMAIL` / `MFSN_LEGACY_PASSWORD` |

**Never commit passwords.** Load from gitignored `.dev.vars` or Cloudflare Pages secrets.

## Env keys (required)

```bash
MFSN_EMAIL=rickyjefferson1006@gmail.com
MFSN_PASSWORD=<from .dev.vars>
MFSN_CLIENT_TOKEN=<optional partner default; members usually supply their own MAPIK#…>
MFSN_API_URL=https://api.myfreescorenow.com
MFSN_LEGACY_EMAIL=rickjefferson@rickjeffersonsolutions.com
MFSN_LEGACY_PASSWORD=<from .dev.vars>
MFSN_AFFILIATE_PORTAL_URL=https://myfreescorenow.com/login
```

Production: same keys via `wrangler pages secret put … --project-name smart-fcra-v2`.

## How affiliates create an API user (required for live 3B pull)

MyFreeScoreNow dashboard login ≠ API login. Affiliates must:

1. Open the affiliate portal: https://myfreescorenow.com/login
2. Go to **Users** → dropdown → **API user**
3. At the top, enter the API **username and password they choose**, then save
4. In Smart FCRA, enter that API username/password (or leave blank when `MFSN_EMAIL` / `MFSN_PASSWORD` are already on Pages)
5. Enter the **member email** (the client’s MyFreeScoreNow username) and the member **client token** (`MAPIK#…`)
6. Pull — `login` with API user, then `fetch-3B-json` with member email + member token

Demo overlay, credit-report upload page, and the interactive demo agent all teach this same sequence. One live demo pull per account.

## Official API surface (v1.0.0)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/login` | email + password (JSON or form) | Bearer token |
| POST | `/api/auth/fetch-3B-json` | Bearer + form `email` + `client_token` | 3-bureau JSON |
| POST | `/api/auth/logout` | Bearer | End session |

## How agents authenticate

```bash
# From repo root (reads .dev.vars)
node scripts/mfsn-login.mjs
# or:
node scripts/mfsn-login.mjs --email rickyjefferson1006@gmail.com
```

Pull a member report (member must be under affiliate A8289; each member has their own `MAPIK#` token):

```bash
node scripts/mfsn-login.mjs \
  --pull chichambers881@gmail.com \
  --client-token 'MAPIK#…'
```

## Affiliate-only product rule

Public signup (`/?signup=mfsn`) only accepts members enrolled under offers in `src/data/mfsn-affiliate-offers.ts` (codes ending in `A8289`).

## Code map

| Piece | Path |
|-------|------|
| Operator whitelist | `src/data/mfsn-operator-accounts.ts` |
| Affiliate offers + commissions | `src/data/mfsn-affiliate-offers.ts` |
| API client | `src/engine/mfsn-client.ts` |
| Public signup | `POST /api/public/mfsn-signup` |
| Staff offer catalog | `GET /api/mfsn/affiliate-offers` |
| Integration notes | `docs/funding/MFSN_INTEGRATION.md` |

## Agent checklist

1. Read `.dev.vars` (or Pages secrets) — do not invent passwords.
2. Confirm operator email is in `MFSN_OPERATOR_ACCOUNTS`.
3. Login → Bearer → `fetch-3B-json` with **member email + member client_token**.
4. Never paste live passwords into git, PR bodies, or client-visible UI.
5. After chat paste of credentials, remind owner to rotate when practical.
