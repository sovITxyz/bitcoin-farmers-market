import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = './research/raw';
const MEDIA = path.join(OUT, 'media_recent');
fs.mkdirSync(MEDIA, { recursive: true });
const SINCE = new Date('2026-02-01T00:00:00Z');
const TODAY = new Date();

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

const all = new Map(); // link -> tweet
const allImages = new Set();

async function visit(page, url, label) {
  console.log(`\n=== Visiting ${url} (${label}) ===`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(7000);
    try { await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 20000 }); } catch {}
    await page.waitForTimeout(3000);
  } catch (e) {
    console.log('goto failed:', e.message);
    return;
  }

  let stagnantRounds = 0;
  let prevSize = all.size;
  let round = 0;
  const startedAt = Date.now();
  while (stagnantRounds < 8 && (Date.now() - startedAt) < 8 * 60 * 1000) {
    round++;
    const tweets = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('article[data-testid="tweet"]').forEach(art => {
        const text = art.querySelector('[data-testid="tweetText"]')?.innerText || '';
        const time = art.querySelector('time')?.getAttribute('datetime');
        const linkEl = art.querySelector('a[href*="/status/"]');
        const link = linkEl?.href;
        const author = art.querySelector('[data-testid="User-Name"] a[role="link"]')?.href;
        const isRepost = !!art.querySelector('[data-testid="socialContext"]');
        const repostText = art.querySelector('[data-testid="socialContext"]')?.innerText || null;
        const imgs = Array.from(art.querySelectorAll('img[src*="pbs.twimg.com/media"]')).map(i => i.src);
        const videos = Array.from(art.querySelectorAll('video')).map(v => v.poster).filter(Boolean);
        const links = Array.from(art.querySelectorAll('a[href]')).map(a => ({
          href: a.href, text: a.innerText, title: a.getAttribute('title')
        })).filter(l => l.href);
        if (text || imgs.length || videos.length) {
          items.push({ text, time, link, author, isRepost, repostText, imgs, videos, links });
        }
      });
      return items;
    });
    let added = 0;
    for (const t of tweets) {
      const key = t.link || (t.time + '|' + t.text.substring(0,40));
      if (!all.has(key)) { all.set(key, t); added++; }
      t.imgs.forEach(i => allImages.add(i));
      t.videos.forEach(v => allImages.add(v));
    }
    console.log(`  ${label} round ${round}: total=${all.size} added=${added} imgs=${allImages.size}`);
    if (all.size === prevSize) stagnantRounds++; else stagnantRounds = 0;
    prevSize = all.size;
    await page.evaluate(() => window.scrollBy(0, 2200));
    await page.waitForTimeout(2000);
    await page.evaluate(() => window.scrollBy(0, 2200));
    await page.waitForTimeout(1800);
  }
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  viewport: { width: 1366, height: 1000 },
  locale: 'en-US'
});
const page = await ctx.newPage();

page.on('response', (response) => {
  const url = response.url();
  const ct = response.headers()['content-type'] || '';
  if ((ct.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)/i.test(url)) &&
      (url.includes('pbs.twimg.com'))) {
    allImages.add(url);
  }
});

// 1) main timeline
await visit(page, 'https://x.com/btcfarmersmrkt', 'main');
// 2) with_replies (often shows more)
await visit(page, 'https://x.com/btcfarmersmrkt/with_replies', 'replies');
// 3) media tab
await visit(page, 'https://x.com/btcfarmersmrkt/media', 'media');

// 4) Try Twitter syndication endpoint (no-auth public JSON)
console.log('\n=== Trying syndication endpoint ===');
try {
  const synd = await page.request.fetch('https://syndication.twitter.com/srv/timeline-profile/screen-name/btcfarmersmrkt', {
    headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36' }
  });
  console.log('syndication status:', synd.status());
  if (synd.ok()) {
    const text = await synd.text();
    fs.writeFileSync(path.join(OUT, 'syndication.html'), text);
    // Parse the embedded __INITIAL_STATE__ JSON
    const m = text.match(/<script[^>]*id="__NEXT_DATA__"[^>]*>([^<]+)<\/script>/);
    if (m) {
      try {
        const data = JSON.parse(m[1]);
        fs.writeFileSync(path.join(OUT, 'syndication.json'), JSON.stringify(data, null, 2));
        const tweets = data?.props?.pageProps?.timeline?.entries || [];
        console.log('syndication tweets:', tweets.length);
        for (const e of tweets) {
          const t = e.content?.tweet;
          if (!t) continue;
          const key = t.permalink || t.id_str;
          if (!all.has(key)) {
            all.set(key, {
              text: t.text || '',
              time: t.created_at,
              link: t.permalink ? `https://x.com${t.permalink}` : `https://x.com/btcfarmersmrkt/status/${t.id_str}`,
              imgs: (t.photos || []).map(p => p.url),
              videos: [],
              links: []
            });
            (t.photos || []).forEach(p => allImages.add(p.url));
          }
        }
      } catch(e) { console.log('json parse fail:', e.message); }
    }
  }
} catch(e) { console.log('syndication fail:', e.message); }

// Also try cdn.syndication.twimg.com — used by tweet embeds
console.log('=== Trying cdn.syndication ===');
try {
  // Get profile via guest endpoint
  const r = await page.request.fetch(
    'https://cdn.syndication.twimg.com/timeline/profile?screen_name=btcfarmersmrkt&with_replies=false',
    { headers: { 'User-Agent': 'Mozilla/5.0' } }
  );
  console.log('cdn.syndication status:', r.status());
  if (r.ok()) {
    const text = await r.text();
    fs.writeFileSync(path.join(OUT, 'cdn_syndication.html'), text);
  }
} catch(e) { console.log('cdn syndication fail:', e.message); }

await browser.close();

// Build final report
const tweetsArr = [...all.values()].filter(t => t.time).sort((a,b) => new Date(b.time) - new Date(a.time));
const recent = tweetsArr.filter(t => new Date(t.time) >= SINCE);
const allByDate = tweetsArr.map(t => ({
  date: t.time?.slice(0,10),
  link: t.link,
  text: (t.text || '').substring(0, 200),
  imgs: t.imgs?.length || 0
}));

fs.writeFileSync(path.join(OUT, 'recent_tweets.json'), JSON.stringify(recent, null, 2));
fs.writeFileSync(path.join(OUT, 'all_dates.json'), JSON.stringify(allByDate, null, 2));

console.log('\n=== SUMMARY ===');
console.log('Total tweets seen:', tweetsArr.length);
if (tweetsArr.length) {
  console.log('Newest:', tweetsArr[0].time, '-', (tweetsArr[0].text || '').substring(0,80));
  console.log('Oldest:', tweetsArr.at(-1).time, '-', (tweetsArr.at(-1).text || '').substring(0,80));
}
console.log(`Tweets since Feb 2026: ${recent.length}`);
recent.forEach(t => {
  console.log(`  ${t.time?.slice(0,10)}: ${(t.text || '').substring(0,140).replace(/\n/g,' ')}`);
});
console.log(`Total images seen: ${allImages.size}`);

// Download recent images at full res
let n = 0;
for (const url of allImages) {
  if (!url.startsWith('http')) continue;
  let dlUrl = url;
  if (url.includes('pbs.twimg.com/media')) {
    const u = new URL(url);
    const id = u.pathname.split('/').pop();
    const fmt = u.searchParams.get('format') || 'jpg';
    dlUrl = `https://pbs.twimg.com/media/${id}?format=${fmt}&name=large`;
  }
  const ext = (dlUrl.match(/[?&]format=(jpg|jpeg|png|webp|gif)/i) || dlUrl.match(/\.(jpg|jpeg|png|webp|gif)/i) || [,'jpg'])[1].toLowerCase();
  const fname = `r_${String(n++).padStart(3,'0')}.${ext}`;
  await downloadFile(dlUrl, path.join(MEDIA, fname));
}
console.log(`Downloaded: ${n}`);
