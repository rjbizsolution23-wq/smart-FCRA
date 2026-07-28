# Smart FCRA Supreme v2 — Separate Project (not the original)

This is an **isolated copy** of Smart FCRA Supreme. Goal: finish changes here, then ship as a **whole separate project**. It must **not** merge into or overwrite the original `smart-FCRA` / `smart-fcra` production app.

## Do not merge into `main`

The open PR on `smart-FCRA` is only a workbench while we edit. When v2 is done:

1. Create a **new private GitHub repo** (recommended name: `smart-FCRA-v2`) under `rjbizsolution23-wq`
2. Push this branch’s code there as that repo’s `main`
3. Deploy Cloudflare Pages project **`smart-fcra-v2`** (already configured)
4. Create a **new D1 database** `fcra-detector-v2` and paste its `database_id` into `wrangler.toml` / `wrangler.jsonc`
5. Leave the original `smart-FCRA` repo and `smart-fcra` Pages project untouched

This agent cannot create the new GitHub repo from here (token is read-only for repo creation). You (or an admin token) create `smart-FCRA-v2`, then ask the agent to push.

## Isolation map

| Resource | Original (leave alone) | This v2 copy |
|----------|------------------------|--------------|
| GitHub repo | `smart-FCRA` | `smart-FCRA-v2` (create when ready) |
| Working branch | `main` | `cursor/new-version-d5d1` (workbench) |
| Package | `fcra-detector` | `fcra-detector-v2` @ `2.0.0` |
| Pages project | `smart-fcra` | `smart-fcra-v2` |
| D1 database | `fcra-detector-production` | `fcra-detector-v2` (new DB; placeholder ID until created) |

## One-time Cloudflare setup for v2

```bash
# 1) New empty D1 (does not touch production)
npm run db:create
# Copy the returned database_id into wrangler.toml and wrangler.jsonc

# 2) Local DB for development
npm run db:migrate:local
npm run db:seed

# 3) Deploy only to the v2 Pages project
npm run deploy
```

## Safety guarantees on this branch

- Deploy scripts target **`smart-fcra-v2` only**
- CI deploy command targets **`smart-fcra-v2` only**
- D1 name is **`fcra-detector-v2`** — production DB id was removed from this branch
- Original `main` / `smart-fcra` stay unchanged unless someone merges this PR (don’t)
