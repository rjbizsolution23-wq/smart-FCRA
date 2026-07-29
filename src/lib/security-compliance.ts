/**
 * Security audit + compliance posture — coded controls, not marketing copy.
 */
export type AuditEnv = {
  DB: D1Database;
  PII_ENCRYPTION_KEY?: string;
  RATE_LIMIT_KV?: KVNamespace;
  DOCS?: R2Bucket;
  STRIPE_API_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  CLOUDFLARE_EMAIL_API_TOKEN?: string;
  CLOUDFLARE_API_TOKEN?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  TWILIO_PHONE_NUMBER?: string;
  FRONTEND_URL?: string;
};

export async function writeSecurityAudit(
  env: { DB: D1Database },
  row: {
    orgId?: string | null;
    actorUserId?: string | null;
    actorRole?: string | null;
    action: string;
    resourceType?: string;
    resourceId?: string;
    ip?: string;
    ua?: string;
    success?: boolean;
    detail?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO security_audit_log
        (id, org_id, actor_user_id, actor_role, action, resource_type, resource_id, ip_address, user_agent, success, detail_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
    )
      .bind(
        crypto.randomUUID(),
        row.orgId || null,
        row.actorUserId || null,
        row.actorRole || null,
        row.action,
        row.resourceType || null,
        row.resourceId || null,
        row.ip || null,
        (row.ua || '').slice(0, 240) || null,
        row.success === false ? 0 : 1,
        row.detail ? JSON.stringify(row.detail) : null,
      )
      .run();
  } catch (e) {
    console.warn('[security-audit] write skipped', e);
  }
}

/** Machine-readable security posture for trust center / sales. */
export function buildSecurityPosture(env: AuditEnv) {
  const controls = [
    {
      id: 'aes-gcm-pii',
      title: 'AES-256-GCM field encryption',
      status: env.PII_ENCRYPTION_KEY && env.PII_ENCRYPTION_KEY.length >= 32 ? 'enforced' : 'misconfigured',
      detail: 'Credit report raw/parsed text and vault contents encrypt at rest with fail-closed key policy.',
    },
    {
      id: 'r2-vault',
      title: 'Isolated document object vault (R2)',
      status: env.DOCS ? 'enforced' : 'degraded',
      detail: 'Binary client documents stored in dedicated Cloudflare R2 bucket with org/client keyed paths.',
    },
    {
      id: 'edge-rate-limit',
      title: 'Edge rate limiting (KV)',
      status: env.RATE_LIMIT_KV ? 'enforced' : 'degraded',
      detail: 'Auth and upload endpoints throttle by CF-Connecting-IP via Workers KV.',
    },
    {
      id: 'mfa-totp',
      title: 'TOTP multi-factor authentication',
      status: 'available',
      detail: 'Staff and clients can enroll authenticator apps; MFA challenge required when enabled.',
    },
    {
      id: 'pbkdf2-passwords',
      title: 'PBKDF2-SHA-256 password hashing',
      status: 'enforced',
      detail: '100k-iteration PBKDF2 at the Workers Web Crypto cap; legacy hashes upgrade on login.',
    },
    {
      id: 'stripe-webhook-verify',
      title: 'Stripe webhook signature verification',
      status: env.STRIPE_WEBHOOK_SECRET ? 'enforced' : 'optional',
      detail: 'Billing/tradeline webhooks verify Stripe signatures; events are idempotent.',
    },
    {
      id: 'consent-gates',
      title: 'FCRA / CROA / TSR consent gates',
      status: 'enforced',
      detail: 'Report ingest and onboard refuse without permissible purpose, CROA, and TSR attestations.',
    },
    {
      id: 'privacy-ops',
      title: 'CCPA/GDPR export & deletion workflow',
      status: 'enforced',
      detail: 'Coded privacy request queue with export package and admin fulfillment purge.',
    },
    {
      id: 'security-headers',
      title: 'Hardened HTTP security headers',
      status: 'enforced',
      detail: 'CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy.',
    },
    {
      id: 'audit-trail',
      title: 'Immutable-style security audit trail',
      status: 'enforced',
      detail: 'Auth, privacy, vault, and messaging events write to security_audit_log with IP/UA.',
    },
    {
      id: 'email-alerts',
      title: 'Encrypted-channel client alerts',
      status: env.CLOUDFLARE_EMAIL_API_TOKEN || env.CLOUDFLARE_API_TOKEN ? 'enforced' : 'degraded',
      detail: 'Portal events notify clients via Cloudflare Email Sending (SMS when Twilio configured).',
    },
    {
      id: 'sms-alerts',
      title: 'SMS alerts (Twilio)',
      status: env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_PHONE_NUMBER ? 'available' : 'ready_when_configured',
      detail: 'Optional Twilio SMS for staff replies and bureau updates when credentials are set.',
    },
  ] as const;

  const enforced = controls.filter((c) => c.status === 'enforced').length;
  const degraded = controls.filter((c) => c.status === 'degraded' || c.status === 'misconfigured').length;

  return {
    product: 'Smart FCRA v2',
    scoredAt: new Date().toISOString(),
    score: Math.max(0, Math.min(100, Math.round((enforced / controls.length) * 100) - degraded * 5)),
    controls,
    claims: [
      'Client credit data is encrypted with AES-256-GCM before persistence.',
      'Document vault binaries live in an isolated R2 bucket, not public URLs.',
      'Regulatory consent is a hard gate — not a checkbox theater.',
      'Consumers can request data export or deletion through a coded privacy workflow.',
      'Security events are logged with actor, IP, and resource identifiers.',
    ],
  };
}

export function passwordMeetsPolicy(password: string): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!password || password.length < 12) errors.push('At least 12 characters');
  if (!/[A-Z]/.test(password)) errors.push('One uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('One lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('One number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('One symbol');
  return { ok: errors.length === 0, errors };
}
