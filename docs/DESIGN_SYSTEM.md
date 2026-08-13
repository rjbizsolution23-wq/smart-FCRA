# Design System — Smart FCRA · RJ Business Solutions

**Product:** Smart FCRA  
**Operator:** RJ Business Solutions  
**Tagline:** Empowering Generational Wealth  
**Canonical tokens:** `public/static/brand/brand.css`

## Principles
1. **High Information Density**: Credit reports are complex; the UI must present them clearly without clutter.
2. **Action-Oriented**: Focus on the "next step" (Generate Dispute, Escalate).
3. **Trust & Security**: Navy glass with RJ blue / sky accents — financial authority, not generic SaaS purple.
4. **One brand**: Do not ship leftover “FCRA Supreme” chrome. Headings use Space Grotesk; body uses Inter.

## Color Palette
| Token | Hex | Use |
|---|---|---|
| RJ Blue | `#2563eb` | Primary actions, `.btn-rj`, nav active |
| RJ Sky | `#0ea5e9` | Kicker text, secondary links |
| RJ Navy | `#0f172a` | Background, glass |
| Deep | `#1e3a8a` | Gradient stop |
| Gold | `#f59e0b` | Warnings, demo callouts |
| Success | `#10b981` | Recovery / funded |
| Danger | `#ef4444` | Violations |

Gradient: `linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)`

## Typography
- **Headings**: Space Grotesk (500–700)
- **Body**: Inter (400–700)
- **Monospace**: JetBrains Mono or Space Grotesk for account numbers / tokens

## Logo
GHL CDN: `https://storage.googleapis.com/msgsndr/qQnxRHDtyx0uydPd5sRl/media/67eb83c5e519ed689430646b.jpeg`

## Components
- **Stat Cards**: Reports, violations, pipeline.
- **Glass Containers**: `rgba(15, 23, 42, 0.72)` + blue-tinted border.
- **Severity Badges**: Critical / High / Medium / Low.
- **Primary CTA**: `.btn-rj` — never ad-hoc cyan/violet for main actions.

## Surfaces that must stay on-brand
Login, MFSN signup, staff sidebar, Brand Library, Product Map, public legal pages, `/brand` hub, lead forms, PDF letterhead (`org-branding.ts` defaults).
