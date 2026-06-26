# Database Schema — FCRA Supreme Violation Detector

## Overview
The platform uses Cloudflare D1 (SQLite) as its primary relational database. The schema is multi-tenant, with data isolation achieved via `org_id` on all resident tables.

## Tables

### organizations
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary Key (Id) |
| name | TEXT | Human-readable name |
| slug | TEXT | URL-friendly identifier |
| plan | TEXT | Current tier (free, pro, enterprise) |
| stripe_customer_id | TEXT | Reference to Stripe Customer |
| stripe_subscription_id | TEXT | Reference to Stripe Subscription |

### users
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary Key (Id) |
| org_id | TEXT | Organization FK |
| email | TEXT | Unique login email |
| password_hash | TEXT | Argon2id hash |
| role | TEXT | admin, member |

### clients
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary Key (Id) |
| org_id | TEXT | Organization FK |
| first_name | TEXT | Client first name |
| last_name | TEXT | Client last name |

### credit_reports
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary Key (Id) |
| client_id | TEXT | Client FK |
| bureau | TEXT | Experian, Equifax, TransUnion, 3-Bureau |
| parsed_data | TEXT | JSON blob of mapped report data |

### violations
| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Primary Key (Id) |
| report_id | TEXT | Report FK |
| severity | TEXT | critical, high, medium, low |
| statute | TEXT | Legal reference (FCRA, FDCPA) |
