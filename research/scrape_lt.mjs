import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = './research/raw';
const URL = 'https://linktr.ee/bitcoinfarmersmarket';

async function downloadFile(url, filePath) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' }
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buf);
    return true;
  } catch (e) { return false; }
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  viewport: { width: 1280, height: 1600 }
});
const page = await ctx.newPage();

console.log('=== Loading', URL);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForTimeout(5000);

const html = await page.content();
fs.writeFileSync(path.join(OUT, 'linktree_bitcoinfarmersmarket.html'), html);
await page.screenshot({ path: path.join(OUT, 'linktree_bitcoinfarmersmarket.png'), fullPage: true });

const data = await page.evaluate(() => {
  const out = {};
  out.title = document.querySelector('h1')?.innerText
           || document.querySelector('[data-testid="profile-title"]')?.innerText;
  out.description = document.querySelector('[data-testid="profile-description"]')?.innerText;
  out.subtitle = document.querySelector('h2')?.innerText;
  out.profileImage = document.querySelector('img[data-testid="profile-image"], img[alt*="profile"], picture img')?.src;
  const links = [];
  document.querySelectorAll('a[data-testid="LinkButton"], a[href]').forEach(a => {
    const href = a.href;
    const text = a.innerText.trim();
    if (href && href.startsWith('http') &&
        !href.includes('linktr.ee/s/') &&
        !href.includes('/legal') &&
        !href.includes('/account-suspended') &&
        !href.includes('/login')) {
      links.push({ href, text });
    }
  });
  out.links = links;
  out.images = Array.from(document.querySelectorAll('img')).map(i => ({ src: i.src, alt: i.alt }));
  const meta = {};
  document.querySelectorAll('meta').forEach(m => {
    const k = m.getAttribute('property') || m.getAttribute('name');
    const v = m.getAttribute('content');
    if (k && v) meta[k] = v;
  });
  out.meta = meta;
  out.allText = document.body.innerText.substring(0, 5000);
  return out;
});

console.log('Title:', data.title);
console.log('Description:', data.description);
console.log('Subtitle:', data.subtitle);
console.log('Profile image:', data.profileImage);
console.log('og:image:', data.meta['og:image']);
console.log('og:description:', data.meta['og:description']);
console.log('Links found:', data.links.length);
data.links.forEach(l => console.log('  -', l.text, '->', l.href));
console.log('Images found:', data.images.length);

fs.writeFileSync(path.join(OUT, 'linktree_data.json'), JSON.stringify(data, null, 2));

// download all unique images
const imgs = new Set();
data.images.forEach(i => i.src && i.src.startsWith('http') && imgs.add(i.src));
if (data.profileImage) imgs.add(data.profileImage);
if (data.meta['og:image']) imgs.add(data.meta['og:image']);

fs.mkdirSync(path.join(OUT, 'images_lt'), { recursive: true });
let n = 0;
for (const url of imgs) {
  const m = url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
  const ext = m ? m[1].toLowerCase() : 'jpg';
  const fname = `lt_${String(n++).padStart(3,'0')}.${ext}`;
  const ok = await downloadFile(url, path.join(OUT, 'images_lt', fname));
  console.log('img', ok ? 'OK' : 'FAIL', '->', fname, url.substring(0, 80));
}

await browser.close();
console.log('=== DONE ===');
