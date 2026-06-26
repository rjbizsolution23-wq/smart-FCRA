# Infrastructure — FCRA Supreme Violation Detector

## Provider: Cloudflare
The entire platform is hosted on Cloudflare to minimize latency and maximize uptime.

## Resources
- **Cloudflare Pages**: Hosts the Next.js frontend SPA.
- **Cloudflare Workers**: Handles the Hono API and analysis engine.
- **Cloudflare D1**: Primary SQLite database for relational state.
- **Cloudflare KV**: Used for session persistence and environment configuration.
- **Cloudflare R2**: Object storage for exported legal documents.
- **Cloudflare AI Gateway**: (Optional/Planned) For LLM-assisted document customization.

## Bindings (wrangler.jsonc)
- `DB`: D1-Database
- `CACHE`: KV-Namespace
- `DOCS`: R2-Bucket
- `STRIPE_API_KEY`: Secret
- `STRIPE_WEBHOOK_SECRET`: Secret
<truncated 52 bytes>
