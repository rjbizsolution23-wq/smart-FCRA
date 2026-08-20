# Cloudflare Multi-Tenant Setup — `*.smartfcra.com`

Smart FCRA runs as **one** Cloudflare Pages project with **one** D1 database. Each credit repair company gets a workspace at:

```text
https://{subdomain}.smartfcra.com
```

Example: `https://newcreditservices.smartfcra.com`

## 1. DNS (Cloudflare Dashboard)

In the **smartfcra.com** zone:

| Type  | Name | Content                    | Proxy |
|-------|------|----------------------------|-------|
| CNAME | `@`  | `smart-fcra-v2.pages.dev`  | Proxied |
| CNAME | `*`  | `smart-fcra-v2.pages.dev`  | Proxied |
| CNAME | `app`| `smart-fcra-v2.pages.dev`  | Proxied |

The wildcard `*` record routes every tenant subdomain to the same Pages deployment. The Worker resolves `{subdomain}` → `organizations.subdomain` in D1.

Optional apex/www records already point to the same Pages project.

## 2. TLS

Cloudflare **Universal SSL** covers:

- `smartfcra.com`
- `*.smartfcra.com` (wildcard certificate)

No per-tenant certificate is required for subdomains.

Custom domains (e.g. `portal.newcreditservices.com`) need a separate CNAME + verification in Settings → Custom Domain.

## 3. Pages Custom Domains

In **Workers & Pages → smart-fcra-v2 → Custom domains**, add:

- `smartfcra.com`
- `*.smartfcra.com` (wildcard custom domain — Cloudflare Pages supports this on paid plans)

If wildcard custom domain is unavailable on your plan, add tenant subdomains individually or rely on the DNS CNAME `*` → pages.dev (still works with Universal SSL on the zone).

## 4. Environment variables (production)

Set via `wrangler pages secret put` or Cloudflare Dashboard → Settings → Environment variables:

| Variable | Purpose |
|----------|---------|
| `PII_ENCRYPTION_KEY` | 32+ char key for AES-256-GCM |
| `STRIPE_API_KEY` | Platform billing |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `HUGGINGFACE_TOKEN` | Optional AI inference |
| `PLATFORM_OWNER_EMAILS` | Super admin allowlist |

Do **not** set per-tenant secrets here — tenant integrations live in D1 encrypted vault per `org_id`.

## 5. D1 migration

Apply migration `0035_tenant_subdomain_blueprint.sql`:

```bash
npm run db:migrate:remote
```

Adds: `organizations.subdomain`, blueprint columns, `tenant_provision_log`.

## 6. CREATE BUSINESS (Super Admin)

Platform owner → **Tenants & Software** → **CREATE BUSINESS**

Creates:

- Organization row with `subdomain`
- Owner admin user
- Branding + letterhead in `settings`
- Draft marketing campaigns from blueprint
- Portal URL: `https://{subdomain}.smartfcra.com/app`

## 7. OAuth hub (central callbacks)

Integration OAuth callbacks use the platform host:

```text
https://app.smartfcra.com/api/oauth/{provider}/callback
```

Signed `state` includes `subdomain` and `orgId`; after token exchange the user returns to:

```text
https://{subdomain}.smartfcra.com/app
```

Register redirect URIs once in Meta/Google/GHL — not per tenant.

## 8. Architecture rules

- **Never** fork the repo per customer
- **Never** create separate D1/R2 per tenant (unless Enterprise isolated SKU with automation)
- Tenant differences = **configuration** in D1 (`settings`, branding, integrations)
- Compliance + security = **globally locked** in code

## 9. Verify

```bash
curl -s "https://newcreditservices.smartfcra.com/api/public/tenant-by-host?host=newcreditservices.smartfcra.com" | jq .
```

Expected: `{ "found": true, "orgId": "...", "portalUrl": "https://newcreditservices.smartfcra.com", "theme": { ... } }`
