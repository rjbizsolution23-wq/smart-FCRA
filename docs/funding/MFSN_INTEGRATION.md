# MFSN + Institutional Funding Integration

## Security (critical)

Uploaded source and chat paste contained **live MFSN credentials**. Those defaults were **stripped** before commit.

**Rotate immediately** if those values were ever committed elsewhere or shared:

- MFSN account password
- MFSN `client_token` / API key

Set via Cloudflare Pages secrets (or local `.dev.vars`):

```bash
wrangler pages secret put MFSN_EMAIL --project-name smart-fcra-v2
wrangler pages secret put MFSN_PASSWORD --project-name smart-fcra-v2
wrangler pages secret put MFSN_CLIENT_TOKEN --project-name smart-fcra-v2
# optional:
wrangler pages secret put MFSN_API_URL --project-name smart-fcra-v2
```

Local `.dev.vars` (gitignored):

```
MFSN_EMAIL=...
MFSN_PASSWORD=...
MFSN_CLIENT_TOKEN=...
MFSN_API_URL=https://api.myfreescorenow.com
```

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

## Note on “600+” lenders

`MASTER_LENDERS_DATABASE` includes featured real CUs/banks/tradelines **plus** programmatically generated state CU placeholders (`XX State Teachers Credit Union`, etc.). Treat auto-generated rows as **matching scaffolding**, not verified affiliate inventory.
