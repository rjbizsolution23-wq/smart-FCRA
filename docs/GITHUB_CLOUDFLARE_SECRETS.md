# GitHub secrets for Cloudflare Pages (`smart-fcra-v2`)

PR preview and production deploys use `cloudflare/wrangler-action@v3` with:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

These are **GitHub Actions secrets**, not values in git.

## Add them

1. Cloudflare Dashboard → My Profile → API Tokens → Create Token  
   Use **Edit Cloudflare Pages** (or a custom token with Account · Cloudflare Pages · Edit, plus D1/R2 if you also run `d1-backup.yml`).
2. Copy the account ID from the right sidebar of the Cloudflare dashboard.
3. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**  
   - Name: `CLOUDFLARE_API_TOKEN`  
   - Name: `CLOUDFLARE_ACCOUNT_ID`
4. Create a private, backup-only R2 bucket, then add an Actions repository variable named `D1_BACKUP_BUCKET` with that bucket name. Do not bind this bucket to the application Worker.
5. Re-run **Smart FCRA v2 — PR Preview Deploy** on the open PR.

Until both secrets exist, preview workflows skip Pages deploy and comment on the PR instead of failing unit tests. The manual production workflow fails closed if the secrets or private backup-bucket variable are missing.
