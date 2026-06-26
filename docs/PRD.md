# Product Requirements Document (PRD) — FCRA Supreme Violation Detector

## User Stories
1. **As a Credit Repair Professional**, I want to import reports directly from MyFreeScoreNow so that I don't have to manually enter credit data.
2. **As an Admin**, I want to subscribe to a Pro plan via Stripe so that I can analyze reports for more than one client.
3. **As a Professional**, I want to see a litigation score for each report so that I can prioritize high-value legal cases.
4. **As a User**, I want to generate dispute documents based on detected violations so that I can take immediate action for my clients.

## Functional Requirements
- **Multi-tenancy**: Organizations (Orgs) can manage multiple users and clients.
- **MFSN Integration**: Authenticated retrieval and parsing of 3B reports.
- **Violation Engine**: Automated scanning for 10+ categories of violations (Inaccuracy, Frequency, Statute of Limitations, etc.).
- **Stripe Billing**: Support for Free, Pro, and Enterprise tiers with quota management.
- **Document Generation**: Exporting disputes and legal complaints.

## Technical Constraints
- **Runtime**: Cloudflare Workers (Edge Computing).
- **Database**: Cloudflare D1 (SQLite).
- **Frontend**: Next.js SPA with Tailwind CSS.
- **Authentication**: JWT-based session management.

## Edge Cases
- **MFSN Downtime**: Graceful error handling for API failures.
- **Expired Subscriptions**: Downgrade organization access without deleting data.
- **Conflict Resolution**: Handling duplicate report imports for the same client.
