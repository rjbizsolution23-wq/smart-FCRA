# Handoff: RJ Business Solutions — Full Brand System v5.0

## Overview

This handoff packages the complete **RJ Business Solutions brand identity system** — a 50-surface, 17-section design library covering every touchpoint a modern service business needs: brand guidelines, landing pages, client portals, sales collateral, print stationery, social banners, ad creatives, video overlays, credit-tech deliverables, physical merch mockups, and internal team docs.

**Anchor experiences to implement first:**
1. `Brand Kit.html` — the source of truth for the visual system
2. `Landing Page.html` — the primary conversion surface
3. `Dashboard.html` — the authenticated client-portal shell
4. `Asset Pack.html` — the master index (can become a docs / design-system site)

Everything else (letterhead, invoice, business cards, banners, cards, etc.) is a print or one-off marketing surface that the developer can render server-side (as HTML → PDF/PNG via headless Chromium) or hand off to the client's design team as static assets.

---

## About the Design Files

The files in this bundle are **design references created in HTML** — high-fidelity prototypes showing intended look, layout, typography, spacing, and interactions. They are **not production code to copy directly.**

The task is to **recreate these HTML designs in the target codebase's existing environment** (Next.js, Nuxt, SvelteKit, Remix, native mobile, whatever the stack is) using the codebase's established patterns and component library. If no codebase exists yet, choose the framework that fits the project (recommendation: **Next.js 15+ App Router + Tailwind v4 + shadcn/ui**) and implement there.

The one exception: `brand.css` is a portable design-token stylesheet that can be dropped into any project as-is — it's just CSS custom properties + font imports.

---

## Fidelity

**High-fidelity (hifi).** Every design in this pack ships with:
- Exact hex color values (all pulled from a fixed 8-color palette)
- Named typographic scale (Space Grotesk display + Inter body, weights 400–700)
- Explicit spacing (px values, not "medium/large" abstractions)
- Border radii, shadow specs, gradient definitions
- Hover states on interactive elements (buttons, tiles, cards)
- Print-ready sizing on physical surfaces (A4, business card, envelope, banner dimensions)

The developer should **recreate the UI pixel-perfectly** using the codebase's existing component primitives — `<Button>`, `<Card>`, `<Input>`, etc. If those don't exist, build them using shadcn/ui as the base and skin them with the tokens in `brand.css`.

---

## Screens / Views

Below is the full inventory. Each entry: name, purpose, source file, and implementation notes.

### 1. Brand Kit (`Brand Kit.html`)

- **Purpose:** Source-of-truth brand guidelines document. 9 sections: cover, essence, logo system, color system, typography, voice & tone, components, applications, meta/schema pack.
- **Layout:** Full-bleed sections stacked vertically. Alternating light/dark section backgrounds. Each section has a numbered eyebrow label (`01 Brand Essence`, `02 Logo System`, etc.).
- **Implementation:** Build as `/brand` route in the app OR export as a standalone Storybook / Zeroheight / Notion docs site. The color swatch grid, gradient cards, and type-scale table become reusable design-system reference components.

### 2. Landing Page (`Landing Page.html`) ⭐ Priority

- **Purpose:** Primary marketing homepage. Converts cold traffic to booked calls.
- **Layout:** 13 stacked sections:
  1. Sticky nav (backdrop-blur, brand + links + Sign In + Book Call CTA)
  2. Hero (kicker + gradient headline + subheadline + dual CTA + 4-stat row)
  3. Trust logos strip
  4. Problem (3 red-accent pain cards)
  5. Solution (3 gradient-numbered solution cards)
  6. Services grid (12 cards, 4-col)
  7. Metrics (4-col big number grid)
  8. Testimonial hero (dark gradient card with stars + quote + attribution)
  9. Pricing (3-tier, middle featured/scaled up)
  10. FAQ (2-col accordion-styled)
  11. Final CTA (full-bleed blue gradient section)
  12. Footer (4-col with brand block)
- **Interactions:**
  - Nav: sticky on scroll, subtle backdrop blur
  - CTAs: hover state = `translateY(-1px)` + shadow lift
  - Solution cards: hover = `translateY(-4px)`
  - Pricing "featured" card: `transform: scale(1.03)` at rest
  - FAQ items: expand/collapse on click (build as `<details>` or Radix Accordion)
- **State:** Static content in v1. Later: pull testimonials + metrics from CMS.

### 3. Dashboard (`Dashboard.html`) ⭐ Priority

- **Purpose:** Authenticated client portal. Growth Engine command center.
- **Layout:** 2-column app shell — 240px navy sidebar + main content area.
  - **Sidebar:** brand mark, 3 nav sections (Overview / Growth Engine / Settings), each nav item with icon square + label + optional badge count. Active state = blue gradient background. Sticky "Talk to Rick" CTA card at bottom.
  - **Main:** Top bar (greeting + search + notification icons + avatar), then 4 KPI cards (first one featured with dark navy background), then 2-column grid (2fr:1fr) for chart card + pipeline card, then another 2-col grid for leads table + live activity feed.
- **Components:**
  - **KPI card:** label + value + trend badge (green up / red down). Featured variant swaps to `--grad-dark` background.
  - **Growth chart:** inline SVG area chart with 2 gradient-filled paths (blue for booked calls, sky for qualified). 30D default. Filter chips at top-right (7D / 30D / 90D).
  - **Pipeline card:** 4 stages, each with name + description + progress bar + big number.
  - **Leads table:** 5 columns (Lead with avatar / Source / Status pill / Value). Status pill variants: Hot (amber), Qualified (blue), Booked (green), Nurture (slate).
  - **Activity feed:** 5 items with colored icon square + text + timestamp.
- **Interactions:**
  - Sidebar nav items: hover = translucent white background, active = full blue gradient
  - Filter chips: click to switch chart timeframe
  - Table rows: hover = light blue background (add if not present)
  - Notification icon: red dot indicator for unread
- **State:** Real-time subscription for activity feed. Chart data + KPIs from an analytics endpoint. Notification count from unread messages.

### 4. Asset Pack Index (`Asset Pack.html`)

- **Purpose:** Master hub linking all 50 branded surfaces. Also a great pattern for building an internal design-system docs site.
- **Layout:** Hero card at top + 17 section groups, each with 3–5 tile cards in a 3-column grid.
- **Tile card:** thumbnail block (dark/gradient/light/pattern) with tiny brand mark + category label + title + description + specs footer + arrow.
- **Implementation:** If the client wants an internal design-system site, this is your template. Route: `/design-system` or `/brand/assets`.

### 5–50. All Other Surfaces

Grouped by section (see `Asset Pack.html` for the full index). Each is a self-contained HTML file that renders at its intended physical or digital dimension. They fall into 4 categories:

- **Print/PDF surfaces** (Letterhead, Invoice, Business Cards, Proposal, Contract Cover, One-Pager, Rate Card, Case Study, Growth Playbook, Employee Handbook, Contract Addendums, Credit Report, Dispute Letter, Certificate, Envelope, Folder, Holiday Cards): render server-side via headless Chromium (Puppeteer / Playwright) → PDF. Templating variables are all clearly marked as `[Client Name]`, `[Amount]`, `[Date]`, etc.
- **Social/display images** (Social Banners, Testimonial Cards, Backgrounds, Zoom Backgrounds, Phone Wallpapers, Video Thumbnails, Podcast Cards, Ad Creatives, Testimonial Video, Stickers + Tags, App Store Screenshots, Popup Display, Merch Mockups, Wrapping Paper): render as PNG via headless Chromium `page.screenshot()` at the source viewport size, then upload to CDN.
- **Email templates** (Email Header, Email Signature, Email Newsletter, Email Drip): the table-based inner markup is directly transferable to any ESP (Mailchimp, ConvertKit, Klaviyo, GoHighLevel). Extract the table markup only, drop into the ESP's HTML editor.
- **Interactive prototypes** (Landing Page, Dashboard, Brand Kit, Asset Pack, Pitch Deck, Utility Pages, PWA Manifest, Avatars + Favicons, SMS Templates): recreate as actual routes/components in the target app.

Full list with source file paths in the **Files** section at the bottom.

---

## Interactions & Behavior

- **Buttons.** All CTAs use `.btn` base + one of: `.btn-primary` (solid blue), `.btn-gradient` (blue→sky gradient), `.btn-dark` (navy), `.btn-ghost` (outlined), `.btn-light` (light blue bg).
  - Hover: `translateY(-1px)` + shadow increase (150ms ease).
  - Focus visible: 4px outline in `rgba(37,99,235,0.12)`.
- **Cards / Tiles.** Hover: `translateY(-2px)` + border color shift to `--rj-blue` + shadow increase.
- **Inputs.** Focus state: border becomes `--rj-blue` + 4px halo in `rgba(37,99,235,0.12)`.
- **Sticky nav.** `position: sticky; top: 0; backdrop-filter: blur(20px);` with `background: rgba(255,255,255,0.85)`.
- **FAQ.** Native `<details>` or Radix Accordion. Rotate `+` → `−` on open. Height animation via CSS `interpolate-size: allow-keywords` or animate `max-height`.
- **Dashboard chart.** SVG area chart. On hover of the chart area, show a vertical crosshair line + tooltip with the day's booked-calls + qualified-leads values. Data source: analytics endpoint returning `{ date, bookedCalls, qualifiedLeads }[]`.
- **Notification dot.** Absolute-positioned 8×8 red circle with 2px white border, top-right of icon button. Only visible when `unreadCount > 0`.
- **Progress bars.** In the Pipeline card, `width: %` animates from 0 to target on mount (500ms ease-out).
- **Table row selection.** Click a lead row → open a side drawer with full lead detail.

---

## Responsive Behavior

Sources are drawn at a **fixed design width per surface**:
- Print: A4 portrait (794×1123) or landscape (1123×794), business card (700×400), envelope, folder, etc. — these render at a **fixed physical size** and shouldn't reflow.
- Landing Page: authored at **1440px wide, mobile-first target**. Implement with a standard `sm/md/lg/xl` breakpoint set. Below `md`: nav collapses to hamburger, hero stats stack 2×2, grids collapse to single column, pricing cards stack.
- Dashboard: authored at **1440×1000**. Below `md`: sidebar collapses to a slide-out drawer triggered by hamburger. KPI grid: 4-col → 2-col → 1-col. Chart + pipeline stack. Table becomes card list.
- Social banners: **fixed dimensions per platform** (LinkedIn 1584×396, X 1500×500, IG 1080×1080, story 1080×1920). No responsive behavior — these are exported as PNG.

---

## State Management

- **Auth.** Landing page + marketing surfaces = public. Dashboard = requires authenticated user. Suggested: NextAuth / Supabase Auth / Clerk.
- **Dashboard data.**
  - `useKpis()` → `{ mrr, bookedCalls, responseTime, conversionRate }` with `trend` per metric
  - `useGrowthChart(timeframe)` → `{ date, bookedCalls, qualifiedLeads }[]`
  - `usePipeline()` → `[{ stage, count, capacity }]` for the 4 stages
  - `useLeads({ limit, filter })` → paginated lead list
  - `useActivityFeed()` → real-time subscription (WebSocket / Server-Sent Events)
- **Landing page.** Fully static. Form submissions POST to a lead-capture endpoint that triggers the SMS/email welcome sequences documented in `SMS Templates.html` + `Email Drip.html`.
- **Print/PDF surfaces.** Server-rendered from a template + data payload. State = the data payload alone. Suggested pattern:
  ```ts
  POST /api/render/invoice
  Body: { clientName, lineItems, totals, paymentLink }
  Response: PDF binary
  ```

---

## Design Tokens

**Copy-paste from `brand.css`:**

```css
:root {
  /* Primary palette */
  --rj-blue:      #2563eb;   /* Primary CTA, links, focus */
  --rj-sky:       #0ea5e9;   /* Accents, gradient stop */
  --rj-deep:      #1e3a8a;   /* Section dividers, dark headers */
  --rj-navy:      #0f172a;   /* Body text, hero backgrounds */

  /* Neutrals */
  --rj-white:     #ffffff;
  --rj-soft:      #f8fafc;   /* Page background */
  --rj-light:     #eff6ff;   /* Section wash, hover */
  --rj-border:    #bfdbfe;
  --rj-muted:     #dbeafe;   /* Chips, badges */
  --rj-line:      #e2e8f0;   /* Borders, dividers */

  /* Semantic */
  --rj-success:   #10b981;
  --rj-warning:   #f59e0b;
  --rj-danger:    #ef4444;

  /* Text */
  --rj-text:       #0f172a;
  --rj-muted-text: #475569;

  /* Fonts */
  --font-head: "Space Grotesk", system-ui, sans-serif;
  --font-body: "Inter", system-ui, sans-serif;
  --font-mono: "Space Grotesk", ui-monospace, monospace;

  /* Gradients */
  --grad-primary: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
  --grad-dark:    linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #2563eb 100%);
  --grad-light:   linear-gradient(180deg, #ffffff 0%, #eff6ff 100%);
}
```

### Type Scale

| Role  | Size | Weight | Line-height | Letter-spacing | Font          |
|-------|------|--------|-------------|----------------|---------------|
| H1    | 72px | 600    | 1           | -0.02em        | Space Grotesk |
| H2    | 48px | 600    | 1.1         | -0.02em        | Space Grotesk |
| H3    | 28px | 600    | 1.2         | -0.01em        | Space Grotesk |
| H4    | 20px | 600    | 1.3         | -              | Space Grotesk |
| Body  | 16px | 400    | 1.6         | -              | Inter         |
| Small | 14px | 400    | 1.5         | -              | Inter         |
| Mono  | 12px | 600    | 1.4         | 0.14em uppercase | Space Grotesk |

### Spacing Scale (used consistently)

`4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · 40 · 48 · 56 · 64 · 80 · 100 · 120` px

Map to Tailwind: `1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 10, 12, 14, 16, 20, 24, 28`

### Border Radius

- `4px` — tight labels, badges
- `6–8px` — buttons, small chips
- `10–12px` — inputs, small cards
- `14–16px` — standard cards
- `20–24px` — hero cards, feature blocks
- `999px` — pill badges, tokens

### Shadows

- Card default: `0 20px 40px rgba(15,23,42,0.08)`
- Card hover / KPI: `0 20px 40px rgba(15,23,42,0.15)`
- Featured / hero: `0 30px 60px rgba(15,23,42,0.15)`
- CTA button: `0 4px 14px rgba(37,99,235,0.35)` (rest) → `0 8px 20px rgba(37,99,235,0.4)` (hover)
- Deep hero shadow: `0 30px 60px rgba(15,23,42,0.25)`

### Radial glow (recurring motif)

Used on almost every dark surface for depth. Formula:
```css
::after {
  content: "";
  position: absolute;
  right: -150px; top: -150px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(14,165,233,0.4) 0%, transparent 60%);
  filter: blur(60px);
  pointer-events: none;
}
```

---

## Assets

### Fonts

- **Space Grotesk** (headings/display) — loaded from Google Fonts.
- **Inter** (body/UI) — loaded from Google Fonts.

Both are declared in `brand.css` via `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');`. In a production Next.js app, replace with `next/font/google` for self-hosting + zero CLS.

### Logo

- **Primary logo:** `https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg`
- Alt text: `RJ Business Solutions logo`
- Every asset in this pack references this URL directly. In production, download once and self-host at `/public/logo.jpg` (or convert to `.svg` if a vector source can be produced).

### Brand copy blocks

All headline copy, taglines, service descriptions, voice examples, footer text, and social bios are pulled from the master brand block. The canonical source lives in `Brand Kit.html` sections 01 (Essence) and 05 (Voice & Tone). Do not paraphrase — copy verbatim.

### Business info (used across every surface)

```
Company:  RJ Business Solutions
Founder:  Rick Jefferson
Website:  https://rjbusinesssolutions.org
Support:  support@rjbusinesssolutions.org
Address:  1342 NM 333, Tijeras, New Mexico 87059
LinkedIn: https://www.linkedin.com/in/rick-jefferson-314998235
TikTok:   https://www.tiktok.com/@rick_jeff_solution
Twitter:  https://twitter.com/ricksolutions1
```

---

## Files

Included in this handoff bundle (under `design_handoff_rj_brand_system/`):

### Priority builds (interactive → recreate as app routes)

- `Landing Page.html` — full marketing homepage (13 sections)
- `Dashboard.html` — authenticated client portal shell
- `Brand Kit.html` — design-system source of truth
- `Asset Pack.html` — master index / docs pattern
- `Pitch Deck.html` — 10-slide investor deck (uses `deck_stage.js` runtime)

### Design tokens (portable)

- `brand.css` — full CSS custom-property system + font imports + reusable utility classes

### Reference designs (static/print surfaces, included in bundle)

Full list of all 50 surfaces, grouped by section, referenced but not all copied into the handoff (they live in the source project at `/assets/*.html`):

**01 Brand System:** Brand Kit
**02 Print & Identity:** Letterhead · Invoice · Business Cards
**03 Email:** Email Header · Email Signature · Email Newsletter · Email Drip Sequence
**04 Social:** Social Banners · Avatars + Favicons · Backgrounds
**05 Sales & Docs:** Pitch Deck · One-Pager · Proposal · Contract Cover · PWA Manifest
**06 Sales Enablement:** Rate Card · Case Study · Testimonial Cards
**07 Brand Experience:** Zoom Backgrounds · Phone Wallpapers · Onboarding Welcome · Merch Mockups
**08 Content & Paid:** Video Thumbnails · Ad Creatives · Utility Pages · Certificate
**09 Product & Conversion:** Landing Page · Dashboard · Podcast Cards
**10 Events & Loyalty:** Event Booth · Gift Card · Referral Card · Growth Playbook
**11 Credit Tech & Legal:** Credit Report · Dispute Letter · Email Drip
**12 Stationery & Physical:** Envelope · Folder · Stickers + Tags · Swag Box
**13 Video Polish:** Testimonial Video overlays
**14 Comms & Internal:** SMS Templates · Contract Addendums · Employee Handbook
**15 Physical Experience:** Wrapping Paper · Popup Display · Holiday Cards
**16 Mobile App Marketing:** App Store Screenshots

### Suggested implementation order

1. Set up base project (Next.js 15 + Tailwind v4 + shadcn/ui)
2. Import `brand.css` tokens → convert to Tailwind theme config
3. Load Google Fonts (Space Grotesk + Inter) via `next/font`
4. Build atomic components: `<Button>`, `<Card>`, `<Badge>`, `<Input>`, `<KpiCard>`, `<Pill>`, `<TokenChip>`
5. Build Landing Page (public route)
6. Build Dashboard shell + auth
7. Build brand system docs route from `Brand Kit.html`
8. Wire PDF-rendering endpoints for print surfaces (Puppeteer / Playwright)
9. Convert email templates to ESP integration
10. Export social/image surfaces via headless-Chromium capture pipeline

---

**Handoff Version:** 1.0
**Brand System Version:** v5.0 (50 surfaces · 17 sections)
**Prepared:** July 18, 2026
**Owner:** Rick Jefferson · RJ Business Solutions
