# Security Audit — FCRA Supreme Violation Detector

## Threat Model
1. **PII Exposure**: Credit reports contain sensitive personal data.
   - *Mitigation*: All data is tied to `org_id`. JWT tokens are short-lived.
2. **Injection Attacks**: Malicious report text.
   - *Mitigation*: Reports are parsed via sanitizing engine. D1 uses parameterized queries.
3. **Billing Fraud**: Spoofed Stripe Webhooks.
   - *Mitigation*: Webhooks verified using the `SubtleCrypto` provider and official Stripe metadata.

## OWASP Top 10 Compliance
- **Broken Access Control**: All routes protected by `authMiddleware` verifying `org_id` ownership.
- **Cryptographic Failures**: All passwords hashed with Argon2id. All connections via HTTPS.
- **Injections**: Strictly using PREPARE statements for D1 interaction.

## Recommendations
1. **Rotation**: Rotate the `STRIPE_WEBHOOK_SECRET` every 90 days.
2. **Audit Logs**: The `activity_log` table tracks all significant system mutations.
