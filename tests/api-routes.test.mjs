/**
 * API route integration tests (Hono app.request — no live DB required for public routes)
 * Run: npx tsx tests/api-routes.test.mjs
 */
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const appModule = await import(pathToFileURL(path.join(root, 'src/index.tsx')).href);
const app = appModule.default;

const mockEnv = {
  DB: {
    prepare: () => ({
      bind: () => ({
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => ({ success: true }),
      }),
    }),
  },
  RATE_LIMIT_KV: {
    get: async () => '0',
    put: async () => {},
  },
  ENVIRONMENT: 'test',
};

// Health
{
  const res = await app.request('/api/health', {}, mockEnv);
  assert(res.status === 200, 'GET /api/health returns 200');
  const body = await res.json();
  assert(body.status === 'healthy', 'health status is healthy');
}

// OpenAPI spec
{
  const res = await app.request('/api/openapi.json', {}, mockEnv);
  assert(res.status === 200, 'GET /api/openapi.json returns 200');
  const spec = await res.json();
  assert(spec.openapi === '3.0.3', 'openapi version 3.0.3');
  assert(spec.info?.title?.includes('Smart FCRA'), 'spec title');
  assert(spec.paths['/api/health'], 'health path documented');
  assert(spec.paths['/api/client-portal/onboard'], 'client onboard path documented');
  assert(spec.paths['/api/client-portal/journey'], 'client journey path documented');
  assert(spec.paths['/api/client-portal/intelligence'], 'client intelligence path documented');
  assert(spec.paths['/api/client-portal/cancel-services'], 'cancel-services path documented');
  assert(spec.paths['/api/cron/daily-motivation'], 'daily motivation cron documented');
}

// Daily motivation cron rejects missing secret
{
  const res = await app.request('/api/cron/daily-motivation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }, mockEnv);
  assert(res.status === 401, 'POST /api/cron/daily-motivation without secret returns 401');
}

// Swagger UI docs page
{
  const res = await app.request('/api/docs', {}, mockEnv);
  assert(res.status === 200, 'GET /api/docs returns 200');
  const html = await res.text();
  assert(html.includes('swagger-ui'), 'docs page includes swagger-ui');
  assert(html.includes('Smart FCRA'), 'docs page title');
}

// Trust center (public)
{
  const res = await app.request('/api/security/trust-center', {}, mockEnv);
  assert(res.status === 200, 'GET /api/security/trust-center returns 200');
}

// Auth required routes return 401 without token
{
  const res = await app.request('/api/dashboard', {}, mockEnv);
  assert(res.status === 401, 'GET /api/dashboard without token returns 401');
}

// Login validation
{
  const res = await app.request('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  }, mockEnv);
  assert(res.status === 400 || res.status === 401, 'POST /api/auth/login empty body rejected');
}

// Document types (public)
{
  const res = await app.request('/api/document-types', {}, mockEnv);
  assert(res.status === 200, 'GET /api/document-types returns 200');
  const body = await res.json();
  assert(Array.isArray(body.types) || Array.isArray(body), 'document types array');
}

// Public Turnstile config (no secrets)
{
  const res = await app.request('/api/public/turnstile', {}, mockEnv);
  assert(res.status === 200, 'GET /api/public/turnstile returns 200');
  const body = await res.json();
  assert(body.enabled === false, 'turnstile disabled without keys');
}

// PWA shell
{
  const man = await app.request('/manifest.webmanifest', {}, mockEnv);
  assert(man.status === 200, 'GET /manifest.webmanifest returns 200');
  const manifest = await man.json();
  assert(manifest.short_name === 'Smart FCRA', 'manifest short_name');
  assert(manifest.display === 'standalone', 'manifest standalone');
  const sw = await app.request('/sw.js', {}, mockEnv);
  assert(sw.status === 200, 'GET /sw.js returns 200');
  const swText = await sw.text();
  assert(swText.includes('smart-fcra-shell'), 'service worker cache name');
}

console.log('PASS: API route integration tests');
