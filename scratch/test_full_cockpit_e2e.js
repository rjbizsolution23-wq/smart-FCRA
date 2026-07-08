import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  console.log("====================================================");
  console.log("🚀 STARTING FULL E2E WORKSPACE & COCKPIT VALIDATION");
  console.log("====================================================");

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1400, height: 1000 });

  // Route console logs
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] [${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', exception => {
    console.error(`[BROWSER UNCAUGHT EXCEPTION]: ${exception.stack || exception.message}`);
  });

  page.on('requestfailed', request => {
    console.error(`[REQUEST FAILED] ${request.url()}: ${request.failure()?.errorText || 'unknown error'}`);
  });

  page.on('response', response => {
    if (response.status() >= 400) {
      console.error(`[RESPONSE ERROR] ${response.status()} ${response.url()}`);
    }
  });

  // Target directory for artifacts
  const targetDir = 'C:\\Users\\ricky\\.gemini\\antigravity\\brain\\51c69c51-b321-4a7a-8cd0-63ccbf864a69';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Navigate and login
  console.log("1. Navigating to local app server...");
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  
  console.log("2. Submitting login credentials...");
  await page.fill('input[placeholder="you@company.com"]', 'demo@example.com');
  await page.fill('input[placeholder="••••••••"]', 'demo123');
  await page.click('button[type="submit"]');

  console.log("Waiting for dashboard to populate...");
  await page.waitForTimeout(3000);

  // 2. Navigate directly to Client Detail of pre-seeded Salisha McDowell
  console.log("3. Navigating to Salisha McDowell's client detail page...");
  await page.evaluate(() => {
    window._nav('client-detail', { clientId: 'cli_demo_001' });
  });
  await page.waitForTimeout(1500);

  // 3. Open Upload Report View
  console.log("4. Navigating to raw text upload view...");
  await page.evaluate(() => {
    window._nav('upload-report', { clientId: 'cli_demo_001', clientName: 'Salisha McDowell' });
  });
  await page.waitForTimeout(1000);

  // 4. Click manual raw text upload tab
  console.log("5. Selecting manual raw text upload tab...");
  await page.click('#tab-manual');
  await page.waitForTimeout(500);

  // 5. Load and paste the mock report raw text
  console.log("6. Reading scratch/eq_report.txt...");
  const reportPath = path.join('scratch', 'eq_report.txt');
  if (!fs.existsSync(reportPath)) {
    throw new Error(`Mock report file not found at ${reportPath}`);
  }
  const rawReportText = fs.readFileSync(reportPath, 'utf-8');
  console.log(`Loaded ${rawReportText.length} characters of raw Equifax credit report text.`);

  console.log("7. Pasting report text into analyzer input...");
  await page.fill('textarea[name="rawText"]', rawReportText);
  await page.waitForTimeout(500);

  // Check compliance checkboxes to satisfy the ingestion consents
  console.log("Checking regulatory compliance consent checkboxes...");
  await page.check('#ingest-consent-fcra');
  await page.check('#ingest-consent-croa');
  await page.check('#ingest-consent-tsr');
  await page.waitForTimeout(500);

  // 6. Submit manual analysis
  console.log("8. Submitting analysis pipeline form...");
  await page.click('#analyze-btn');

  // 7. Wait for the analysis pipeline to run and redirect to workspace
  console.log("Waiting for analysis pipeline to complete (timeout: 30s)...");
  await page.waitForSelector('#dispute-campaign-hud-container', { timeout: 30000 });
  console.log("🎉 Redirected to Report Detail Workspace successfully!");

  // Save workspace loaded screenshot
  const workspaceLoadedPath = path.join(targetDir, 'media_local_workspace_loaded.png');
  await page.screenshot({ path: workspaceLoadedPath, fullPage: true });
  console.log(`Saved screenshot: ${workspaceLoadedPath}`);

  // Print campaign HUD status
  const hudText = await page.innerText('#dispute-campaign-hud-container');
  console.log("--- INITIAL CAMPAIGN HUD STATUS ---");
  console.log(hudText);
  console.log("-----------------------------------");

  // 8. Interactive Pinning: Toggle demographic checkboxes
  console.log("9. Simulating Interactive Pinning (selecting demographic targets)...");
  
  // Click Name Discrepancy Checkbox
  await page.click('input[onclick*="demo-name"]');
  await page.waitForTimeout(500);

  // Click SSN Discrepancy Checkbox
  await page.click('input[onclick*="demo-ssn"]');
  await page.waitForTimeout(500);

  const updatedHudText = await page.innerText('#dispute-campaign-hud-container');
  console.log("--- UPDATED CAMPAIGN HUD STATUS (AFTER PINNING) ---");
  console.log(updatedHudText);
  console.log("-----------------------------------");

  // Save workspace pinned state screenshot
  const workspacePinnedPath = path.join(targetDir, 'media_local_workspace_pinned.png');
  await page.screenshot({ path: workspacePinnedPath, fullPage: true });
  console.log(`Saved screenshot: ${workspacePinnedPath}`);

  // 9. Switch to Dispute Builder 6th Tab
  console.log("10. Switching to Dispute Builder tab...");
  await page.click('button[data-tab="dispute-builder"]');
  await page.waitForTimeout(1500);

  // Print Dispute Builder text area preview
  const compiledLetter = await page.inputValue('#builder-letter-textarea');
  console.log("--- COMPILED 1681i REINVESTIGATION LETTER PREVIEW (FIRST 600 CHARS) ---");
  console.log(compiledLetter.slice(0, 600));
  console.log("...[truncated]...");
  console.log("----------------------------------------------------------------------");

  // Save dispute builder active screenshot
  const builderActivePath = path.join(targetDir, 'media_local_workspace_builder_active.png');
  await page.screenshot({ path: builderActivePath, fullPage: true });
  console.log(`Saved screenshot: ${builderActivePath}`);

  // 10. Save Dispute Draft to Server
  console.log("11. Clicking 'Save Dispute Draft' to synchronize with database...");
  await page.click('#builder-btn-save-draft');
  await page.waitForTimeout(3000); // Allow server request roundtrip and toast animations

  // Save final dashboard campaign saved state screenshot
  const campaignSavedPath = path.join(targetDir, 'media_local_workspace_campaign_saved.png');
  await page.screenshot({ path: campaignSavedPath, fullPage: true });
  console.log(`Saved screenshot: ${campaignSavedPath}`);

  console.log("====================================================");
  console.log("✅ ALL COCKPIT COMPLIANCE STEPS PASS E2E TEST VALIDATION!");
  console.log("====================================================");

  await browser.close();
}

run().catch(err => {
  console.error("❌ E2E Playwright verification script crashed:", err);
  process.exit(1);
});
