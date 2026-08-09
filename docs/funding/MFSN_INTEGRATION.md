# MFSN + Institutional Funding Integration

## Security (critical)

Uploaded source and chat paste contained **live MFSN credentials**. Those defaults were **stripped** before commit.

**Rotate immediately** if those values were ever committed elsewhere or shared:

- MFSN account password
- MFSN `client_token` / API key

Set via Cloudflare Pages secrets (or local `.dev.vars`):

```bash
wrangler pages secret put MFSN_EMAIL --project-name smart-fcra-v2          # rickyjefferson1006@gmail.com
wrangler pages secret put MFSN_PASSWORD --project-name smart-fcra-v2
wrangler pages secret put MFSN_CLIENT_TOKEN --project-name smart-fcra-v2
wrangler pages secret put MFSN_LEGACY_EMAIL --project-name smart-fcra-v2  # rickjefferson@rickjeffersonsolutions.com
wrangler pages secret put MFSN_LEGACY_PASSWORD --project-name smart-fcra-v2
# optional:
wrangler pages secret put MFSN_API_URL --project-name smart-fcra-v2
```

Local `.dev.vars` (gitignored):

```
MFSN_EMAIL=rickyjefferson1006@gmail.com
MFSN_PASSWORD=...
MFSN_CLIENT_TOKEN=...
MFSN_API_URL=https://api.myfreescorenow.com
MFSN_LEGACY_EMAIL=rickjefferson@rickjeffersonsolutions.com
MFSN_LEGACY_PASSWORD=...
```

Agent access runbook (no passwords in git): `docs/agents/mfsn-partner/AGENT_ACCESS.md`  
Login helper: `node scripts/mfsn-login.mjs`  
Official docs: https://www.myfreescorenow.com/api-integration  
OpenAPI: https://api.swaggerhub.com/apis/myfreescorenowinc/MyFreeScoreNow-Reports/1.0.0/swagger.json

## Modules installed

| Module | Path |
|--------|------|
| MFSN client (no zod, no hardcoded secrets) | `src/engine/mfsn-client.ts` |
| Institutional lenders DB | `src/data/funding/lenders-database.ts` |
| Precision matching engine | `src/data/funding/institutional-matching.ts` |
| Net-30 / business vendors | `src/data/funding/business-credit.ts` |
| Curated verified 65 (dump audit) | `src/data/funding/lenders-catalog.ts` |

## APIs

- `POST /api/reports/import-mfsn` — body `{ clientId, clientEmail, username?, password?, secretWord? }` (body or env secrets)
- `GET /api/client-portal/funding/matches?mode=institutional|simple` — precision underwriting vs curated simple match
- `GET /api/client-portal/funding/catalog` — curated + institutional stats + business vendors summary

## Affiliate-only enrollment (A8289)

Public signup (`/?signup=mfsn`) **only** accepts MyFreeScoreNow members enrolled under RJ Business Solutions affiliate offers (suffix `A8289`).

| Code | Price | Trial | Commission | Enroll |
|------|-------|-------|------------|--------|
| B01A8289 | $29.90 | 7 day | $12.80/mo | https://app.myfreescorenow.com/enroll/B01A8289 |
| B02A8289 | $29.90 | none | $13.80/mo | https://app.myfreescorenow.com/enroll/B02A8289 |
| B03A8289 | $29.90 | none | $13.80/mo | https://app.myfreescorenow.com/enroll/B03A8289 |
| B04A8289 | $29.90 | 7 day | $12.80/mo | https://app.myfreescorenow.com/enroll/B04A8289 |
| B05A8289 | $24.97 | 7 day | $8.90/mo | https://app.myfreescorenow.com/enroll/B05A8289 |
| B06A8289 | $29.90 | 7 day | $12.80/mo | https://app.myfreescorenow.com/enroll/B06A8289 |
| B07A8289 | $39.90 | none | $20.80/mo | https://app.myfreescorenow.com/enroll/B07A8289 |
| C02A8289 | $99.95 | none | $62.80/mo | https://app.myfreescorenow.com/enroll/C02A8289 |

Source of truth in code: `src/data/mfsn-affiliate-offers.ts`  
Staff API (commissions included): `GET /api/mfsn/affiliate-offers`  
Public meta (no commissions): `GET /api/public/mfsn-signup/meta`

Enforcement:
1. Client must select an allow-listed offer + attest enrollment.
2. Partner API pull only resolves members under this affiliate; `User not found` → enroll via our links.

## Note on “600+” lenders

`MASTER_LENDERS_DATABASE` includes featured real CUs/banks/tradelines **plus** programmatically generated state CU placeholders (`XX State Teachers Credit Union`, etc.). Treat auto-generated rows as **matching scaffolding**, not verified affiliate inventory.
