/**
 * OpenAPI 3.0 specification for Smart FCRA v2 partner / integration docs.
 * Generated from the canonical route registry below (kept in sync with src/index.tsx).
 */

export interface OpenApiRoute {
  method: 'get' | 'post' | 'put' | 'delete' | 'patch';
  path: string;
  summary: string;
  description?: string;
  tags: string[];
  security?: boolean;
  requestBody?: Record<string, unknown>;
  responses?: Record<string, { description: string; schema?: Record<string, unknown> }>;
}

const bearerSecurity = [{ BearerAuth: [] as string[] }];

export const API_ROUTE_REGISTRY: OpenApiRoute[] = [
  // Health
  { method: 'get', path: '/api/health', summary: 'Liveness probe', tags: ['Health'] },
  { method: 'get', path: '/api/health/ready', summary: 'Readiness probe (DB + bindings)', tags: ['Health'] },
  // Auth
  { method: 'post', path: '/api/auth/register', summary: 'Register organization + admin user', tags: ['Auth'],
    requestBody: { email: 'string', password: 'string', orgName: 'string', name: 'string' } },
  { method: 'post', path: '/api/auth/login', summary: 'Login and receive session token', tags: ['Auth'],
    requestBody: { email: 'string', password: 'string', mfaCode: 'string?' } },
  { method: 'post', path: '/api/auth/logout', summary: 'Revoke current session', tags: ['Auth'], security: true },
  { method: 'get', path: '/api/auth/me', summary: 'Current user + org', tags: ['Auth'], security: true },
  { method: 'post', path: '/api/auth/change-password', summary: 'Change password (policy enforced)', tags: ['Auth'], security: true },
  { method: 'get', path: '/api/auth/sessions', summary: 'List active sessions', tags: ['Auth'], security: true },
  { method: 'post', path: '/api/auth/forgot-password', summary: 'Request password reset email', tags: ['Auth'] },
  { method: 'post', path: '/api/auth/reset-password', summary: 'Complete password reset', tags: ['Auth'] },
  // Security
  { method: 'get', path: '/api/security/trust-center', summary: 'Public trust center metadata', tags: ['Security'] },
  { method: 'get', path: '/api/security/posture', summary: 'Authenticated security posture score', tags: ['Security'], security: true },
  // Clients
  { method: 'get', path: '/api/clients', summary: 'List clients for org', tags: ['Clients'], security: true },
  { method: 'post', path: '/api/clients', summary: 'Create client', tags: ['Clients'], security: true },
  { method: 'get', path: '/api/clients/{id}', summary: 'Client detail + reports/violations', tags: ['Clients'], security: true },
  { method: 'get', path: '/api/clients/{id}/bureau-comparison', summary: 'Tri-bureau side-by-side comparison workspace', tags: ['Clients'], security: true },
  { method: 'put', path: '/api/clients/{id}', summary: 'Update client profile + consents', tags: ['Clients'], security: true },
  { method: 'post', path: '/api/clients/{id}/portal-invite', summary: 'Send portal welcome email', tags: ['Clients'], security: true },
  // Reports
  { method: 'get', path: '/api/reports', summary: 'List credit reports', tags: ['Reports'], security: true },
  { method: 'get', path: '/api/reports/{id}', summary: 'Report detail with violations', tags: ['Reports'], security: true },
  { method: 'post', path: '/api/reports/upload', summary: 'Upload + live fact-checked analysis of credit report text', tags: ['Reports'], security: true,
    requestBody: { clientId: 'string', bureau: 'string', rawText: 'string', fileName: 'string' },
    description: 'Runs parse → rules engine → fact-check. Returns reasoningSummary, verifiedCount, rejectedCount. No mock violations.' },
  { method: 'post', path: '/api/reports/onboard', summary: 'Staff autopilot onboarding (parse + client match)', tags: ['Reports'], security: true },
  { method: 'post', path: '/api/reports/mfsn-import', summary: 'Import MyFreeScoreNow JSON payload', tags: ['Reports'], security: true },
  { method: 'get', path: '/api/reports/{id}/comparison', summary: 'Report delta comparison vs prior pull', tags: ['Reports'], security: true },
  // Violations
  { method: 'get', path: '/api/violations', summary: 'List violations (filters)', tags: ['Violations'], security: true },
  { method: 'put', path: '/api/violations/{id}', summary: 'Update violation review status', tags: ['Violations'], security: true },
  { method: 'get', path: '/api/violations/export', summary: 'Export violations CSV/JSON', tags: ['Violations'], security: true },
  // Documents
  { method: 'get', path: '/api/documents', summary: 'List generated dispute documents', tags: ['Documents'], security: true },
  { method: 'post', path: '/api/documents/generate', summary: 'Generate dispute letter', tags: ['Documents'], security: true },
  { method: 'post', path: '/api/documents/{id}/sign', summary: 'E-sign document', tags: ['Documents'], security: true },
  // Client portal
  { method: 'get', path: '/api/client-portal/dashboard', summary: 'Client cockpit data', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/onboard', summary: 'Client self-service report upload + analysis', tags: ['Client Portal'], security: true,
    requestBody: { rawText: 'string', bureau: 'string', fileName: 'string', consents: 'object' } },
  { method: 'get', path: '/api/client-portal/messages', summary: 'Portal message thread', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/messages', summary: 'Send portal message', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/uploads', summary: 'Vault inventory', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/uploads', summary: 'Upload to encrypted vault', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/uploads/{id}/download', summary: 'Download vault object', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/fundability', summary: 'Fundability score + roadmap + progress', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/funding/matches', summary: 'Lender matches (mode=institutional|simple); institutional = precision underwriting vs 600+ DB', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/funding/catalog', summary: 'Curated 65 + institutional featured + business vendors', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/reports/import-mfsn', summary: 'Live MyFreeScoreNow 3B pull (env/body credentials; no hardcoded secrets)', tags: ['Reports'], security: true,
    requestBody: { clientId: 'string', clientEmail: 'string', username: 'optional', password: 'optional', secretWord: 'optional' } },
  { method: 'put', path: '/api/client-portal/roadmap-progress', summary: 'Save interactive roadmap step/doc progress', tags: ['Client Portal'], security: true,
    requestBody: { roadmapKey: 'mortgage|auto|student|debt', completedSteps: 'string[]', completedDocs: 'string[]' } },
  { method: 'get', path: '/api/client-portal/education', summary: 'Education library + progress', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/tutor/chat', summary: 'AI finance tutor chat (grows with client journey)', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/tutor', summary: 'Tutor profile + growth level tied to client journey', tags: ['Client Portal'], security: true },
  { method: 'put', path: '/api/client-portal/profile', summary: 'Update client profile + language', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/journey', summary: 'Personalized journey plan + today’s motivation', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/journey/check-in', summary: 'Daily journey check-in (streak)', tags: ['Client Portal'], security: true },
  { method: 'put', path: '/api/client-portal/journey/settings', summary: 'Journey focus goal + motivation opt-in', tags: ['Client Portal'], security: true,
    requestBody: { focusGoal: 'mortgage|auto|student|debt|rebuild', motivationOptIn: 'boolean', journeyOptIn: 'boolean' } },
  { method: 'post', path: '/api/client-portal/journey/send-today', summary: 'Generate/send today’s motivational wake-up', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/intelligence', summary: 'Client intelligence dashboard (scores, NBA, results taxonomy, events)', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/reports', summary: 'List the authenticated consumer’s imported credit reports', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/reports/{id}', summary: 'Sandboxed interactive report viewer payload (PII-redacted, owner-only)', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/credit-events', summary: 'Append-only credit event ledger', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/findings', summary: 'Cross-bureau findings (no auto legal labels)', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/attestations', summary: 'List consumer attestations', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/attestations', summary: 'Record immutable consumer fact attestations', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/disputes', summary: 'Evidence-first dispute command center', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/disputes', summary: 'Create dispute from attestations (no fabricated reasons)', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/disputes/{id}/approve', summary: 'Client approval of dispute statements (immutable)', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/consents', summary: 'Separate consent catalog + records', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/consents', summary: 'Grant or revoke a specific consent', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/cancel-services', summary: 'CROA cancellation rights + current status', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/client-portal/cancel-services', summary: 'Request service cancellation from the portal', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/rights', summary: 'Consumer rights center (educational)', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/action-receipts', summary: 'Immutable action receipts', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/utilization', summary: 'Educational utilization targets (no score guarantee)', tags: ['Client Portal'], security: true },
  { method: 'get', path: '/api/client-portal/billing-center', summary: 'Client-facing services/invoices (no internal billing rules)', tags: ['Client Portal'], security: true },
  { method: 'post', path: '/api/compliance/evaluate', summary: 'Evaluate an action against CROA/TSR/attestation/approval rules', tags: ['Compliance'], security: true },
  { method: 'get', path: '/api/compliance/decisions/{id}', summary: 'Fetch a stored compliance decision', tags: ['Compliance'], security: true },
  { method: 'post', path: '/api/cron/daily-motivation', summary: 'Cron: batch daily motivational messages (X-Cron-Secret)', tags: ['Cron'] },
  { method: 'post', path: '/api/cron/enterprise-comms', summary: 'Cron: onboarding drip, CROA nudge, dispute-due, admin digest (X-Cron-Secret)', tags: ['Cron'] },
  { method: 'post', path: '/api/cron/ops', summary: 'Cron: unified ops packs hourly|daily|weekly|monthly (X-Cron-Secret)', tags: ['Cron'] },
  { method: 'post', path: '/api/cron/ops/{job}', summary: 'Cron: run a single ops job by name (X-Cron-Secret)', tags: ['Cron'] },
  { method: 'post', path: '/api/admin/ops/dispatch', summary: 'Admin: dispatch ops pack or single job', tags: ['Admin'], security: true },
  { method: 'get', path: '/api/admin/ops/runs', summary: 'Admin: recent scheduled job runs + ops alerts', tags: ['Admin'], security: true },
  { method: 'post', path: '/api/admin/journey/dispatch-daily', summary: 'Admin: dispatch daily motivations now', tags: ['Admin'], security: true },
  // Billing
  { method: 'post', path: '/api/billing/checkout', summary: 'Stripe checkout session', tags: ['Billing'], security: true },
  { method: 'post', path: '/api/billing/portal', summary: 'Stripe customer portal', tags: ['Billing'], security: true },
  { method: 'get', path: '/api/billing/invoices', summary: 'List Stripe invoices for org', tags: ['Billing'], security: true },
  { method: 'get', path: '/api/billing/mode', summary: 'Stripe mode (test/live/unconfigured)', tags: ['Billing'], security: true },
  { method: 'post', path: '/api/billing/cancel', summary: 'Cancel subscription at period end', tags: ['Billing'], security: true },
  { method: 'post', path: '/api/billing/webhook', summary: 'Stripe webhook (signed)', tags: ['Billing'] },
  // AI
  { method: 'get', path: '/api/ai/mentors', summary: 'List AI mentors', tags: ['AI'], security: true },
  { method: 'post', path: '/api/ai/mentors/{id}/chat', summary: 'Chat with mentor (RAG-constrained to retrieved KB)', tags: ['AI'], security: true },
  { method: 'get', path: '/api/ai/knowledge/search', summary: 'Search knowledge base (embeddings + keyword)', tags: ['AI'], security: true },
  { method: 'post', path: '/api/admin/knowledge/seed', summary: 'Seed case-law/statute chunks + email template registry', tags: ['Admin'], security: true },
  { method: 'get', path: '/api/admin/email-templates', summary: 'List lifecycle email templates', tags: ['Admin'], security: true },
  // Search & admin
  { method: 'get', path: '/api/search', summary: 'Global search', tags: ['Search'], security: true },
  { method: 'get', path: '/api/admin/db-stats', summary: 'Platform DB statistics', tags: ['Admin'], security: true },
  { method: 'post', path: '/api/admin/backup/trigger', summary: 'Trigger D1 snapshot to R2 vault', tags: ['Admin'], security: true },
  { method: 'post', path: '/api/admin/demo/load-case', summary: 'Load tri-bureau demo MFSN case onto Salisha (or clientId)', tags: ['Admin'], security: true },
  { method: 'post', path: '/api/admin/demo/prepare', summary: 'One-click sales demo: Salisha client, portal password reset, sample case', tags: ['Admin'], security: true },
  { method: 'get', path: '/api/admin/privacy-requests', summary: 'Privacy request queue', tags: ['Admin'], security: true },
  { method: 'post', path: '/api/admin/privacy-requests/{id}/fulfill', summary: 'Fulfill privacy delete/export request', tags: ['Admin'], security: true },
  { method: 'get', path: '/api/admin/organizations', summary: 'List all organizations', tags: ['Admin'], security: true },
  { method: 'get', path: '/api/compliance/esign-disclosure', summary: 'E-SIGN/UETA disclosure text + hash', tags: ['Compliance'], security: true },
  { method: 'get', path: '/api/compliance/ron-states', summary: 'RON state eligibility matrix', tags: ['Compliance'], security: true },
  { method: 'get', path: '/api/compliance/overview', summary: 'Contracts / RON / video compliance overview', tags: ['Compliance'], security: true },
  { method: 'post', path: '/api/legal-contracts/issue-pack', summary: 'Issue CROA+LPOA+ESIGN+rep auth pack', tags: ['Compliance'], security: true },
  { method: 'post', path: '/api/legal-contracts/{id}/sign', summary: 'E-sign legal contract with ESIGN consent', tags: ['Compliance'], security: true },
  { method: 'post', path: '/api/video/sessions', summary: 'Create Twilio Video advisor conference', tags: ['Video'], security: true },
  { method: 'post', path: '/api/video/sessions/{id}/token', summary: 'Issue short-lived Video access token', tags: ['Video'], security: true },
  { method: 'get', path: '/api/ron/sessions', summary: 'List RON sessions (includes live ceremonyUrl)', tags: ['RON'], security: true },
  { method: 'get', path: '/api/ron/sessions/{id}', summary: 'RON session detail + ceremony URL', tags: ['RON'], security: true },
  { method: 'post', path: '/api/ron/sessions', summary: 'Start remote online notarization (Proof/BlueNotary when keyed)', tags: ['RON'], security: true },
  { method: 'post', path: '/api/ron/sessions/{id}/identity', summary: 'Submit RON identity checklist', tags: ['RON'], security: true },
  { method: 'post', path: '/api/ron/sessions/{id}/complete', summary: 'Complete/seal RON session', tags: ['RON'], security: true },
  { method: 'post', path: '/api/webhooks/ron', summary: 'RON vendor webhook', tags: ['RON'] },
  // Privacy
  { method: 'post', path: '/api/privacy/export', summary: 'GDPR/CCPA data export', tags: ['Privacy'], security: true },
  { method: 'post', path: '/api/privacy/delete-request', summary: 'Request account deletion', tags: ['Privacy'], security: true },
];

function routeToPathItem(route: OpenApiRoute): Record<string, unknown> {
  const op: Record<string, unknown> = {
    summary: route.summary,
    tags: route.tags,
    responses: route.responses || {
      '200': { description: 'Success' },
      '400': { description: 'Bad request' },
      '401': { description: 'Unauthorized' },
      '403': { description: 'Forbidden' },
      '500': { description: 'Server error' },
    },
  };
  if (route.description) op.description = route.description;
  if (route.security) op.security = bearerSecurity;
  if (route.requestBody) {
    op.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: Object.fromEntries(
              Object.entries(route.requestBody).map(([k, v]) => [k, { type: String(v).endsWith('?') ? 'string' : typeof v === 'string' ? v.replace('?', '') : 'string', nullable: String(v).endsWith('?') }])
            ),
          },
          example: route.requestBody,
        },
      },
    };
  }
  return { [route.method]: op };
}

export function buildOpenApiSpec(baseUrl: string) {
  const paths: Record<string, Record<string, unknown>> = {};
  for (const route of API_ROUTE_REGISTRY) {
    if (!paths[route.path]) paths[route.path] = {};
    Object.assign(paths[route.path], routeToPathItem(route));
  }

  return {
    openapi: '3.0.3',
    info: {
      title: 'Smart FCRA v2 API',
      version: '2.0.0',
      description: 'Partner and integration API for Smart FCRA by RJ Business Solutions. Authenticate via `POST /api/auth/login` and pass the session token as `Authorization: Bearer <token>`.',
      contact: { name: 'RJ Business Solutions', url: 'https://smartfcra.com' },
      license: { name: 'Proprietary' },
    },
    servers: [{ url: baseUrl, description: 'Current deployment' }],
    tags: [
      { name: 'Health', description: 'Liveness and readiness' },
      { name: 'Auth', description: 'Authentication and sessions' },
      { name: 'Security', description: 'Trust center and posture' },
      { name: 'Clients', description: 'Client CRM' },
      { name: 'Reports', description: 'Credit report ingestion and analysis' },
      { name: 'Violations', description: 'FCRA violation engine results' },
      { name: 'Documents', description: 'Dispute document generation' },
      { name: 'Client Portal', description: 'Consumer self-service portal' },
      { name: 'Billing', description: 'Stripe subscriptions' },
      { name: 'AI', description: 'Mentors and AI chat' },
      { name: 'Search', description: 'Global search' },
      { name: 'Admin', description: 'Platform super-admin' },
      { name: 'Privacy', description: 'Data subject rights' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'session-token',
          description: 'Session ID returned from POST /api/auth/login',
        },
      },
    },
    paths,
  };
}

export function buildSwaggerUiHtml(specUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Smart FCRA v2 API Docs</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui.css">
  <style>body{margin:0}.swagger-ui .topbar{display:none}</style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.11.0/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: ${JSON.stringify(specUrl)},
      dom_id: '#swagger-ui',
      deepLinking: true,
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout',
      persistAuthorization: true,
    });
  </script>
</body>
</html>`;
}
