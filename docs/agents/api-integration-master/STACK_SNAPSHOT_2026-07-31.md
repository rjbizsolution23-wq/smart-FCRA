# Smart FCRA — Verified Stack Snapshot
# Brain Refresh Protocol v1.1 · Session 2026-07-31

## Temporal check
| Field | Value |
|-------|-------|
| VERIFIED DATE | 2026-07-31 (runtime UTC) |
| Protocol last snapshot in template | 2026-05-08 |
| Days since template snapshot | ~84 |
| Refresh required (>7d) | YES — executed 2026-07-31 |
| Drift vs 90d tolerance | WITHIN (approaching) |

## Security alerts (Domain 8)
| Alert | Status | Action for this repo |
|-------|--------|----------------------|
| Axios npm compromise (1.14.1 / 0.30.4) — CISA 2026-04-20 | ACTIVE | **Not a direct dependency.** Repo uses native `fetch`. Do not add axios. |

Sources:
- https://www.cisa.gov/news-events/alerts/2026/04/20/supply-chain-compromise-impacts-axios-node-package-manager (2026-04-20)
- https://www.microsoft.com/en-us/security/blog/2026/04/01/mitigating-the-axios-npm-supply-chain-compromise/ (2026-04-01)

## Installed vs live (Smart FCRA)

| Package | Installed | Live registry (2026-07-31) | Drift | Confidence |
|---------|-----------|----------------------------|-------|------------|
| hono | 4.12.12 | 4.12.33 (GitHub release same day) | behind patch | 🟢 |
| react | 19.2.7 | 19.2.8 | behind patch | 🟢 |
| vite | 6.4.2 | 8.2.0 | major behind (upgrade is intentional decision) | 🟢 |
| wrangler | 4.82.2 | 4.118.0 | behind minors | 🟢 |
| @playwright/test | 1.61.1 | 1.62.1 | behind minor | 🟢 |
| stripe | 15.12.0 | 22.4.0 | major behind | 🟡 |

Notes:
- Vite 8 / Stripe 22 upgrades are **not** auto-applied — require dedicated change + test pass.
- Hono/React/Playwright/Wrangler patch-minor bumps are safe candidates after CI green.
- Template claimed Next.js 16.2 / Tailwind 4.2 — **not this repo’s stack** (Vite + static SPA). Do not force Next.js.

## Capability audit (this session)

| # | Domain | Status |
|---|--------|--------|
| 1 | Master Architect | 🟡 context loaded; no full radar pull |
| 2 | Frontend | 🟢 React/Vite live-checked |
| 3 | Backend | 🟢 Hono live-checked |
| 4 | Database | 🟡 D1/SQLite stack; PG snapshot N/A |
| 5 | DevOps | 🟡 Wrangler live-checked |
| 6 | QA | 🟢 Playwright live-checked |
| 7 | UI/UX | 🟡 deferred |
| 8 | Security | 🟢 CISA Axios alert verified |
| 9 | AI/ML | 🟡 Workers AI already in use; no version bump this pass |
| 10 | Deploy/Observability | 🟡 Sentry optional in repo |

## Risk tier for continuing funding/MFSN work
🟢 Proceed — no blocking CVE in current direct deps. Prefer native fetch for MFSN client.
