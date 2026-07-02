import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

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

  try {
    console.log("Navigating to live deployment...");
    await page.goto('https://369b14fd.smart-fcra.pages.dev/', { waitUntil: 'networkidle' });
    console.log("Navigation complete. Waiting 3 seconds for rendering...");
    await page.waitForTimeout(3000);
    
    const appHtml = await page.innerHTML('#app');
    console.log(`HTML inside <div id="app">: \n${appHtml}`);
  } catch (err) {
    console.error(`Script error: ${err.message}`);
  } finally {
    await browser.close();
  }
}

run();
