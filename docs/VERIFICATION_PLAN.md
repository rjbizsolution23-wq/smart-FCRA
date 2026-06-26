# Verification Plan — FCRA Supreme Violation Detector

## Automated Tests
- **Unit Analysis**: Testing the parser and mapper functions with mock MFSN JSON.
- **API Tests**: Verifying endpoint response shapes using `hono/testing`.
- **Database Migrations**: Running `wrangler d1 migrations apply` to ensure schema integrity.

## Manual Verification (Production Smoke Test)
### 1. Authentication
- Register a new organization.
- Sign in and verify JWT persistence in `localStorage`.

### 2. MFSN Import
- Navigate to reports import.
- Provide MFSN credentials.
- Verify that 3-Bureau data is populated on the dashboard.

### 3. Violation Detection
- Verify that litigated scores match expected values for sample data.
- Ensure violation categories (e.g., "Account Status Error") are correctly tagged.

### 4. Billing
- Click "Upgrade" in the Billing section.
- Verify redirect to Stripe Checkout.
- Verify that webhook updates the organization's plan to "pro".

## Acceptance Criteria
- 100% of detected violations must have valid statutory references.
- Zero latency spikes over 2 seconds during report analysis.
- Stripe webhook processing time < 5 seconds.
