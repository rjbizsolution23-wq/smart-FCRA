# API Contract — FCRA Supreme Violation Detector

## Base URL
`/api`

## Authentication
All protected routes require a Bearer token in the `Authorization` header.

## Endpoints

### Auth
- `POST /auth/register`: Create a new organization and admin user.
- `POST /auth/login`: Retrieve session token.
- `POST /auth/logout`: Invalidate session.

### Billing
- `POST /billing/checkout`: Create Stripe checkout session for plan upgrade.
- `POST /billing/webhook`: [Public] Handle Stripe events.

### Clients
- `GET /clients`: List all clients for the organization.
- `POST /clients`: Add a new client.
- `GET /clients/:id`: Retrieve client details.

### Reports
- `POST /reports/import-mfsn`: Authenticate and import 3B report from MFSN.
- `GET /reports/:id`: Retrieve analysis results for a report.

### Violations
- `GET /violations`: Filtered list of all detected violations.

### Documents
- `GET /documents`: List generated legal documents.
- `POST /documents`: Generate a new document (Dispute/Complaint).
