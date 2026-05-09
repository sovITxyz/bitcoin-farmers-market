import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = './research/raw';
const MEDIA = path.join(OUT, 'media');
fs.mkdirSync(MEDIA, { recursive: true });

const downloaded = new Set();
async function downloadFile(url, filePath) {
  if (downloaded.has(url)) return false;
  downloaded.add(url);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0' }
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(filePath, buf);
    return true;
  } catch (e) { return false; }
}

function imgIdFromUrl(url) {
  const m = url.match(/media\/([\w\-]+)/);
  if (m) return m[1];
  const m2 = url.match(/profile_images\/[^/]+\/([\w\-]+)/);
  if (m2) return 'avatar_' + m2[1];
  const m3 = url.match(/profile_banners\/([\w\-]+\/\d+)/);
  if (m3) return 'banner_' + m3[1].replace(/\//g,'_');
  return Buffer.from(url).toString('base64').replace(/[^\w]/g,'').substring(0,24);
}

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  viewport: { width: 1366, height: 1000 },
  locale: 'en-US'
});
const page = await ctx.newPage();

const allTweets = new Map();   // tweet link -> tweet record
const allImages = new Set();
const allVideos = new Set();
const allLinks = new Set();
let profile = {};
let rawMeta = {};

page.on('response', (response) => {
  const url = response.url();
  const ct = response.headers()['content-type'] || '';
  if ((ct.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)/i.test(url)) &&
      (url.includes('pbs.twimg.com'))) {
    allImages.add(url);
  }
  if (ct.startsWith('video/') || url.includes('video.twimg.com')) {
    allVideos.add(url);
  }
});

console.log('=== Loading x.com/btcfarmersmrkt ===');
await page.goto('https://x.com/btcfarmersmrkt', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(8000);
try { await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 25000 }); } catch(e) {}
await page.waitForTimeout(3000);

// meta
rawMeta = await page.evaluate(() => {
  const out = {};
  document.querySelectorAll('meta').forEach(m => {
    const k = m.getAttribute('property') || m.getAttribute('name');
    const v = m.getAttribute('content');
    if (k && v) out[k] = v;
  });
  return out;
});

// profile
profile = await page.evaluate(() => {
  const out = {};
  out.userName = document.querySelector('[data-testid="UserName"]')?.innerText;
  out.userDescription = document.querySelector('[data-testid="UserDescription"]')?.innerText;
  out.userLocation = document.querySelector('[data-testid="UserLocation"]')?.innerText;
  out.userUrl = document.querySelector('[data-testid="UserUrl"]')?.innerText;
  out.userJoinDate = document.querySelector('[data-testid="UserJoinDate"]')?.innerText;
  out.followers = document.querySelector('a[href$="/verified_followers"]')?.innerText
                || document.querySelector('a[href$="/followers"]')?.innerText;
  out.following = document.querySelector('a[href$="/following"]')?.innerText;
  out.avatar = document.querySelector('a[href*="/photo"] img')?.src;
  const bannerImg = document.querySelector('a[href*="/header_photo"] img');
  out.banner = bannerImg?.src;
  const bannerCss = document.querySelector('a[href$="/header_photo"] div[style*="background-image"]')?.getAttribute('style');
  if (bannerCss) {
    const m = bannerCss.match(/url\("([^"]+)"\)/);
    if (m) out.bannerCss = m[1];
  }
  out.bioLinks = Array.from(document.querySelectorAll('[data-testid="UserDescription"] a, [data-testid="UserUrl"]'))
    .map(a => ({ text: a.innerText, href: a.getAttribute('href'), title: a.getAttribute('title') }));
  return out;
});
console.log('Profile:', profile.userName);
if (profile.avatar) allImages.add(profile.avatar);
if (profile.banner) allImages.add(profile.banner);
if (profile.bannerCss) allImages.add(profile.bannerCss);

function extractTweetsFromDom() {
  return page.evaluate(() => {
    const items = [];
    document.querySelectorAll('article[data-testid="tweet"]').forEach(art => {
      const tweetTextEl = art.querySelector('[data-testid="tweetText"]');
      const text = tweetTextEl?.innerText || '';
      const time = art.querySelector('time')?.getAttribute('datetime');
      const linkEl = art.querySelector('a[href*="/status/"]');
      const link = linkEl?.href;
      const author = art.querySelector('[data-testid="User-Name"] a[role="link"]')?.href;
      const isRepost = !!art.querySelector('[data-testid="socialContext"]');
      const repostText = art.querySelector('[data-testid="socialContext"]')?.innerText || null;
      const imgs = Array.from(art.querySelectorAll('img[src*="pbs.twimg.com/media"]')).map(i => i.src);
      const videoEls = Array.from(art.querySelectorAll('video'));
      const videoSources = [];
      videoEls.forEach(v => {
        if (v.poster) videoSources.push({ poster: v.poster });
        Array.from(v.querySelectorAll('source')).forEach(s => videoSources.push({ src: s.src, type: s.type }));
      });
      const tweetLinks = Array.from(art.querySelectorAll('a[href]')).map(a => ({
        href: a.href, text: a.innerText, title: a.getAttribute('title')
      })).filter(l => l.href);
      // skip pure replies that aren't from the account itself? include for now
      if (text || imgs.length || videoSources.length) {
        items.push({ text, time, link, author, isRepost, repostText, imgs, videoSources, tweetLinks });
      }
    });
    return items;
  });
}

console.log('Scrolling to capture all tweets...');
let stagnantRounds = 0;
let prevSize = 0;
const startTime = Date.now();
const MAX_MS = 12 * 60 * 1000; // 12 minutes max
let round = 0;
while (stagnantRounds < 6 && (Date.now() - startTime) < MAX_MS) {
  round++;
  // extract before scroll
  const tweets = await extractTweetsFromDom();
  let newCount = 0;
  for (const t of tweets) {
    const key = t.link || (t.time + '|' + (t.text || '').substring(0,50));
    if (!allTweets.has(key)) {
      allTweets.set(key, t);
      newCount++;
    }
    t.imgs.forEach(i => allImages.add(i));
    t.videoSources.forEach(v => { if (v.poster) allImages.add(v.poster); if (v.src) allVideos.add(v.src); });
    t.tweetLinks.forEach(l => { if (l.href && l.href.startsWith('http')) allLinks.add(l.href); if (l.title) allLinks.add(l.title); });
  }
  console.log(`round ${round}: total=${allTweets.size}, new=${newCount}, images=${allImages.size}, videos=${allVideos.size}`);
  if (allTweets.size === prevSize) stagnantRounds++; else stagnantRounds = 0;
  prevSize = allTweets.size;

  // scroll multiple times
  await page.evaluate(() => window.scrollBy(0, 2200));
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollBy(0, 2200));
  await page.waitForTimeout(1800);
}

// final extraction after last scroll
const final = await extractTweetsFromDom();
for (const t of final) {
  const key = t.link || (t.time + '|' + (t.text || '').substring(0,50));
  if (!allTweets.has(key)) allTweets.set(key, t);
  t.imgs.forEach(i => allImages.add(i));
  t.videoSources.forEach(v => { if (v.poster) allImages.add(v.poster); if (v.src) allVideos.add(v.src); });
}

// Save tweets
const tweetsArr = [...allTweets.values()].sort((a,b) => {
  if (!a.time) return 1;
  if (!b.time) return -1;
  return new Date(b.time) - new Date(a.time);
});
fs.writeFileSync(path.join(OUT, 'tweets_full.json'), JSON.stringify(tweetsArr, null, 2));
console.log('Total tweets captured:', tweetsArr.length);
if (tweetsArr.length) {
  console.log('Newest:', tweetsArr[0].time, '-', (tweetsArr[0].text || '').substring(0,80));
  console.log('Oldest:', tweetsArr[tweetsArr.length-1].time, '-', (tweetsArr[tweetsArr.length-1].text || '').substring(0,80));
}

// Also save the photos tab and media tab to grab additional images
console.log('=== Loading /media tab ===');
try {
  await page.goto('https://x.com/btcfarmersmrkt/media', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(6000);
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.scrollBy(0, 2400));
    await page.waitForTimeout(1500);
  }
  const mediaImgs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('img[src*="pbs.twimg.com/media"]')).map(i => i.src)
  );
  mediaImgs.forEach(i => allImages.add(i));
  console.log('media tab images now:', allImages.size);
} catch(e) { console.log('media tab fail:', e.message); }

// Convert each known thumbnail to a high-res "?name=large" or original-size variant for download
const expandImageUrl = (url) => {
  // pbs.twimg.com/media/<id>?format=jpg&name=small  -> name=large
  if (url.includes('pbs.twimg.com/media')) {
    const u = new URL(url);
    const id = u.pathname.split('/').pop();
    const fmt = u.searchParams.get('format') || 'jpg';
    return `https://pbs.twimg.com/media/${id}?format=${fmt}&name=large`;
  }
  // profile_images _200x200, _normal -> _400x400 / original
  if (url.includes('profile_images')) {
    return url.replace(/_(normal|200x200|reasonably_small|bigger|mini)\./, '_400x400.');
  }
  // banners /600x200 -> /1500x500
  if (url.includes('profile_banners')) {
    return url.replace(/\/\d+x\d+$/, '/1500x500');
  }
  return url;
};

console.log('Downloading all images at full resolution...');
const dlIndex = [];
let n = 0;
for (const url of allImages) {
  const expanded = expandImageUrl(url);
  const id = imgIdFromUrl(url);
  let ext = 'jpg';
  const m = expanded.match(/[?&]format=(jpg|jpeg|png|webp|gif)/i) || expanded.match(/\.(jpg|jpeg|png|gif|webp)/i);
  if (m) ext = m[1].toLowerCase();
  const fname = `${String(n++).padStart(4,'0')}_${id}.${ext}`;
  const fp = path.join(MEDIA, fname);
  let ok = await downloadFile(expanded, fp);
  if (!ok && expanded !== url) ok = await downloadFile(url, fp);
  if (ok) dlIndex.push({ original: url, expanded, file: fname });
}
console.log('Downloaded images:', dlIndex.length);

// Save final compendium
fs.writeFileSync(path.join(OUT, 'profile_full.json'), JSON.stringify({
  profile, rawMeta,
  tweetCount: tweetsArr.length,
  newest: tweetsArr[0]?.time,
  oldest: tweetsArr[tweetsArr.length-1]?.time
}, null, 2));
fs.writeFileSync(path.join(OUT, 'media_index.json'), JSON.stringify(dlIndex, null, 2));
fs.writeFileSync(path.join(OUT, 'all_links.json'), JSON.stringify([...allLinks], null, 2));

await browser.close();
console.log('=== DONE ===');
