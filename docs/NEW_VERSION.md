# Smart FCRA Supreme v2 — Separate Project (not the original)

This is an **isolated copy** of Smart FCRA Supreme. Goal: finish changes here, then ship as a **whole separate project**. It must **not** merge into or overwrite the original `smart-FCRA` / `smart-fcra` production app.

## Do not merge into `main`

The open PR on `smart-FCRA` is only a workbench while we edit. When v2 is done:

1. Create a **new private GitHub repo** (recommended name: `smart-FCRA-v2`) under `rjbizsolution23-wq`
2. Push this branch’s code there as that repo’s `main`
3. Deploy Cloudflare Pages project **`smart-fcra-v2`** (already configured)
4. Create a **new D1 database** `fcra-detector-v2` and paste its `database_id` into `wrangler.toml` / `wrangler.jsonc`
5. Leave the original `smart-FCRA` repo and `smart-fcra` Pages project untouched

See **[PRODUCTION_LAUNCH_CHECKLIST.md](./PRODUCTION_LAUNCH_CHECKLIST.md)** for secrets, migrations, and go-live steps.

## Isolation map

| Resource | Original (leave alone) | This v2 copy |
|----------|------------------------|--------------|
| GitHub repo | `smart-FCRA` | `smart-FCRA-v2` (create when ready) |
| Working branch | `main` | `cursor/new-version-d5d1` (workbench) |
| Package | `fcra-detector` | `fcra-detector-v2` @ `2.0.0` |
| Pages project | `smart-fcra` | `smart-fcra-v2` |
| D1 database | `fcra-detector-production` | `fcra-detector-v2` |

## Local

```bash
npm install
npm run db:reset
npm run preview
# demo@example.com / demo123456
```
