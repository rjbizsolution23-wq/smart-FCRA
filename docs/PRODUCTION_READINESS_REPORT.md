# Production Readiness Report — Smart FCRA v2 (CRO / GTM)

**Date:** 2026-08-08  
**Target:** Client-ready + CRO-ready go-to-market  
**Live URL:** https://smart-fcra-v2.pages.dev

---

## Executive verdict

The core product path — **ingest → detect FCRA/Metro2 violations → brand letters → send → engage clients daily** — is production-capable. This pass closed the highest-risk GTM gaps: **firm branding on every letter/PDF**, **intelligent letter selection**, **bureau-reply understanding**, and **SmartCredit sandbox leak into production**.

Remaining work is mostly **operator secrets** (MFSN / SmartCredit live keys, Stripe webhook) and optional vendors (Twilio SMS, certified RON) — not core engine holes.

---

## What was fixed in this pass

| Gap | Fix |
|-----|-----|
| Settings letterhead did not reach PDFs | `mergeLetterheadIntoSettings` flattens nested → PDF keys; PDF route uses `normalizeOrgLetterhead` |
| Letter bodies had no firm brand | `brandLetterContent()` prepends firm header on generate / bulk / workflow / PDF |
| Logo not uploadable | Settings UI logo file → `logoBase64` |
| Fixed 6-letter workflow pack | `letter-strategy.ts` selects specialty + litigation letters from violation signals |
| No reply intelligence | `bureau-reply-intel.ts` classifies portal uploads and updates dispute status |
| SmartCredit mock in prod | Sandbox username blocked unless `ALLOW_SMARTCREDIT_SANDBOX=true` |
| Architecture visibility | `docs/ARCHITECTURE_BLUEPRINT.md` + this report |

---

## System health (live probe)

Check: `GET /api/health/ready`

| Check | Meaning |
|-------|---------|
| `db` + `encryptionKey` | Required for `ready: true` |
| `stripe` / email providers | Billing + client email |
| `mfsn` / `smartcredit` | Live credit pulls (operator secrets) |
| `lob` | Certified / first-class / standard mail send (primary vendor; Click2Mail retained as legacy fallback) |
| `letterBranding` / `letterStrategy` / `bureauReplyIntel` | Feature flags for this release |

Production D1 has migrations **0001–0039** applied (verified via Wrangler), including `0038_mail_postage_billing.sql` and `0039_mail_card_unlock.sql`.

---

## Architecture (see full blueprints)

→ **`docs/ARCHITECTURE_BLUEPRINT.md`**

Flow: Upload/API → Parse → Violations + Factcheck → Letter Strategy → Firm Brand → PDF/Send → Reply Intel → Daily Comms.

---

## CRO operating loop (how you win cases)

1. **Onboard** client with accurate profile (name, address, SSN last4, DOB, state) + consents.  
2. **Settings → Firm Letterhead** — firm name, address, logo, hired-advocate flags (once per org).  
3. **Ingest** ACR PDFs and/or MFSN (and SmartCredit when keys are set).  
4. **Review** violations + LVS; run **Launch Workflow** (intelligent pack) or `POST /api/documents/recommend`.  
5. **Send** branded PDFs via Lob (postage charged from org/client wallet or saved card first); track dispute rounds.  
6. **Upload bureau replies** (category: Creditor/Bureau Reply) with OCR text — file auto-updates.  
7. **Daily** motivation + ops crons keep clients engaged while rounds run.

Demo staff login: `demo@example.com` / `demo123456`

---

## Remaining gaps (ranked)

### Critical (operator — not code)

1. **Wire live MFSN org credentials** if selling MFSN pull as a feature (`MFSN_EMAIL`, `MFSN_PASSWORD`, `MFSN_CLIENT_TOKEN`).  
2. **Wire SmartCredit client key/secret** for non-PDF SmartCredit imports (`smartcredit: false` on ready probe today).  
3. **Set `LOB_SECRET_KEY`** (or `LOB_TEST_SECRET_KEY`/`LOB_LIVE_SECRET_KEY` + `LOB_MODE`) on the Pages project — mailing is unusable without it.  
4. **Rotate any Cloudflare/API tokens pasted in chat.**

### High

4. Stripe `STRIPE_WEBHOOK_SECRET` for reliable subscription sync.  
5. Reply intel is text/OCR based — staff should paste OCR text with uploads for best accuracy.  
6. Auto-resolve on full deletion updates all open violations for the client — staff should confirm against the new report.

### Medium

7. Twilio SMS / RON vendor still optional/sandbox for e-notarization.  
8. Monolith `index.tsx` size — operational risk; consider route modules in a later refactor.  
9. Legacy React `src/frontend/` not in production path — ignore for GTM.

---

## Test coverage added

- `tests/org-branding.test.mjs`
- `tests/letter-strategy.test.mjs`
- `tests/bureau-reply-intel.test.mjs`

Run: `npm run test:unit`

---

## Go-to-market checklist (CRO)

- [ ] Fill Firm Letterhead + upload logo  
- [ ] Confirm hired-advocate / POA flags if representing clients  
- [ ] Seed first real client with complete profile  
- [ ] Ingest one ACR or MFSN tri-bureau pull  
- [ ] Launch workflow — verify firm name on PDF  
- [ ] Set `LOB_SECRET_KEY` (test or live) and send one Lob test (or download PDF)  
- [ ] Fund an org postage wallet or add a firm card so mail sends aren't blocked by `MAIL_POSTAGE_REQUIRED` / `MAIL_CARD_REQUIRED`  
- [ ] Upload a sample bureau reply with text — confirm classification  
- [ ] Confirm daily motivation cron secret + GitHub Actions enabled  
- [ ] Set `ENVIRONMENT=production` (already) and rotate secrets
