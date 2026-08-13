# Changelog — Smart FCRA · RJ Business Solutions

All notable changes to this project will be documented in this file.

## [3.1.0] - 2026-08-13
### Added
- **Operator catalog**: `docs/FEATURES.md` — every public, staff, client, engine, and integration surface plus finish-up list.
- **Product Map** staff page: in-app feature inventory matching the catalog.
- **Brand Library** staff page restored: RJ tokens, live forms, inbound `brand_leads`.

### Changed
- **Brand consistency**: login, MFSN CTA, legal pages, OpenAPI, mentors, and letterhead copy use **Smart FCRA · RJ Business Solutions** (Space Grotesk + Inter, `#2563eb` / `#0ea5e9`). Removed leftover “FCRA Supreme” chrome from user-facing surfaces.

## [3.0.0] - 2026-04-18
### Added
- **Monetization**: Full Stripe integration with Billing UI and Webhooks.
- **Enterprise Documentation**: Added the 12 essential docs for RJ Business Solutions compliance.
- **Infrastructure**: Automated D1 and Cloudflare deployment configuration.
- **Improved UI**: Glassmorphism shell with litigation scoring visualizations.

## [2.1.0] - 2026-04-17
### Added
- **MFSN Integration**: Production API orchestration for 3-Bureau credit reports.
- **Data Mapping**: Automated mapping from MFSN JSON to internal violation detection engine.

## [2.0.0] - 2026-04-16
### Added
- **Multi-tenancy**: Organization and team management layer.
- **D1 Migration**: Initial schema for multi-tenant SaaS.

## [1.0.0] - 2026-04-12
### Added
- **Core Engine**: Initial rule-based FCRA violation detection.
- **Parser**: Basic text-based credit report parsing.
