import { test, expect } from '@playwright/test';

/**
 * Required CI gate: staff login → upload report → engine detects → letter generated.
 * Needs local preview on :3000 with seeded D1 (npm run db:reset).
 */
const SAMPLE_REPORT = `Consumer Credit File
Report Date: 01/15/2026
FICO Score 8: 580

Account Name: OLD COLLECTION CO
Account Number: ****1234
Account Type: Collection
Account Status: charged off
Date Opened: 01/01/2010
Date of First Delinquency: 03/15/2015
Current Balance: $1200
Original Amount: $1200
Payment Status: Charge-off
End of Report
`;

test.describe('Login → upload → detect → letter', () => {
  test('staff can sign in, ingest a report, and generate a bureau dispute letter', async ({ page, request }) => {
    await page.goto('/login');
    await expect(page.locator('#login-form')).toBeVisible();

    await page.locator('#login-form input[name="email"]').fill('demo@example.com');
    await page.locator('#login-password').fill('demo123456');
    await page.locator('#login-form button[type="submit"]').click();

    await expect(page.locator('#page-content')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#mobile-nav')).toBeVisible();
    await expect(page.getByText('Smart FCRA').first()).toBeVisible();

    const token = await page.evaluate(() => localStorage.getItem('fcra_token'));
    expect(token).toBeTruthy();
    const headers = { Authorization: `Bearer ${token}` };

    const upload = await request.post('http://localhost:3000/api/reports/upload', {
      headers,
      data: {
        clientId: 'cli_demo_001',
        bureau: 'Unknown',
        fileName: 'obsolete-collection.txt',
        rawText: SAMPLE_REPORT,
      },
    });
    expect(upload.ok(), await upload.text()).toBeTruthy();
    const uploaded = await upload.json();
    expect(uploaded.reportId).toBeTruthy();
    const reportId = uploaded.reportId;
    expect(uploaded.violationsFound).toBeGreaterThan(0);

    const report = await request.get(`http://localhost:3000/api/reports/${reportId}`, { headers });
    expect(report.ok()).toBeTruthy();
    const reportBody = await report.json();
    const violations = reportBody.violations || reportBody.report?.violations || [];
    expect(Array.isArray(violations) ? violations.length : (reportBody.violation_count || 1)).toBeGreaterThan(0);

    const letter = await request.post('http://localhost:3000/api/documents/generate', {
      headers,
      data: {
        clientId: 'cli_demo_001',
        reportId,
        docType: 'bureau-dispute',
        bureau: 'Equifax',
      },
    });
    expect(letter.ok(), await letter.text()).toBeTruthy();
    const doc = await letter.json();
    expect(doc.id).toBeTruthy();
    expect(String(doc.content || '')).toMatch(/1681i|reinvest|dispute/i);
  });
});
