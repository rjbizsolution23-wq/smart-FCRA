# Security Audit — Smart FCRA Supreme v2

**Status:** Hardened for enterprise launch readiness (code-level). Operator must still set production secrets and provision isolated D1/Pages.

## Controls implemented

| Control | Implementation |
|---------|----------------|
| Password hashing | PBKDF2-SHA-256, 210k iterations (`src/lib/auth.ts`) |
| Legacy hash migration | Old SHA-256 hashes verify + upgrade on login |
| Sessions | Opaque bearer tokens in D1 `sessions`, 30-day expiry |
| MFA | TOTP with server-stored single-use `mfa_challenges` |
| Platform admin | `super_admin` only (`adminGateMiddleware`) |
| Org suspension | Enforced in auth middleware |
| PII at rest | AES-256-GCM; **fails closed** without `PII_ENCRYPTION_KEY` |
| Stripe webhooks | Signature verify + `stripe_processed_events` idempotency |
| Mailing webhooks | Shared secret header required |
| Rate limiting | KV-backed when `RATE_LIMIT_KV` bound; fail-open if unbound |
| CSP / HSTS / XFO | Global middleware headers |
| SmartCredit secrets | Env-only (no source fallbacks) |
| Bootstrap admin | Env `PLATFORM_BOOTSTRAP_*` only — no hardcoded passwords |

## Remaining operator responsibilities

1. Bind Cloudflare KV for rate limits in production wrangler
2. Rotate all secrets; set `ENVIRONMENT=production`
3. Provision real D1 `fcra-detector-v2` ID
4. Enable Resend for real email verify/reset delivery
5. SOC 2 / formal compliance programs are **organizational**, not claimed by this codebase alone

## Honest non-claims

- This product processes consumer credit data under FCRA workflows; it is **not** a HIPAA clinical system.
- JWT is **not** used (opaque DB sessions).
- Argon2 npm package is **not** used on Workers (PBKDF2 via Web Crypto is).
