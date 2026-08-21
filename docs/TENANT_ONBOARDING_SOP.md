# SmartFCRA Supreme — B2B Tenant Onboarding SOP (v1.0)
## Multi-Tenant Setup, Cloudflare Pages, D1 Database, Stripe Webhooks, & Lob Print & Mail Integrations

---

### ⏰ TEMPORAL CHECK & BUILD ANCHOR
- **Verified Date**: Wednesday, July 8, 2026 (MST)
- **Primary Owner / Brand**: Rick Jefferson | RJ Business Solutions (1342 NM 333, Tijeras, New Mexico 87059)
- **Support**: support@rjbusinesssolutions.org | rjbizsolution23@gmail.com
- **Website**: [rickjeffersonsolutions.com](https://rickjeffersonsolutions.com)
- **Build ID**: NEL-20260708-040500

---

## 1. Executive Summary

This Standard Operating Procedure (SOP) outlines the precise, zero-defect workflow required to provision, onboard, and audit independent B2B tenants on the **SmartFCRA™ Supreme** platform. 

SmartFCRA™ is architected as an edge-native, multi-tenant credit report extraction, violation detection, and dispute letter orchestration system. This guide ensures that all operations conform to high-scale performance targets, strict isolation between tenant databases, robust compliance parameters, and seamless external API bindings.

---

## 2. Environment Provisioning & Cloudflare Pages Deploy

To ensure sub-second response times and absolute uptime, each tenant instance is deployed as an isolated Cloudflare Pages project utilizing Cloudflare Workers, D1 database, and R2 object storage.

### 2.1 Codebase & Project Setup
1. **Repository Isolation**:
   * Fork the master private repository `rjbizsolution23-wq/fcra-detector-main` into a dedicated tenant organization or isolated private repository named: `smartfcra-[tenant-name]`.
   * Set up branch protection rules on `main` requiring synthetic user probe passes and visual QA approval before merges.

2. **Cloudflare Pages Configuration**:
   * Access the Cloudflare Dashboard under the **RJ Business Solutions** partner account.
   * Navigate to **Workers & Pages** -> **Create Application** -> **Pages** -> **Connect to Git**.
   * Select the repository `smartfcra-[tenant-name]`.
   * Configure Build Settings:
     * **Framework Preset**: None (or custom/Vite if applicable)
     * **Build Command**: `npm run build`
     * **Build Output Directory**: `dist`
     * **Node.js Version**: Select Node.js `18.x` or higher in Environment Variables (`NODE_VERSION`).

### 2.2 Environment Variables Mapping
Navigate to **Settings** -> **Environment Variables** in the Cloudflare Pages project. Set the following required secrets and public flags:

| Variable Name | Type | Value / Purpose |
| :--- | :--- | :--- |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare account identifier for binding APIs. |
| `ENVIRONMENT` | Text | `production` or `staging` |
| `STRIPE_SECRET_KEY` | Secret | Private API key for managing tenant subscription verification. |
| `STRIPE_WEBHOOK_SECRET` | Secret | Cryptographic signing secret for verifying inbound webhook events. |
| `LOB_SECRET_KEY` | Secret | Tenant/platform Lob API secret key (HTTP Basic username; `test_`/`live_` prefix selects mode). Primary mailing vendor — required for any certified/first-class send. |
| `LOB_MODE` | Text | `test` or `live` (only needed if the key has no prefix). |
| `LOB_WEBHOOK_SECRET` | Secret | Reserved for a future Lob delivery-tracking webhook. |
| `MAILING_WEBHOOK_SECRET` | Secret | Generic mailing-status callback guard (`POST /api/billing/mailing-callback`) — vendor-agnostic. |
| `CLICK2MAIL_USERNAME` | Secret | **Legacy fallback only** — no longer used by default send paths. |
| `CLICK2MAIL_PASSWORD` | Secret | **Legacy fallback only.** |
| `CLICK2MAIL_XML_URL` | Text | **Legacy fallback only** — `https://xml.click2mail.com` |
| `JWT_ACCESS_SECRET` | Secret | High-entropy signing key for user session and auth tokens. |
| `PRIMARY_OWNER_CONTACT` | Text | `support@rjbusinesssolutions.org` (Compliance escalation point) |

---

## 3. Database Isolation, D1 Setup & Migrations

To guarantee sovereign tenant isolation, every tenant runs a separate, dedicated **Cloudflare D1 SQLite** database instance. No shared tables or database-level cross-contamination is permitted.

### 3.1 D1 Instance Creation
1. Run the wrangler command to create the production D1 database:
   ```bash
   npx wrangler d1 create smartfcra-prod-[tenant-name]
   ```
2. Capture the output containing the database name and the unique `database_id` UUID:
   ```text
   Created database "smartfcra-prod-[tenant-name]" with ID "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
   ```

### 3.2 Binding the Database
In `wrangler.jsonc` (or `wrangler.toml`), bind the D1 database to your Pages application:
```json
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "smartfcra-prod-[tenant-name]",
      "database_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
    }
  ]
}
```
*Note: Also configure this binding inside the Cloudflare Pages Web UI under **Settings** -> **Bindings** -> **D1 Database Binding** -> Variable name set to `DB`.*

### 3.3 Running Migrations & Seeding
Deploy the latest SQL schemas to establish tables for clients, reports, disputes, and compliance checklists.
1. Apply the baseline database migrations:
   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```
2. Populate the system seed data (e.g., standard FCRA litigation templates, statutory standards, federal dispute models):
   ```bash
   npx wrangler d1 execute DB --remote --file=./seed.sql
   ```

---

## 4. Stripe Customer Portal & Webhook Integrations

Monetization is tightly wired into the onboarding path. Tenant spaces are dynamically activated, restricted, or suspended based on Stripe subscription lifecycle events.

### 4.1 Stripe Product Setup
1. Set up three main subscription tiers in the tenant's Stripe Dashboard:
   * **Starter Plan**: Standard consumer file analysis (capped at 5 reports/month).
   * **Operator Plan**: Professional B2B credit repair dashboard with dispute letter templates (up to 50 reports/month).
   * **Enterprise Plan**: Unlimited ingestion, private-labeled dispute letters, API integrations, and direct Lob-automated mailing workflows.

### 4.2 Webhook Routing Configuration
1. Configure a new Stripe Webhook Endpoint pointing to:
   `https://[tenant-subdomain].pages.dev/api/v1/billing/webhook`
2. Subscribe to the following crucial events:
   * `checkout.session.completed`: Instantly provisions the workspace and sends the tenant administrator login link.
   * `customer.subscription.updated`: Tracks level shifts (e.g., upgrading from Starter to Operator, updating caps).
   * `customer.subscription.deleted`: Immediately sets the database status to `inactive`, rendering the upload dashboard hidden behind the firewall.

### 4.3 Stripe Customer Portal Integration
Ensure the Stripe Customer Portal is enabled so that business tenants can manage payment methods, download invoices, or cancel plans without manual support intervention. Link this directly to the account dashboard under the billing settings tab.

---

## 5. Lob Print & Mail Integration, Postage Billing & Certified Mail Callback

Automating the delivery of certified dispute letters is a core value proposition of SmartFCRA™ Supreme. **Lob** (`src/lib/lob.ts`) is the primary mailing vendor — it provides edge-native delivery of physically printed and USPS certified letters with return-receipt tracking, dispatched over a standard JSON REST API (HTTP Basic auth, secret key as username). Click2Mail is retained only as a legacy fallback integration and is not called by either default send path.

### 5.1 Automated Document Compilation
When an operator (or the client, from the portal) approves a letter for mailing:
1. The backend renders the letter to HTML (`letterHtmlFromPlainText`) or uses a pre-branded PDF/HTML body, formatted to fit standard letter-size double-window envelopes.
2. The sender address is mapped strictly to the tenant's firm letterhead settings (or a sensible default), and the recipient is set to the credit bureau's or furnisher's designated dispute address.

### 5.2 Postage billing gate (before Lob is ever called)
Every send first runs through `chargeMailPostage()` (`src/lib/mail-postage.ts`), which resolves postage from, in the org's configured payer order:
1. **Org prepaid wallet** (`org_mail_credits.balance_cents`) — funded via Stripe Checkout postage packs ($25/$100/$500 tiers, with bonus credit on larger packs).
2. **Client prepaid wallet** (`client_mail_credits.balance_cents`) — funded the same way, per client.
3. **Org saved card** — if the org has completed self-serve card unlock (Stripe Checkout setup mode), the letter is auto-charged to the saved payment method. Card data is held by Stripe only; it is never written to repo files or environment secrets.
4. **Comped** — orgs flagged `billing_comped` / `postage_comped` mail for free (used for demo/sandbox tenants).

If none of the above can cover the cost, the send is blocked with `MAIL_POSTAGE_REQUIRED` (no funds, no card) or `MAIL_CARD_REQUIRED` (org policy requires org-pay and no card is on file) — the API returns this **before** any request reaches Lob. Every charge, purchase, and comped send writes an entry to `mail_postage_ledger`.

### 5.3 Lob API Dispatch
Once postage clears, the compiled letter is dispatched via `sendLetterViaLob()`:

```
POST https://api.lob.com/v1/letters
Authorization: Basic base64(LOB_SECRET_KEY:)
Content-Type: application/json

{
  "description": "FCRA § 611 dispute — <account>",
  "to": { "name": "...", "address_line1": "...", "address_city": "...", "address_state": "...", "address_zip": "...", "address_country": "US" },
  "from": { "name": "...", "company": "...", "address_line1": "...", ... },
  "file": "<rendered letter HTML>",
  "color": false,
  "double_sided": true,
  "mail_type": "usps_first_class",
  "extra_service": "certified_return_receipt",
  "use_type": "operational"
}
```

`mail_type` maps from the resolved mail class (`usps_first_class` / `usps_standard`); `extra_service: certified_return_receipt` is added only for certified mail. Address verification is available via `POST /api/integrations/lob/verify-address` → Lob's `POST /v1/us_verifications`.

### 5.4 Tracking, Investigation Clocks & Callback Route
1. Lob's synchronous response (`letter.id`, `expected_delivery_date`, `tracking_number`) is written to `documents.mailing_id` / `documents.mail_class` immediately — no polling required to know the send succeeded.
2. An `investigation_clocks` row is created in the same request: FCRA § 611 30-day statutory deadline + 35-day operational (mail-buffer) deadline.
3. A generic, vendor-agnostic status callback remains available for any mailing vendor (including Lob, once a delivery-tracking webhook is wired) at `POST /api/billing/mailing-callback`, guarded by `MAILING_WEBHOOK_SECRET`. Payloads are persisted to `mailing_webhook_events` and update `documents.usps_tracking_number` / `response_due_date`. `LOB_WEBHOOK_SECRET` is reserved for a Lob-specific signed webhook once that route is implemented — today Lob status is push-only from the initial send response.

---

## 6. Security, Compliance, & Post-Onboarding Audit

Before handing the keys to a newly onboarded tenant, a strict security and compliance checklist must be passed.

1. **Verify SSL/TLS & CSP**: Ensure HTTP Strict Transport Security (HSTS) is active and the Content Security Policy (CSP) restricts script execution solely to trusted domains (such as Cloudflare, Stripe, and Tesseract CDN).
2. **Review Compliance Triggers**:
   * Test the credit report upload path. Ensure that if the compliance checkboxes (`#ingest-consent-fcra`, `#ingest-consent-croa`, `#ingest-consent-tsr`) are unchecked, the fallback modal triggers and successfully blocks ingestion until explicit certification is rendered.
3. **Conduct Penetration Probe**: Run a standard OWASP vulnerability check over the tenant's subdomains to verify no cross-tenant D1 data leakage is possible.

*Signed with commitment to absolute architectural integrity,*

**Rick Jefferson, Founder**  
*RJ Business Solutions*  
*Email: support@rjbusinesssolutions.org*  
*Web: https://rickjeffersonsolutions.com*  
