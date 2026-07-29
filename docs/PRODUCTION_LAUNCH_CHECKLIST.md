# Production Launch Checklist — Smart FCRA Supreme v2

This branch is the **separate-project** workbench. Do **not** merge into original `smart-FCRA` `main`.

## Security hardening completed in code

- [x] Removed hardcoded master password (env `PLATFORM_BOOTSTRAP_EMAIL` / `PLATFORM_BOOTSTRAP_PASSWORD` only)
- [x] PBKDF2-SHA-256 password hashing (100k iterations — Workers Web Crypto cap) + legacy hash upgrade on login
- [x] PII encryption fail-closed (`PII_ENCRYPTION_KEY` required, min 32 chars)
- [x] Platform admin APIs gated to `super_admin` only
- [x] Server-stored single-use MFA challenges
- [x] SmartCredit secrets required from env (no hardcoded fallbacks)
- [x] Mailing webhook authenticated via `MAILING_WEBHOOK_SECRET`
- [x] Consent flags require explicit attestation (no silent auto-stamp)
- [x] Password reset / email verify token tables + Resend wiring
- [x] Credentials no longer logged in plaintext in activity_log

## Product wiring completed

- [x] MFA challenge UI + Settings MFA enroll/disable
- [x] Forgot / reset password UI
- [x] Organization Settings page (letterhead + MFA)
- [x] Client portal no longer injects mock violations
- [x] Violation QA queue no longer injects mock items
- [x] Stripe checkout prefers configured Price IDs + metadata plan mapping
- [x] `/api/health/ready` readiness probe
- [x] Auth token migrations (`0004_enterprise_hardening.sql`)

## Before first production deploy (operator)

1. Create GitHub repo `smart-FCRA-v2` and push this branch as `main`
2. `npx wrangler d1 create fcra-detector-v2` → paste real `database_id` into wrangler configs
3. Set secrets (never commit):

```bash
wrangler secret put PII_ENCRYPTION_KEY
wrangler secret put STRIPE_API_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put STRIPE_PROFESSIONAL_PRICE_ID
wrangler secret put STRIPE_UNLIMITED_PRICE_ID
wrangler secret put STRIPE_ENTERPRISE_PRICE_ID
wrangler secret put RESEND_API_KEY
wrangler secret put SMARTCREDIT_CLIENT_KEY
wrangler secret put SMARTCREDIT_CLIENT_SECRET
wrangler secret put CLICK2MAIL_USERNAME
wrangler secret put CLICK2MAIL_AUTH_BASIC
wrangler secret put MAILING_WEBHOOK_SECRET
wrangler secret put PLATFORM_BOOTSTRAP_EMAIL   # optional
wrangler secret put PLATFORM_BOOTSTRAP_PASSWORD # optional
wrangler secret put SENTRY_DSN                 # optional
wrangler pages secret put STAFF_MFA_REQUIRED_ALL  # optional: "true" to require MFA on all staff APIs
```

4. Set `ENVIRONMENT=production` and real `FRONTEND_URL`
5. Apply migrations + seed (or seed only in staging):

```bash
npx wrangler d1 migrations apply fcra-detector-v2 --remote
# Includes 0009_roadmap_progress.sql for interactive fundability wizards
```

6. Deploy: `npm run deploy` → Pages project `smart-fcra-v2` only

## Live now (v2)

- URL: **https://smart-fcra-v2.pages.dev**
- D1: `fcra-detector-v2` / `ae28993e-1c98-4f4e-a73d-42ae4337424d`
- `/api/health/ready` reports `ready: true`, `environment: production`
- Original `smart-fcra` Pages + `fcra-detector-production` D1 are untouched

## Local QA

```bash
npm install
npm run db:reset
npm run build
npm run preview
# demo login: demo@example.com / demo123456
npx playwright test
```

## Demo credentials (local seed only)

| Email | Password | Role |
|-------|----------|------|
| demo@example.com | demo123456 | super_admin |
| member@iso-a.example | demo123456 | member |
| suspended@iso-b.example | demo123456 | admin (suspended org) |

Change all seed passwords before any shared staging environment.
