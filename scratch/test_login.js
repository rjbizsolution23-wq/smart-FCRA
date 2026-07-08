import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1200, height: 900 });

  console.log("Listening to console logs...");
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE] [${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', exception => {
    console.log(`[BROWSER UNCAUGHT EXCEPTION]: ${exception.stack || exception.message}`);
  });

  page.on('requestfailed', request => {
    console.log(`[BROWSER REQUEST FAILED]: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  });

  // Log all network requests and responses
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log(`[API REQUEST]: ${request.method()} ${request.url()}`);
    }
  });

  page.on('response', async response => {
    if (response.url().includes('/api/')) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch (err) {}
      console.log(`[API RESPONSE]: ${response.status()} ${response.url()} -> ${bodyText}`);
    }
  });

  console.log("Navigating to local dev server...");
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  console.log("Navigation complete. Title:", await page.title());

  console.log("Attempting login...");
  await page.fill('input[placeholder="you@company.com"]', 'demo@example.com');
  await page.fill('input[placeholder="••••••••"]', 'demo123');
  
  console.log("Submitting form...");
  await page.click('button[type="submit"]');

  console.log("Login submitted. Waiting 5 seconds for dashboard state changes...");
  await page.waitForTimeout(5000);

  console.log("Current URL:", page.url());
  
  // Save page state screenshot to verify
  const targetDir = 'C:\\Users\\ricky\\.gemini\\antigravity\\brain\\51c69c51-b321-4a7a-8cd0-63ccbf864a69';
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  const screenshotPath = path.join(targetDir, 'media_local_login_state_detailed.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Saved screenshot to ${screenshotPath}`);

  // Print current page structure
  const bodyText = await page.innerText('body');
  console.log("Body Text Content Preview:\n", bodyText.slice(0, 1000));

  await browser.close();
}

run().catch(err => {
  console.error("Error running test:", err);
});
