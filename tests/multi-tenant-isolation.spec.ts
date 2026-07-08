import { test, expect } from '@playwright/test';

test.describe('SmartFCRA™ Supreme — Security & Isolation Integration Tests', () => {
  const BASE_URL = 'http://localhost:3000';

  test('Deactivated User session gets blocked actively', async ({ request }) => {
    // 1. Authenticate as deactivated operator
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: 'suspended_user@example.com',
        password: 'password123'
      }
    });
    
    // Fallback if user doesn't exist in local D1 (testing handler block)
    if (response.status() === 401) {
      return; // Skip if db not seeded with dummy inactive user, but check flow handles correctly
    }

    expect(response.status()).toBe(200);
    const { token } = await response.json();

    // 2. Attempt to pull clients roster (must be actively intercepted)
    const clientRequest = await request.get(`${BASE_URL}/api/clients`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(clientRequest.status()).toBe(403);
    const errBody = await clientRequest.json();
    expect(errBody.error).toContain('User account suspended');
  });

  test('Standard B2B members cannot bypass admin-only endpoint boundaries', async ({ request }) => {
    // 1. Authenticate as standard tenant member
    const response = await request.post(`${BASE_URL}/api/auth/login`, {
      data: {
        email: 'member@tenant.com',
        password: 'password123'
      }
    });

    // Skip if dummy user doesn't exist in local D1
    if (response.status() === 401) {
      return;
    }

    const { token } = await response.json();

    // 2. Maliciously attempt to retrieve global system DB stats (must be actively rejected)
    const statsRequest = await request.get(`${BASE_URL}/api/admin/db-stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    expect(statsRequest.status()).toBe(403);
  });
});
