# Positive Money Financial Services — Smart FCRA Platform
## Complete User Manual & Operating Instructions

**Your portal:** https://positivemoney.smartfcra.com
**Platform:** Smart FCRA — full-service credit repair CRM, dispute-letter engine, and compliance system
**Plan:** Enterprise (all modules unlocked)
**AI Usage:** Unlimited / complimentary (no per-use charge to Positive Money)

---

## Table of Contents

1. [Getting Started — Login & First Steps](#1-getting-started)
2. [Your Branding](#2-your-branding)
3. [Security: One Device at a Time (Device Lock)](#3-security-device-lock)
4. [Platform Map — Every Menu Item Explained](#4-platform-map)
5. [Adding Clients & Onboarding](#5-adding-clients)
6. [Uploading a Credit Report & Running an Analysis](#6-uploading-a-credit-report)
7. [Violations & the Litigation Score](#7-violations)
8. [Generating and Mailing Dispute Letters](#8-generating-letters)
9. [The Compliance Hub / Compliance OS](#9-compliance)
10. [Client Portal — What Your Clients See](#10-client-portal)
11. [Team Management (Staff Accounts)](#11-team-management)
12. [Security & Devices Admin Panel](#12-security-admin-panel)
13. [AI Studio — Mentors & Free Media Tools](#13-ai-studio)
14. [Tradelines (Authorized User Tradelines)](#14-tradelines)
15. [Campaigns & Mailing Campaigns](#15-campaigns)
16. [Settings — Letterhead, Theme, Integrations](#16-settings)
17. [Billing](#17-billing)
18. [Support & Help](#18-support)
19. [Quick Reference / Cheat Sheet](#19-cheat-sheet)
20. [Getting Help](#20-getting-help)

---

## 1. Getting Started — Login & First Steps

### 1.1 Your login URL
Go to **https://positivemoney.smartfcra.com** — this is your dedicated portal. Do not use the generic smartfcra.com URL for daily work; your branded subdomain is what shows the Positive Money logo, colors, and name to you and your clients.

### 1.2 Your admin account

- **Email:** `admin@positivemoney.com`
- **Initial password:** was set when your account was provisioned — **change it immediately after first login** (see 1.4).
- **Role:** Admin (full control of your organization — team, clients, billing, security, settings)

### 1.3 First login checklist

1. Go to https://positivemoney.smartfcra.com
2. Enter your email + password → click **Sign In**
3. You'll land on the **Dashboard**
4. Confirm the Positive Money logo and name appear in the top-left/login screen (see Section 2)
5. Go to **Settings** and set up **MFA (multi-factor authentication)** — strongly recommended for the account that controls everything
6. Go to **Team** and add any staff who will work client files
7. Go to **Security & Devices** and confirm the device lock policy (see Section 3 and 12)

### 1.4 Changing your password

- Click **Forgot password?** on the login screen to trigger a reset email, **or**
- Once logged in, an admin can reset any team member's password from the Team page (see Section 11).

---

## 2. Your Branding

Every part of the platform that a Positive Money user or client sees is themed to your brand automatically — you don't have to configure this every time, it's tied to your portal domain:

- **Login page:** Positive Money logo + company name display above the sign-in form
- **Dashboard / app shell:** Positive Money logo and name in the top bar
- **Colors:** Navy (`#20234e`) primary, green (`#729555`) accent
- **Tagline:** "Your credit journey, organized"
- **Client portal:** Your clients see Positive Money branding throughout — they never see "RJ Business Solutions" (the base platform operator) except a small "Powered by Smart FCRA" footer note (this is standard on every tenant's portal and cannot be removed on your current plan).

**To update your logo, colors, or letterhead yourself:** go to **Settings → Portal theme (this org)** (see Section 16.2) or **Settings → Firm Letterhead** (Section 16.1) for the logo used on printed dispute letters/PDFs specifically.

---

## 3. Security: One Device at a Time (Device Lock)

Per your request, Positive Money's account security is configured so that **each login only works from one device/location at a time** — this stops password sharing.

### 3.1 How it works

- Your organization's policy is currently: **Enabled, 1 device maximum** per user.
- If a user is already logged in somewhere and someone tries to log in with the same email/password from a second device or browser, that second attempt is **blocked** with this message: *"This account is already signed in on another device or location. Only one active device is allowed on your plan. Ask your administrator to allow more devices, or sign out there first."*
- The original, already-logged-in session is **not** kicked out — it keeps working. Only the *new* login attempt is refused.
- To free up the "slot," the original user can sign out, or an admin can revoke that specific device from the **Security & Devices** page (Section 12).

### 3.2 If you need more than 1 device per user
You (the admin) control this — no one else can change it. Go to **Security & Devices → Policy** and raise "Max devices per user." There is currently no automatic extra charge tied to raising this — it's an internal control you manage. (If you want per-seat billing enforced automatically in the future, that can be added once your Stripe account is connected.)

### 3.3 Locking out a specific person (pause/reinstate)
If someone should be fully cut off (e.g., a departing employee), don't just lower the device count — use **Pause account** on their row in **Security & Devices**. This instantly does the following:

- Signs them out of every device they were on
- Blocks all future logins for that account
- Shows them a message to contact their administrator

To let them back in later, click **Reinstate**.

---

## 4. Platform Map — Every Menu Item Explained

When you (or your staff) are logged in as **Admin/Staff**, the left-hand navigation includes:

| Menu Item | What it does |
|---|---|
| **Global Search** | Search across all clients/reports/documents platform-wide |
| **Executive Overview** | Your KPI dashboard — active clients, litigation in progress, pending QA, recovery pool estimate, revenue trend chart |
| **Client Management** | Full list/search of every client, click into any client's file |
| **Violation Review QA** | Queue for reviewing AI-flagged violations before they go into a letter (quality control step) |
| **Dashboard** | Quick daily-use home screen |
| **Reports** | Every credit report ever imported, searchable |
| **Violations** | Every detected FCRA/FDCPA/ECOA violation across all clients, filterable by severity/category |
| **Documents** | Every generated dispute/demand letter — view, AI-rewrite, copy, email, or mail via USPS |
| **Compliance Hub** | Reference/compliance dashboards |
| **Compliance OS** | Automated compliance workflows |
| **Integration Hub** | Connect/manage 3rd-party integrations (GHL, Twilio, MyFreeScoreNow, etc.) |
| **Support Center** | Internal support ticketing |
| **Help & Guide** | Built-in guided tour + "ask a question" AI help + feedback form (see Section 18) |
| **Campaigns** | Marketing/outreach campaign tools |
| **Mailing Campaigns** | Bulk physical-mail campaign tools (via Lob) |
| **Tradelines** | Authorized User Tradeline marketplace — browse, match to a client, request placement (see Section 14) |
| **Team** | Manage staff accounts, roles, invites |
| **Security & Devices** | *(Admin only)* Device-lock policy, per-user device list, pause/reinstate, revoke sessions (see Section 12) |
| **Settings** | Letterhead, portal theme, integration credentials, security posture (see Section 16) |
| **AI Studio** | Chat with AI mentors on FCRA/FDCPA/Metro-2 topics, free AI image generation (see Section 13) |
| **Billing** | Your subscription plan, invoices, Stripe portal |
| **Legal** | Legal reference documents |

When impersonating/previewing a **Client**, the navigation switches to the client-facing menu (see Section 10).

---

## 5. Adding Clients & Onboarding

There are **two ways** to bring a new client into the system:

### 5.1 Manual — "Add Client" (fastest for a single client you already know basic info for)

1. Go to **Client Management**
2. Click **Add Client**
3. Fill in: First/Last name (required), email, phone, address, city/state/zip, DOB, SSN last 4
4. Click **Save Client**
5. Client now appears in your list — click into them to add reports, generate letters, etc.

### 5.2 Smart Autopilot Ingest (recommended — fastest end-to-end)
This is the zero-friction path: drop in a raw credit report PDF/text and the system does the rest (creates or matches the client record, extracts their name/address/DOB from the report, and runs the full violation scan) in one motion.

1. Click **Smart Autopilot Ingest** (available from Client Management or the Executive Overview)
2. Upload the credit report file (PDF or paste raw text) — Equifax, Experian, or TransUnion
3. The system automatically:
   - Extracts the client's demographic info
   - Creates the client record (or matches an existing one)
   - Runs the full violation/compliance scan
   - Redirects you straight into that client's workspace with results ready

### 5.3 Preview Portal (see exactly what your client sees)
From Client Management, click **Preview Portal** (top-right button, uses your own admin account) or the **Preview Portal** button on any specific client row to safely "become" that client and walk through every tab of the client experience without needing their login. Click **Exit Preview** in the nav to return to staff view.

---

## 6. Uploading a Credit Report & Running an Analysis

From a client's file page, click **Full Credit Report Analysis** (or use Autopilot Ingest, Section 5.2). You have three import paths:

1. **MyFreeScoreNow Integration** — pull directly if the client is enrolled under your affiliate account
2. **SmartCredit Integration**
3. **Raw upload** — PDF or pasted text from AnnualCreditReport.com or any bureau export

The system parses the report and automatically:

- Surfaces every potential FCRA/FDCPA/ECOA/Metro-2 compliance issue it finds
- Calculates a Litigation Vulnerability Score and estimated statutory damages range
- Files the results under **Violations** and **Reports** for that client

---

## 7. Violations & the Litigation Score

- **Violations page** (org-wide) lists every detected issue across all your clients — filter by **Severity** (Critical/High/Medium/Low) and **Category** (FCRA/FDCPA/ECOA).
- Each client's own file shows their personal violation list with a **combined estimated damages range** (low–high) calculated from the statutes matched.
- **Violation Review QA** is your quality-control queue — staff should review AI-flagged violations here before they're used to generate a letter, to make sure every claim is evidence-backed.

---

## 8. Generating and Mailing Dispute Letters

### 8.1 Generate a letter

1. From a client's file, choose **Generate Document**
2. Pick the letter/document type (dispute letter, demand letter, and ~45 other generated types depending on plan — Enterprise gets the full pack)
3. The system drafts the letter using the client's actual report facts and matched statutes — nothing generic

### 8.2 Working with a generated document
From any document, you can:

- **AI Rewrite** — semantically restructure the letter (different sentence structure/layout) while keeping every statute and fact intact — useful to avoid bureau OCR pattern-matching on template language
- **Copy** — copy the full text to clipboard
- **Email** — opens a pre-filled email with the letter body
- **Print**
- **Mail** — send via USPS through the platform's certified-mail integration (Lob). You'll be asked for mail class (Standard / First Class / Certified) and it starts the FCRA §611 30-day investigation clock automatically. Postage is deducted from your firm's postage wallet (or the client's, depending on your setup).

---

## 9. The Compliance Hub / Compliance OS

- **Compliance Hub** — dashboards and reference material to keep your operation aligned with FCRA/FDCPA/CROA requirements.
- **Compliance OS** — automated workflow engine for compliance-related processes (e.g., recurring checks, scheduled actions).
- **Security posture score** also appears at the top of **Settings** — shows you a 0–100 score and a checklist of security controls (MFA enabled, etc.) so you always know where you stand.

---

## 10. Client Portal — What Your Clients See

When your own clients log into `positivemoney.smartfcra.com` with their own account, they see a *simplified, client-only* version of the app, themed with your Positive Money branding:

| Client sees | Purpose |
|---|---|
| **Dashboard** | Their personal home/cockpit |
| **Get Started** | Self-service onboarding wizard — client can upload their own credit report and consent forms |
| **My Credit** | Their credit summary |
| **Report** | Full parsed report detail |
| **My Credit Case** | Case status / progress |
| **Confirm Facts** | Client attests to the accuracy of facts being disputed (needed for legal defensibility) |
| **Disputes** | Status of every dispute filed on their behalf |
| **Action Plan** | Personalized to-do items to improve their credit |
| **Progress** | Score/timeline progress tracking |
| **Consumer Rights** | Plain-language FCRA/FDCPA rights education |
| **My Journey** | Step-by-step journey view |
| **Messages** | Secure messaging with your staff |
| **Documents** | Files the client has uploaded |
| **Readiness** | Fundability/mortgage-readiness indicators |
| **Boost Tools / AU Tradelines** | Client-facing tradeline browsing (if you allow it) |
| **Tutor** | AI-assisted credit education |
| **Letters** | Copies of letters sent on their behalf |
| **Legal & Notary** | Legal document / notarization tools |
| **Video** | Educational video content |
| **Academy** | Structured credit-education course content |
| **Billing** | Their own billing/invoices (if you bill clients directly through the platform) |
| **Consents** | Their signed consent records |
| **Privacy & Security** | Their own account security settings, including MFA enrollment |
| **Cancel Services** | CROA-compliant self-service cancellation flow |
| **Help & Guide** | Client-facing guided tour + AI Q&A |
| **AI Mentors** | Client-facing AI credit-education chat |

**Note:** The **device-lock (one login at a time)** security policy applies to *your staff accounts*, tied to your org's policy setting. If you want it to also apply to your clients' own logins, let us know — it can be scoped separately.

---

## 11. Team Management (Staff Accounts)

Go to **Team** to:

1. **Add Member** — name, email, password, role (`Member` or `Admin`)
   - **Admin** — full access to everything, including Security & Devices, Billing, Settings
   - **Member** — day-to-day client/report/document work, no billing/security-admin access
2. View every team member, their role, and active/inactive status
3. (From **Security & Devices**, not Team) see how many devices each person is logged in on, and pause/reinstate them

**Best practice:** Give most staff `Member` role. Reserve `Admin` for owners/managers who need billing and security control.

---

## 12. Security & Devices Admin Panel

*(Admin-only — visible only to Admin/Super Admin roles)*

This page gives you full control over the one-device-per-user policy described in Section 3.

### 12.1 Policy card

- Toggle **Enabled / Disabled**
- Set **Max devices per user** (currently 1 for Positive Money)
- Click **Save Policy**

### 12.2 Per-team-member device list
For every staff member, you can see:

- How many devices they're currently active on
- Each device's label (e.g. "Chrome on Mac"), IP address, and last-active time
- A **Revoke** button per device — instantly signs that one device out (useful if they lost a laptop or you suspect it's not really them)

### 12.3 Pause / Reinstate

- **Pause** — instantly does three things: (1) signs the person out of every device they were on, (2) blocks all future logins for that account, and (3) shows them a message to contact their administrator. Use this for suspected password sharing, a departing employee, or any situation where you need someone locked out *right now*. You'll be asked to enter a reason (kept in the audit log).
- **Reinstate** — restores access immediately.
- You cannot pause your own account (prevents accidental admin lockout).

### 12.4 Audit trail
Every action taken on this page (policy changes, pauses, reinstates, revokes, and every blocked login attempt) is permanently logged in the platform's security audit log for compliance/record-keeping.

---

## 13. AI Studio — Mentors & Free Media Tools

- **Mentor Chat** — pick an AI mentor (FCRA/FDCPA/Metro-2 specialists) and ask questions like *"How do I sequence disputes for a mortgage-readiness client?"* or *"What's the SOL on this FDCPA claim?"*
- **Free Media Generate** — quick AI image generation (e.g., letterhead watermarks, marketing graphics)
- **Your usage is unlimited and free** — Positive Money's account has been configured with unmetered AI usage, so there's no per-question cost and no credit balance to watch. (This is a deliberate arrangement while billing/Stripe is not yet connected for your account — see Section 17.)

---

## 14. Tradelines (Authorized User Tradelines)

The **Tradelines** page is a live marketplace of Authorized User tradelines you can use to help clients build credit faster.

- **Inventory tab** — browse and filter live tradeline inventory by lender, credit limit, account age, statement day, price, and cycles
- **Smart Match Agent tab** — pick a client and the system recommends tradelines that best fit their profile/goal (e.g., mortgage-readiness)
- **Order / Client Info tab** — submit a placement request (payment/ordering handled via the ops email shown on the page)
- **Education tab** — reference material on how AU tradelines work
- **My Requests tab** — track the status of tradelines you've already requested

**Pricing model (platform-wide):** tradeline orders are billed at 12.5% of the tradeline price plus a $100 flat placement fee — this is the standard pricing across the whole platform, including for Positive Money.

---

## 15. Campaigns & Mailing Campaigns

- **Campaigns** — general outreach/marketing campaign management
- **Mailing Campaigns** — bulk physical mail campaigns (e.g., sending letters to many clients at once) using the same USPS/Lob mailing integration as individual document mailing (Section 8.2)

---

## 16. Settings — Letterhead, Theme, Integrations

Go to **Settings** (Admin/staff view) for:

### 16.1 Firm Letterhead
Fill in your firm name, attorney/authorized name, address, phone, email, bar number, and upload a logo (PNG/JPEG). This is what actually prints on every generated dispute PDF/letter — set this once.

### 16.2 Portal theme (this org)
Set your primary/sky/navy colors, company display name, and logo URL used inside the logged-in app itself (separate from the letterhead logo, which is for printed documents specifically). Positive Money's theme is already configured, but you can adjust it here any time.

### 16.3 MyFreeScoreNow Affiliate Offers
Reference panel for your enrolled affiliate offers.

### 16.4 Your GHL & MFSN credentials
Connect your own GoHighLevel (CRM) and MyFreeScoreNow API credentials here so imports/automation run under your own accounts rather than platform defaults.

### 16.5 Twilio SMS & Video
Connect your own Twilio account to send SMS/video from your own approved number. Required if you want SMS campaigns/workflow texts branded to Positive Money rather than the shared platform number.

### 16.6 Security Posture
A live score (0–100) plus a checklist of security controls (MFA status, etc.) at the top of this page — check it periodically.

---

## 17. Billing

The **Billing** page shows your current plan (**Enterprise**), invoices, and a link to the Stripe customer portal.

**Important note for Positive Money specifically:** per your instruction, Stripe billing has been **deferred** for your account for now — your AI usage is unmetered/complimentary (Section 13) and your account is marked "billing comped" internally so nothing is auto-charged while this is pending. When you're ready to turn on live billing (subscription charges, AI credit-pack purchases, tradeline invoicing, etc.), just let us know and we'll connect your Stripe account — no feature changes needed on your end, it will just start charging through the same screens that are already built.

---

## 18. Support & Help

- **Help & Guide** page: a built-in guided tour (walks through every staff or client area step by step), an **"Ask a question"** AI box for instant answers about how any feature works, and a feedback form you can use to request new integrations or features.
- **Support Center**: internal ticketing for staff-side support workflows.

---

## 19. Quick Reference / Cheat Sheet

| I want to... | Go to... |
|---|---|
| Log in | https://positivemoney.smartfcra.com |
| Add a new client | Client Management → Add Client |
| Fastest way to onboard a client with a report | Smart Autopilot Ingest |
| See what a client sees | Client Management → Preview Portal |
| Upload/analyze a credit report | Client file → Full Credit Report Analysis |
| See all detected violations | Violations |
| Generate a dispute letter | Client file → Generate Document |
| Mail a letter via USPS | Open the document → Mail |
| Add a staff member | Team → Add Member |
| See who's logged in where | Security & Devices |
| Lock someone out immediately | Security & Devices → Pause |
| Let someone back in | Security & Devices → Reinstate |
| Allow more than 1 device per user | Security & Devices → Policy → raise Max devices |
| Change your logo/colors | Settings → Portal theme |
| Change the logo on printed letters | Settings → Firm Letterhead |
| Ask the AI a question about the platform | Help & Guide → Ask a question |
| Chat with an FCRA/FDCPA AI mentor | AI Studio |
| Browse/order AU tradelines | Tradelines |
| Set up MFA on your account | Settings → Set Up MFA (or Privacy & Security if logged in as a client) |
| Check your invoices/plan | Billing |

---

## 20. Getting Help

If anything on this platform doesn't behave the way this manual describes, or you'd like a feature added:

1. Use **Help & Guide → Ask a question** for instant AI answers
2. Use **Help & Guide → Share feedback** to formally request a change/feature — every submission is read
3. For anything urgent (locked out, billing question, security concern), contact your Smart FCRA account team directly.

---

*This manual reflects the Positive Money Financial Services configuration as of August 22, 2026, including the device-lock security feature, unlimited AI usage, and Enterprise-plan feature set. If your plan or configuration changes, some sections may need updating — just ask and we'll refresh this document.*
