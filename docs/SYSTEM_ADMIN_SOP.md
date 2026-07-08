# SmartFCRA™ Supreme — Platform Admin Operations SOP (v1.0)
## Standard Operating Procedure for System Admins, Tenant Control, User Deactivation, Logs, & Security

---

### ⏰ TEMPORAL CHECK & BUILD ANCHOR
- **Verified Date**: Wednesday, July 8, 2026 (MST)
- **Primary Owner / Brand**: Rick Jefferson | RJ Business Solutions (1342 NM 333, Tijeras, New Mexico 87059)
- **Support Contact**: support@rjbusinesssolutions.org | rjbizsolution23@gmail.com
- **Website**: [rickjeffersonsolutions.com](https://rickjeffersonsolutions.com)
- **Build ID**: NEL-20260708-113500

---

## 1. Document Purpose & Scope

This Standard Operating Procedure (SOP) defines the operational, administrative, and security tasks required to maintain, audit, and manage the **SmartFCRA™ Supreme** multi-tenant platform. This document serves as the official reference guide for Super Administrators (Platform Admins) overseeing tenant status, user accounts, system activity logging, white-label configurations, and secure data isolation.

All administrative actions must be conducted in strict compliance with the Fair Credit Reporting Act (FCRA), the Credit Repair Organizations Act (CROA), SOC 2 security standards, and RJ Business Solutions corporate guidelines.

---

## 2. Platform Admin Console Overview

The Super Administrator has access to a centralized, secure **Admin Console** (accessible only to users seeded or promoted to the `super_admin` role). This console is divided into five functional areas:

1. **System Overview**: High-level telemetry of the SQLite (D1) databases, count of tenants, total users, reports parsed, violations flagged, and active zero-trust sessions.
2. **Tenant Control (Organizations)**: Master list of all registered B2B clients, their active pricing plans, and their tenant setting configurations. Contains the main switch to suspend an entire company.
3. **User Account Center**: Global list of users across all organizations with search capability, last-login trackers, and account status toggles.
4. **Security Audit Trails**: Real-time read of global system activity logs, capturing IP addresses, User-Agents, and administrative adjustments.
5. **Interactive SOP**: Direct in-dashboard loading of this operations manual.

---

## 3. Account Shutdown & User Suspension Procedures

To safeguard the platform against abuse, fraud, copyright violations, or billing disputes, the Super Admin can instantly suspend user access at two distinct layers.

### 3.1 Individual User Deactivation (The Surgical Cut)
* **When to Use**: A specific employee has left the company, leaked their login credentials, or exhibited unauthorized behavior.
* **Mechanism**: Sets the user's `is_active` field to `0` in the `users` table.
* **Result**: 
  - If the user has an active session, the backend `authMiddleware` intercepts the very next API request, invalidates the session, deletes the cookie/token, and returns `403 Forbidden` ("User account suspended").
  - Future login attempts are rejected with `401 Unauthorized` ("Invalid credentials").
* **SOP Execution Steps**:
  1. Open the **Admin Console** -> **User Accounts** tab.
  2. Search for the target user by email or name.
  3. Toggle the **Account Status** switch from "Active" to **Suspended**.
  4. Verify the change by checking the global Security Audit Trail.

### 3.2 Tenant-Wide Suspension (The Firewall Blockade)
* **When to Use**: The tenant company has defaulted on their Stripe subscription payment, violated CROA compliance rules (e.g., offering illegal score guarantees), or engaged in malicious scraping.
* **Mechanism**: Sets `"suspended": true` inside the organization's JSON `settings` column.
* **Result**:
  - The `authMiddleware` instantly blocks **every single user** belonging to that organization.
  - Returns `403 Forbidden` ("Organization account suspended").
  - Any background task, autopilot ingest, or report generation is aborted or blocked.
* **SOP Execution Steps**:
  1. Open the **Admin Console** -> **Tenants** tab.
  2. Locate the organization in the directory.
  3. Toggle the **Tenant Status** switch to **Suspended**.
  4. Ensure that the tenant's administrative email is notified of the suspension reason within 1 hour.

---

## 4. Database Maintenance & Backup SOP

To prevent data loss and ensure sub-second performance, the D1 SQLite database must be maintained and backed up regularly.

### 4.1 Automated Cloudflare Backups
Cloudflare D1 automatically schedules daily backups of all production databases. However, prior to applying migrations or executing administrative changes, a manual snapshot must be captured.

### 4.2 Manual Backup Procedure
Run the following wrangler command to execute an on-demand SQL snapshot of the production database:
```bash
npx wrangler d1 export fcra-detector-production --local --output=./backups/backup_manual_NEL_latest.sql
```
*Note: Always append the current date and Build ID to the backup file name for easy tracebacks.*

### 4.3 Database Optimization (VACUUM & Clean)
Over time, deleted records can cause database file fragmentation. To optimize queries:
1. Trigger a database vacuum using wrangler:
   ```bash
   npx wrangler d1 execute fcra-detector-production --local --command="VACUUM;"
   ```
2. Verify query latencies remain under 50ms.

---

## 5. Security Auditing & Compliance Guidelines

### 5.1 Monitoring Login Telemetry
* Admins must review the global Security Audit Trails daily.
* Look out for **IP Address Changes** or **User-Agent Shifts** within an active session. The platform's built-in session fingerprinting automatically deletes sessions and logs a hijacking warning in console on mismatch, but persistent failures must be investigated manually.

### 5.2 Handling Compliance Inquiries (CROA/FCRA)
Under CROA and FTC directives:
* Free trials are strictly prohibited. Ensure the "No Free Trials" compliance gate is active.
* Every customer report parsed must have the `permissible_purpose_consent` audit flag set to `1` with a valid cryptographic consent timestamp recorded.

---

*Standard Operating Procedure authorized by:*

**Rick Jefferson, Founder**  
*RJ Business Solutions*  
*Website: https://rickjeffersonsolutions.com*  
*Support: support@rjbusinesssolutions.org*  
