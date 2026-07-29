# Legacy React prototypes (not in production build)

These components under `src/frontend/` are **design prototypes** and are **not** bundled by Vite into the live Cloudflare Pages app.

**Production UI** is the SPA in `public/static/app.js`.

Do not import these into `src/index.tsx` unless you intentionally migrate a feature into the Vite build. Prefer porting UX patterns into `app.js` (as done for tri-bureau comparison and fundability wizards).

Kept for reference only — see `IMPLEMENTATION_SUMMARY.md` for original component inventory.
