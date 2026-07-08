# SmartFCRA Supreme — B2B Tenant Onboarding SOP (v1.0)
## Multi-Tenant Setup, Cloudflare Pages, D1 Database, Stripe Webhooks, & Click2Mail Integrations

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
| `CLICK2MAIL_USERNAME` | Secret | Tenant-specific Click2Mail account username. |
| `CLICK2MAIL_PASSWORD` | Secret | Tenant-specific Click2Mail account password / token. |
| `CLICK2MAIL_XML_URL` | Text | `https://xml.click2mail.com` (Production API endpoint) |
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
   * **Enterprise Plan**: Unlimited ingestion, private-labeled dispute letters, API integrations, and direct Click2Mail automated workflows.

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

## 5. Click2Mail API Integration & Certified Mail Callback

Automating the delivery of certified dispute letters is a core value proposition of SmartFCRA™ Supreme. Click2Mail allows edge-native delivery of physically printed and USPS certified letters with dynamic return-receipt tracking.

### 5.1 Automated Document Compilation
When an operator approves a letter inside the **Dispute Cockpit Workspace**:
1. The backend compiles the HTML template into a high-fidelity, black-and-white, standard letter-size PDF (using standard margins to fit double-window envelopes).
2. The sender address is mapped strictly to the tenant's physical business address, and the recipient is set to the credit bureau's designated dispute address (Equifax, Experian, or TransUnion).

### 5.2 Click2Mail XML API Dispatch
A POST request containing Click2Mail formatting XML and the compiled document is dispatched to:
`https://xml.click2mail.com/xml/api/documents`

Example payload structure for USPS Certified Mail with Return Receipt:
```xml
<document>
  <username>${CLICK2MAIL_USERNAME}</username>
  <password>${CLICK2MAIL_PASSWORD}</password>
  <documentClass>Certified Mail</documentClass>
  <layoutName>Letter 8.5 x 11</layoutName>
  <productionType>Print and Mail</productionType>
  <envelopeType>Double Window</envelopeType>
  <deliveryType>Certified Mail with Electronic Return Receipt</deliveryType>
</document>
```

### 5.3 Click2Mail Tracking & Certified Callback Route
To feed the tracking status back into the tenant's active dashboard, click2mail triggers webhook notifications upon delivery milestones.
1. The tenant system registers a callback URL:
   `https://[tenant-subdomain].pages.dev/api/v1/disputes/callback-tracker`
2. When USPS scans the certified barcode, Click2Mail POSTs status updates (e.g., `In Transit`, `Out for Delivery`, `Delivered`).
3. The system captures this payload, updates the `disputes` table, records the digital return receipt, and highlights the successful delivery in green inside the client's timeline.

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
