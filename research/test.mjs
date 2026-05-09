import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
try {
  const r = await page.goto('https://example.com', { timeout: 15000 });
  console.log('example.com:', r.status());
} catch(e) { console.log('example fail:', e.message); }
try {
  const r = await page.goto('https://x.com/btcfarmersmrkt', { timeout: 30000, waitUntil: 'domcontentloaded' });
  console.log('x.com status:', r ? r.status() : 'null');
  await page.waitForTimeout(2000);
  const t = (await page.content()).length;
  console.log('content len:', t);
} catch(e) { console.log('x fail:', e.message); }
await browser.close();
