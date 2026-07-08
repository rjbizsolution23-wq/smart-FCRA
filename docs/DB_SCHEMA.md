# Database Schema — FCRA Supreme Violation Detector

The relational multi-tenant SQLite database schema (Cloudflare D1) has been fully defined, documented, and consolidated into the Master API manual.

👉 **Refer to the Master Documentation:** [docs/API_INTEGRATIONS_AND_SPECS.md#️-relational-database-schema-design-cloudflare-d1](file:///c:/Users/ricky/Downloads/fcra-detector-main/fcra-detector-main/docs/API_INTEGRATIONS_AND_SPECS.md#️-relational-database-schema-design-cloudflare-d1)

---

## 🏛️ Quick Database Table Roster
- `organizations`: B2B Tenants with dynamically adjustable tier and compliance limit fields.
- `users`: Registered users, including `'super_admin'`, `'admin'`, and `'member'` roles.
- `sessions`: Active device cookies.
- `clients`: Consumer clients (PIN fields are fully encrypted at rest using Aes-256-Gcm).
- `credit_reports`: Extracted credit report details and tradelines.
- `violations`: Detected FCRA/FDCPA compliance statutory violations.
- `documents`: Generated dispute letters and litigation complaints.
- `activity_logs`: Global security audit trails tracking operator actions, IP addresses, and timestamps.

---
⏰ **Anchor Date:** 2026-07-08 MST  
🏢 **RJ Business Solutions**  
👤 **Owner:** Rick Jefferson  
