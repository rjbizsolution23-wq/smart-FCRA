# Smart FCRA Supreme V2 — Master Production Setup & Migration Guide

**Last Updated:** 2026-08-28 (UTC)  
**Status:** Code verified & pushed to `codex/v2-backend-hardening` (Commit: `c7bb0f7`)  
**Target Repository:** `https://github.com/rjbizsolution23-wq/smart-FCRA-v2` (Private)  
**Pages Project:** `smart-fcra-v2` (`https://smart-fcra-v2.pages.dev`)  
**Target Database:** `fcra-detector-v2` (`ae28993e-1c98-4f4e-a73d-42ae4337424d`)  

---

## 1. Quick Troubleshooting: Why `smart-FCRA-v2` Didn't Show in GitHub

When you went to the GitHub App installation settings to select `smart-FCRA-v2`, it wasn't visible in the dropdown list. Here is why:
- **Reason:** Your GitHub account has over 100 repositories. GitHub only renders the first 20 repositories alphabetically in that dropdown menu. Since `smart-FCRA-v2` starts with `s`, it is hidden by default.

### The 2-Click Fix (Fastest):
1. Go to: **[https://github.com/settings/installations](https://github.com/settings/installations)**
2. Click **Configure** next to **Arena AI Coding Agent**.
3. Under **Repository access**, select the radio button **"All repositories"**.
4. Click the green **Save** button.
*(This gives the bot access to `smart-FCRA-v2` immediately with zero searching).*

### Alternative: Filter by Name
If you prefer "Only select repositories":
1. Click the **Select repositories** dropdown.
2. Click inside the **"Search repositories..."** text input box at the top of the menu.
3. Type: `smart-FCRA-v2`.
4. Check the box next to `rjbizsolution23-wq/smart-FCRA-v2` and click **Save**.

*(Note: If you haven't created the repository on GitHub yet, go to [https://github.com/new](https://github.com/new), name it `smart-FCRA-v2`, set it to **Private**, and click **Create repository**).*

---

## 2. Pushing the V2 Code into `smart-FCRA-v2`

Once access is granted, the bot can push the branch directly. If you ever want to push it directly from your terminal or command line:

```bash
# 1. Clone or navigate to the repository
git clone https://github.com/rjbizsolution23-wq/smart-FCRA.git
cd smart-FCRA

# 2. Fetch the hardened V2 branch
git fetch origin codex/v2-backend-hardening
git switch codex/v2-backend-hardening

# 3. Point remote to your new private V2 repository
git remote add v2 https://github.com/rjbizsolution23-wq/smart-FCRA-v2.git

# 4. Push directly as main of the new repo
git push -u v2 codex/v2-backend-hardening:main
```

Verify in GitHub: the default branch `main` of `smart-FCRA-v2` will show commit `c7bb0f7` ("chore(v2): harden release and backup workflows").

---

## 3. GitHub Repository Hardening & Secrets

In **https://github.com/rjbizsolution23-wq/smart-FCRA-v2/settings**:

### A. Branch Protection (`Settings -> Branches -> Add branch protection rule`)
- **Branch name pattern:** `main`
- Check: **Require a pull request before merging**
- Check: **Require status checks to pass before merging** (select `validate-and-test`)
- Check: **Require conversation resolution before merging**
- Check: **Do not allow bypassing the above settings**
- Check: **Block force pushes** & **Do not allow deletions**

### B. Security (`Settings -> Code security and analysis`)
- Enable: **Secret scanning**
- Enable: **Push protection**

### C. Actions Secrets (`Settings -> Secrets and variables -> Actions`)
Under **Repository secrets**, click **New repository secret**:
1. `CLOUDFLARE_API_TOKEN` — Cloudflare API token with permissions:
   - Account / Cloudflare Pages / Edit
   - Account / D1 / Edit
   - Account / Workers R2 Storage / Edit
   - Account / Workers KV Storage / Edit
2. `CLOUDFLARE_ACCOUNT_ID` — Your 32-character Cloudflare Account ID (found on the Cloudflare Dashboard right sidebar).

Under **Repository variables** (tab next to Secrets):
1. `D1_BACKUP_BUCKET` = `smart-fcra-v2-backups` (Used by CI/CD to snapshot D1 before any deploy).

---

## 4. Cloudflare Infrastructure: Databases, Storage & AI

Run these commands with Wrangler CLI or configure them in the Cloudflare Dashboard:

### A. D1 Database (`fcra-detector-v2`)
The production V2 configuration in `wrangler.toml` expects:
- Database Name: `fcra-detector-v2`
- Database ID: `ae28993e-1c98-4f4e-a73d-42ae4337424d`

**To verify or create:**
```bash
# Check if it exists
npx wrangler d1 list

# If creating a new one:
npx wrangler d1 create fcra-detector-v2
# (If a new ID is returned, update database_id in wrangler.toml and wrangler.jsonc)

# Apply all 46 database migrations:
npx wrangler d1 migrations apply fcra-detector-v2 --remote
```

### B. R2 Storage Buckets
Two buckets are required:
1. **Document Storage Bucket:** `smart-fcra-v2-docs` (Stores uploaded credit reports, OCR outputs, dispute PDFs, letter attachments).
2. **Database Backup Bucket:** `smart-fcra-v2-backups` (Stores automated pre-release SQL snapshots created by GitHub Actions).

```bash
# Create R2 document bucket
npx wrangler r2 bucket create smart-fcra-v2-docs

# Create R2 backup bucket
npx wrangler r2 bucket create smart-fcra-v2-backups
```
*Note: Both buckets MUST remain strictly private with no public access.*

### C. KV Namespace (`RATE_LIMIT_KV`)
Stores rate limiting, session throttling, and temporary verification states.
```bash
# Check existing namespaces
npx wrangler kv namespace list

# If creating fresh:
npx wrangler kv namespace create RATE_LIMIT_KV
# Put the resulting ID into wrangler.toml:
# id = "e26124f39fef402aa0f118d5121b7a2e"
```

### D. Workers AI
Workers AI is enabled directly through the binding `AI` in `wrangler.toml` (`[ai] binding = "AI"`). No separate database creation is needed.

---

## 5. Cloudflare Pages Bindings & Environment Variables

Go to **Cloudflare Dashboard -> Workers & Pages -> Pages -> `smart-fcra-v2` -> Settings**:

### A. Bindings (`Settings -> Functions -> Compatibility flags & Bindings`)
Under **Compatibility flags**:
- Add `nodejs_compat` for Production and Preview.
- Compatibility date: `2026-04-13` (or latest).

Under **Bindings**, connect the 4 resources:
1. **D1 database binding:**
   - Variable name: `DB`
   - D1 Database: `fcra-detector-v2`
2. **R2 bucket binding:**
   - Variable name: `DOCS`
   - R2 Bucket: `smart-fcra-v2-docs`
3. **KV namespace binding:**
   - Variable name: `RATE_LIMIT_KV`
   - KV Namespace: `RATE_LIMIT_KV`
4. **Workers AI binding:**
   - Variable name: `AI`

---

### B. Production Environment Variables & Encrypted Secrets
In **Settings -> Environment variables**, add the following (mark sensitive items as **Encrypt**):

| Variable Name | Type | Value / Purpose |
|---|---|---|
| `ENVIRONMENT` | Plaintext | `production` |
| `FRONTEND_URL` | Plaintext | `https://smartfcra.com` |
| `APP_BASE_URL` | Plaintext | `https://smartfcra.com` |
| `PII_ENCRYPTION_KEY` | **Secret** | 32+ character AES-256 key *(CRITICAL: if migrating tenants from V1, use the EXACT same key as V1)* |
| `MAILING_WEBHOOK_SECRET` | **Secret** | Random 32+ char secret for Lob delivery webhooks |
| `PLATFORM_BOOTSTRAP_EMAIL` | **Secret** | Initial super-admin login email |
| `PLATFORM_BOOTSTRAP_PASSWORD`| **Secret** | Strong bootstrap password (rotate after creating admin) |
| `STAFF_MFA_REQUIRED_ALL` | Plaintext | `true` |
| `LOB_SECRET_KEY` | **Secret** | `live_...` or `test_...` (Start with `test_...` for validation) |
| `LOB_MODE` | Plaintext | `test` (Switch to `live` only when certified) |
| `STRIPE_API_KEY` | **Secret** | `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | **Secret** | `whsec_...` (From Cloudflare webhook endpoint) |
| `STRIPE_PROFESSIONAL_PRICE_ID` | Plaintext | `price_...` |
| `STRIPE_UNLIMITED_PRICE_ID` | Plaintext | `price_...` |
| `STRIPE_ENTERPRISE_PRICE_ID` | Plaintext | `price_...` |
| `RESEND_API_KEY` | **Secret** | `re_...` (For password resets and client notifications) |
| `SMARTCREDIT_CLIENT_KEY` | **Secret** | SmartCredit integration key |
| `SMARTCREDIT_CLIENT_SECRET` | **Secret** | SmartCredit secret |
| `GHL_PIT_TOKEN` | **Secret** | GoHighLevel Private Integration Token |
| `GHL_LOCATION_ID` | Plaintext | GoHighLevel Location ID |

---

## 6. Multi-Tenant Wildcard DNS & Domain Setup

Smart FCRA Supreme V2 uses a single deployment serving unlimited tenants via dynamic subdomains (`https://{subdomain}.smartfcra.com`).

In **Cloudflare Dashboard -> DNS Records** for `smartfcra.com`:

| Type | Name | Target / Content | Proxy Status |
|---|---|---|---|
| CNAME | `@` | `smart-fcra-v2.pages.dev` | Proxied (Orange cloud) |
| CNAME | `*` | `smart-fcra-v2.pages.dev` | Proxied (Orange cloud) |
| CNAME | `app` | `smart-fcra-v2.pages.dev` | Proxied (Orange cloud) |

In **Cloudflare Pages -> `smart-fcra-v2` -> Custom domains**:
1. Click **Set up a custom domain**.
2. Add `smartfcra.com`.
3. Add `*.smartfcra.com` (Universal SSL automatically provides wildcard HTTPS coverage).

---

## 7. Step-by-Step Tenant & Data Migration (V1 -> V2)

To move tenants from V1 (`fcra-detector-production`) to V2 without downtime:

### Step 1: Backup both databases
```bash
# Export V1 production data
npx wrangler d1 export fcra-detector-production --remote --output=backups/v1_pre_migration.sql

# Export V2 database (state capture)
npx wrangler d1 export fcra-detector-v2 --remote --output=backups/v2_pre_migration.sql
```

### Step 2: Create a fresh migration target
```bash
# Create staging database to verify data before touching live V2
npx wrangler d1 create fcra-detector-v2-migrated
```

### Step 3: Import V1 data & apply V2 schema
```bash
# Import V1 dump into the target
npx wrangler d1 execute fcra-detector-v2-migrated --remote --file=backups/v1_pre_migration.sql

# Apply all 46 V2 migrations to upgrade the schema
npx wrangler d1 migrations apply fcra-detector-v2-migrated --remote
```

### Step 4: Run Data Integrity & Orphan Checks
Execute these queries to ensure 100% data integrity (every check must return `0`):
```bash
# Check orphaned clients
npx wrangler d1 execute fcra-detector-v2-migrated --remote --command="SELECT count(*) AS orphans FROM clients c LEFT JOIN organizations o ON c.org_id = o.id WHERE o.id IS NULL;"

# Check orphaned credit reports
npx wrangler d1 execute fcra-detector-v2-migrated --remote --command="SELECT count(*) AS orphans FROM credit_reports r LEFT JOIN clients c ON r.client_id = c.id WHERE c.id IS NULL;"

# Check orphaned dispute documents
npx wrangler d1 execute fcra-detector-v2-migrated --remote --command="SELECT count(*) AS orphans FROM documents d LEFT JOIN clients c ON d.client_id = c.id WHERE c.id IS NULL;"
```

### Step 5: Sync R2 Storage Objects
Sync uploaded credit reports, PDFs, and dispute letters from the V1 bucket to `smart-fcra-v2-docs`:
```bash
# Using AWS CLI with Cloudflare R2 endpoint:
aws s3 sync s3://YOUR_V1_BUCKET_NAME s3://smart-fcra-v2-docs \
  --endpoint-url https://YOUR_CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com
```

---

## 8. Continuous Deployment Workflow

Production deploys are automated and protected via `.github/workflows/production-deploy.yml`:
1. Go to **Actions** tab in `smart-FCRA-v2`.
2. Select **SmartFCRA Supreme — Continuous Integration & Deployment**.
3. Click **Run workflow**.
4. In the confirmation box, enter: `deploy-smart-fcra-v2`.
5. The workflow automatically:
   - Runs all unit, API, and multi-tenant isolation tests.
   - Builds the production SPA bundle and validates JavaScript syntax.
   - Dumps a pre-release D1 backup into the private R2 backup bucket.
   - Applies any pending D1 migrations.
   - Deploys to Pages project `smart-fcra-v2`.
   - Polls `https://smart-fcra-v2.pages.dev/api/health/ready` until confirmed live.

---

## 9. Verification & Cutover Checklist

Before switching customer traffic:
- [ ] `/api/health/ready` returns `{ "ready": true, "environment": "production" }`
- [ ] Log in with Super Admin account
- [ ] Check Tenant Isolation: Log in as Tenant A and verify Tenant B data is invisible
- [ ] Test PDF Generator: Generate a dispute letter; check 8.5" x 11" US Letter format (612x792 pt) and tenant branding
- [ ] Test OCR: Upload a sample 3-bureau credit report PDF; confirm accounts and inquiries extract accurately
- [ ] Test Mail Service: Submit a test mailing in Lob `test` mode; verify letter preview and investigation clock
- [ ] Switch apex DNS CNAME to point to `smart-fcra-v2.pages.dev`
- [ ] Keep V1 database intact as rollback safety net
