#!/usr/bin/env bash
set -euo pipefail
# Usage:
#   export CLOUDFLARE_API_TOKEN=...
#   export CLOUDFLARE_ACCOUNT_ID=...
#   ./scripts/deploy-spa-hotfix.sh
cd "$(dirname "$0")/.."
npm ci
npm run build
node --check dist/static/app.js
npx wrangler pages deploy dist --project-name=smart-fcra-v2
echo "Deployed. Hard-refresh https://smart-fcra-v2.pages.dev"
