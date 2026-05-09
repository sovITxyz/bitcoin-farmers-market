import { chromium } from 'playwright';
import fs from 'fs';
const OUT = './research/qa';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });

async function shotAt(viewport, name) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGE ERR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CON ERR: ' + m.text()); });

  await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT}/${name}_top.png`, fullPage: false });
  await page.screenshot({ path: `${OUT}/${name}_full.png`, fullPage: true });

  // sections
  for (const sel of ['#about', '#markets', '#offerings', '#gallery', '#videos', '#connect']) {
    try {
      const el = await page.$(sel);
      if (el) {
        await el.scrollIntoViewIfNeeded();
        await page.waitForTimeout(400);
        await page.screenshot({ path: `${OUT}/${name}_${sel.replace('#','')}.png`, fullPage: false });
      }
    } catch (e) {}
  }

  // ES toggle
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#lang-toggle');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}_es_top.png`, fullPage: false });
  await ctx.close();
  console.log(`${name}: ${errors.length} errors`);
  errors.forEach(e => console.log('  ', e));
  return errors;
}

const desktopErrs = await shotAt({ width: 1366, height: 900 }, 'desktop');
const mobileErrs = await shotAt({ width: 390, height: 800 }, 'mobile');

await browser.close();
console.log('Total errors desktop:', desktopErrs.length, 'mobile:', mobileErrs.length);
