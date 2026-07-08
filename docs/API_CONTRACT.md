# API Contract — FCRA Supreme Violation Detector

The complete, master technical single-source-of-truth (SSOT) specifying all platform REST APIs, database schemas, and integration credentials has been consolidated.

👉 **Refer to the Master Documentation:** [docs/API_INTEGRATIONS_AND_SPECS.md](file:///c:/Users/ricky/Downloads/fcra-detector-main/fcra-detector-main/docs/API_INTEGRATIONS_AND_SPECS.md)

---

## 🏛️ Quick Summary

### Base URL
`/api`

### Main Functional Areas
- **Authentication**: MFA TOTP setups, session validations, zero-trust deactivation checks.
- **B2B Tenant Isolation**: Automatic `org_id` scoped queries preventing data leakages.
- **Client & Reports**: PII encrypted fields, 3B MyFreeScoreNow (MFSN) report mappings.
- **Legal Document Generation**: Standardized template compilation, automated Click2Mail mailing dispatch.
- **Platform Control Center**: Super admin overrides, telemetry statistics, tenant limit configurations, suspension toggles.

---
⏰ **Anchor Date:** 2026-07-08 MST  
🏢 **RJ Business Solutions**  
👤 **Owner:** Rick Jefferson  
