# Smart FCRA Supreme — New Version (v2)

This branch is a clean clone of production `main`, versioned as **2.0.0**, so changes can be developed and deployed independently of the live `smart-fcra` site.

## Identity

| Item | v1 (production) | v2 (this branch) |
|------|-----------------|------------------|
| Package | `fcra-detector` | `fcra-detector-v2` |
| App version | `1.0.0` | `2.0.0` |
| Wrangler / Pages project | `smart-fcra` | `smart-fcra-v2` |
| D1 database | `fcra-detector-production` | same binding (swap when ready for an isolated DB) |

## Deploy v2

```bash
npm run build
npx wrangler pages deploy dist --project-name smart-fcra-v2
```

## Next

Tell the agent what to change on this new version (UI, parsers, billing, ACR flows, branding, etc.).
