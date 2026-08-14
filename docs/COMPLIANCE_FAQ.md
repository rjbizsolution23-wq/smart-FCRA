**Data stored in the product:** see [`docs/DATA_AND_COMPLIANCE.md`](./DATA_AND_COMPLIANCE.md) (every D1/R2/KV collection, session/tenant rules, FCRA/CROA/TSR/CCPA/GDPR/ESIGN coverage).

# SmartFCRA Supreme — Legal & Compliance Handbook (v1.0)
## Federal Statutes, CROA, FCRA, & FTC TSR Ingestion Guidelines

---

### ⏰ TEMPORAL CHECK & BUILD ANCHOR
- **Verified Date**: Wednesday, July 8, 2026 (MST)
- **Primary Owner / Brand**: Rick Jefferson | RJ Business Solutions (1342 NM 333, Tijeras, New Mexico 87059)
- **Support**: support@rjbusinesssolutions.org | rjbizsolution23@gmail.com
- **Website**: [rickjeffersonsolutions.com](https://rickjeffersonsolutions.com)
- **Build ID**: NEL-20260708-040500

---

## 1. Introduction

Operating in the consumer credit repair and litigation industry demands absolute adherence to federal and state consumer protection statutes. As the primary software licensee and operator of the **SmartFCRA™ Supreme** platform, **RJ Business Solutions** mandates that all sub-tenants and business operators operate with zero defects under the law.

This handbook explains the statutory underpinnings of the ingestion checkpoints enforced in our user interface. By using this software, you certify that your operational workflow aligns perfectly with these definitions.

---

## 2. FCRA Permissible Purpose Compliance (15 U.S.C. § 1681b)

### 2.1 The Core Rule
The Fair Credit Reporting Act (FCRA) protect consumer privacy by restricting who can access a consumer's credit file. Accessing, parsing, downloading, or ingesting a consumer credit report without a legal "permissible purpose" is a federal crime.

### 2.2 Statutory Breakdown
* **Section Reference**: 15 U.S.C. § 1681b(a)(2)
* **What is required**: Under the FCRA, consumer credit reports can be accessed in accordance with the written instructions of the consumer to whom it relates.
* **Our Guardrail**: Before any file (PDF, text, or HTML) is uploaded or integrated from services like MyFreeScoreNow or SmartCredit, the operator must check the **FCRA Permissible Purpose Compliance** checkbox. This certifies that the consumer has signed a physical or electronic written authorization specifically granting permission to retrieve and analyze their report.

### 2.3 Violation Penalties
Failing to secure written consent before pulling or uploading a report can lead to high civil liabilities:
* **Willful Noncompliance (15 U.S.C. § 1681n)**: Actual damages, or statutory damages of up to **$1,000 per violation**, plus punitive damages, court costs, and reasonable attorney fees.
* **Negligent Noncompliance (15 U.S.C. § 1681o)**: Actual damages, court costs, and reasonable attorney fees.

---

## 3. CROA Contract Requirements (15 U.S.C. § 1679c)

### 3.1 The Core Rule
The Credit Repair Organizations Act (CROA) governs any business that charges money to improve a consumer's credit standing. Under CROA, performing any credit repair service *before* executing a fully compliant written contract containing statutory disclosures is strictly prohibited.

### 3.2 Statutory Breakdown
* **Section Reference**: 15 U.S.C. § 1679d
* **What is required**: 
  1. A written and signed contract that includes the complete terms and conditions of payment, a detailed description of services to be performed, and the expected timeframe for completion.
  2. The statutory disclosure form titled **"Consumer Credit File Rights Under State and Federal Law"** must be provided to the consumer, as a standalone document, *before* the contract is signed.
  3. A conspicuous, statutory notice of the consumer's right to cancel the contract within **three (3) business days** without any penalty.
* **Our Guardrail**: The **CROA Consent Checkbox** on the ingestion screen forces the operator to certify that a valid, signed CROA contract and the statutory cancellation disclosure have been successfully completed and recorded in the client's file.

### 3.3 Violation Penalties
Contracts that do not comply with CROA are completely void and unenforceable under federal law. Noncompliant organizations can face:
* Civil class-action lawsuits.
* Punitive damages awarded by a court.
* Restitution of all fees paid by the consumer.

---

## 4. FTC TSR Telemarketing Advance-Fee Prohibition (16 CFR § 310)

### 4.1 The Core Rule
The Federal Trade Commission (FTC) Telemarketing Sales Rule (TSR) governs any sales or telemarketing operations that solicit credit repair services over the phone. Under the TSR, it is completely illegal to charge or receive any payment for credit repair services before providing documented proof of deletion or outcome.

### 4.2 Statutory Breakdown
* **Regulation Reference**: 16 CFR § 310.4(a)(2)
* **What is required**: A credit repair organization cannot request or receive any payment, directly or indirectly, until:
  1. The timeframe for the promised outcome has fully elapsed.
  2. The organization provides the consumer with a credit report (or written documentation from the credit bureau) proving that the promised modifications or deletions have actually been achieved.
  3. This proof must be dated at least **six (6) months** after the modification occurred to ensure the items do not instantly reappear.
* **Our Guardrail**: The **FTC TSR Consent Checkbox** certifies that your business model operates on a strictly legal, deferred pay-per-performance, or deferred-achievement pricing model, with no illegal upfront billing or retainer fees charged to telemarketed leads.

### 4.3 Violation Penalties
The FTC and state Attorneys General actively prosecute advance-fee credit repair schemes. Violations trigger:
* Fines of up to **$51,744 per telemarketing violation**.
* Court-ordered asset freezes, federal receiverships, and complete operational shutdowns.

---

## 5. Frequently Asked Questions (FAQ)

#### Q1: Can I bypass the ingestion compliance checkbox card?
**No.** To maintain high compliance standards, the system intercepts all file uploads, text pastes, and API-based integrations. If the checkboxes are unchecked, the platform automatically blocks ingestion and triggers the high-contrast `#compliance-fallback-modal` override warning. You must explicitly certify compliance by clicking **"Certify & Ingest"** to proceed.

#### Q2: Who is legally liable if a client claims their report was pulled without permission?
**The tenant operator / credit organization.** **RJ Business Solutions** provides the technological infrastructure but does not pull consumer reports on your behalf. The tenant organization must maintain signed digital and physical authorization audits within their own compliance records for at least five (5) years.

#### Q3: Does this software automatically generate CROA-compliant contracts?
**Yes.** Under the Dispute Cockpit Workspace, operators can generate pre-formatted dispute and contract letters that embed the mandatory statutory disclosures. However, local state laws may require additional specific contract headers. Always review your final document templates with qualified legal counsel.

#### Q4: How does the system help prove deletions for the TSR 6-month rule?
When a client's report is re-ingested, the system auto-analyzes the credit file, compares it with the baseline report, and displays a dedicated **Deletion Metrics** card. This generates a clear chronological audit trail of deleted items, which serves as your legally compliant documentation to invoice clients under pay-per-delete terms.

---

*Operational security and regulatory compliance represent the backbone of our platform. Work clean. Ship right.*

**Rick Jefferson**  
*Prompt Architect & Lead Data Engineer*  
*RJ Business Solutions*  
*Address: 1342 NM 333, Tijeras, New Mexico 87059*  
*Website: https://rickjeffersonsolutions.com*  
