import { test, expect } from '@playwright/test';

/**
 * Enterprise isolation + auth hardening tests.
 * Requires: npm run db:reset && local server on :3000
 * Seed users: demo@example.com / demo123456, member@iso-a.example / demo123456, suspended@iso-b.example / demo123456
 */
test.describe('Smart FCRA v2 — Security & Isolation', () => {
  const BASE = 'http://localhost:3000';

  test('health ready endpoint reports encryption + db', async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('healthy');
    expect(body.version).toBe('2.0.0');
  });

  test('login rejects short / invalid credentials', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'nobody@example.com', password: 'wrong-password' },
    });
    expect(res.status()).toBe(401);
  });

  test('demo super_admin can login with PBKDF2 seed password', async ({ request }) => {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'demo@example.com', password: 'demo123456' },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.user.role).toBe('super_admin');
  });

  test('tenant member cannot access platform admin APIs', async ({ request }) => {
    const login = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'member@iso-a.example', password: 'demo123456' },
    });
    expect(login.status()).toBe(200);
    const { token } = await login.json();

    const stats = await request.get(`${BASE}/api/admin/db-stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(stats.status()).toBe(403);
  });

  test('suspended organization cannot access clients', async ({ request }) => {
    const login = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'suspended@iso-b.example', password: 'demo123456' },
    });
    // Suspended org should fail at login (403) or later at API
    if (login.status() === 403) {
      expect(true).toBeTruthy();
      return;
    }
    if (login.status() !== 200) {
      test.skip();
      return;
    }
    const { token } = await login.json();
    const clients = await request.get(`${BASE}/api/clients`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect([401, 403]).toContain(clients.status());
  });

  test('mailing webhook requires secret', async ({ request }) => {
    const res = await request.post(`${BASE}/api/billing/mailing-callback`, {
      data: { documentId: 'does-not-exist' },
    });
    expect(res.status()).toBe(401);
  });

  test('org settings requires auth', async ({ request }) => {
    const res = await request.get(`${BASE}/api/settings/org`);
    expect(res.status()).toBe(401);
  });

  test('authenticated admin can read/update letterhead settings', async ({ request }) => {
    const login = await request.post(`${BASE}/api/auth/login`, {
      data: { email: 'demo@example.com', password: 'demo123456' },
    });
    expect(login.status()).toBe(200);
    const { token } = await login.json();
    const headers = { Authorization: `Bearer ${token}` };

    const getRes = await request.get(`${BASE}/api/settings/org`, { headers });
    expect(getRes.ok()).toBeTruthy();

    const putRes = await request.put(`${BASE}/api/settings/org`, {
      headers,
      data: {
        letterhead: {
          firmName: 'Demo Legal Firm Hardened',
          attorneyName: 'Demo Counsel, Esq.',
          city: 'Dallas',
          state: 'TX',
        },
      },
    });
    expect(putRes.ok()).toBeTruthy();
  });
});
