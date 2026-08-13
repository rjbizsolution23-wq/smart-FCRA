# ARCHIVED — unused React prototypes

**Do not import this folder into the production Worker.**

The live UI is `public/static/app.js` (SPA) + Hono in `src/index.tsx`.

These React components (`src/frontend/components/*`) were an earlier Vite/React experiment. They are kept as UX reference only. Vite's Cloudflare Pages build entry is `src/index.tsx` and does not bundle this tree.

If you port a pattern (tri-bureau compare, litigation score card), copy the UX into `app.js` — do not mount a second React root.
