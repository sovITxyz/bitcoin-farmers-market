import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const OUT = './research/raw';
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(OUT, 'images'), { recursive: true });

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

const collected = {
  profile: {},
  tweets: [],
  links: new Set(),
  imageUrls: new Set(),
  errors: [],
  linktree: {},
  rawMeta: {}
};

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  viewport: { width: 1366, height: 900 },
  locale: 'en-US'
});
const page = await ctx.newPage();

page.on('response', (response) => {
  const url = response.url();
  const ct = response.headers()['content-type'] || '';
  if ((ct.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)/i.test(url)) &&
      (url.includes('pbs.twimg.com') || url.includes('profile_images') ||
       url.includes('profile_banners') || url.includes('media') || url.includes('amplify'))) {
    collected.imageUrls.add(url);
  }
});

console.log('=== Loading x.com/btcfarmersmrkt ===');
try {
  await page.goto('https://x.com/btcfarmersmrkt', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(8000);
  try {
    await page.waitForSelector('[data-testid="primaryColumn"]', { timeout: 20000 });
    console.log('primaryColumn loaded');
  } catch(e) { console.log('no primaryColumn:', e.message); }
  await page.waitForTimeout(3000);

  const meta = await page.evaluate(() => {
    const out = {};
    document.querySelectorAll('meta').forEach(m => {
      const k = m.getAttribute('property') || m.getAttribute('name');
      const v = m.getAttribute('content');
      if (k && v) out[k] = v;
    });
    return out;
  });
  collected.rawMeta = meta;
  console.log('meta og:title:', meta['og:title']);
  console.log('meta og:description:', meta['og:description']);
  console.log('meta og:image:', meta['og:image']);
  if (meta['og:image']) collected.imageUrls.add(meta['og:image']);

  await page.screenshot({ path: path.join(OUT, 'x_profile.png'), fullPage: true });
  fs.writeFileSync(path.join(OUT, 'x_profile.html'), await page.content());

  const profile = await page.evaluate(() => {
    const out = {};
    out.userName = document.querySelector('[data-testid="UserName"]')?.innerText;
    out.userDescription = document.querySelector('[data-testid="UserDescription"]')?.innerText;
    out.userLocation = document.querySelector('[data-testid="UserLocation"]')?.innerText;
    out.userUrl = document.querySelector('[data-testid="UserUrl"]')?.innerText;
    out.userUrlHref = document.querySelector('[data-testid="UserUrl"]')?.href;
    out.userJoinDate = document.querySelector('[data-testid="UserJoinDate"]')?.innerText;
    out.followers = document.querySelector('a[href$="/verified_followers"]')?.innerText
                  || document.querySelector('a[href$="/followers"]')?.innerText;
    out.following = document.querySelector('a[href$="/following"]')?.innerText;
    const avatarImg = document.querySelector('a[href*="/photo"] img, [data-testid^="UserAvatar"] img');
    out.avatar = avatarImg?.src;
    const bannerImg = document.querySelector('a[href*="/header_photo"] img, [data-testid^="UserProfileHeader"] img');
    out.banner = bannerImg?.src;

    const bioLinks = Array.from(document.querySelectorAll('[data-testid="UserDescription"] a, [data-testid="UserUrl"]'))
      .map(a => ({ text: a.innerText, href: a.getAttribute('href'), title: a.getAttribute('title') }));
    out.bioLinks = bioLinks;
    return out;
  });
  collected.profile = profile;
  console.log('Profile name:', profile.userName);
  console.log('Profile bio:', profile.userDescription);
  console.log('Profile URL:', profile.userUrl, profile.userUrlHref);
  if (profile.avatar) collected.imageUrls.add(profile.avatar);
  if (profile.banner) collected.imageUrls.add(profile.banner);

  if (profile.userUrl) collected.links.add(profile.userUrl);
  for (const bl of (profile.bioLinks || [])) {
    if (bl.title) collected.links.add(bl.title);
    if (bl.href && bl.href.startsWith('http')) collected.links.add(bl.href);
    if (bl.text) collected.links.add(bl.text);
  }

  console.log('Scrolling to load tweets...');
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(2000);
  }

  const tweets = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('article[data-testid="tweet"]').forEach(art => {
      const text = art.querySelector('[data-testid="tweetText"]')?.innerText;
      const time = art.querySelector('time')?.getAttribute('datetime');
      const linkEl = art.querySelector('a[href*="/status/"]');
      const link = linkEl?.href;
      const imgs = Array.from(art.querySelectorAll('img[src*="pbs.twimg.com/media"]')).map(i => i.src);
      const tweetLinks = Array.from(art.querySelectorAll('a[href]')).map(a => ({
        href: a.href, text: a.innerText, title: a.getAttribute('title')
      })).filter(l => l.href && !l.href.includes('/btcfarmersmrkt'));
      if (text || imgs.length) items.push({ text, time, link, imgs, tweetLinks });
    });
    return items;
  });
  collected.tweets = tweets;
  console.log('Tweets found:', tweets.length);
  tweets.forEach(t => {
    t.imgs.forEach(i => collected.imageUrls.add(i));
    t.tweetLinks.forEach(l => {
      if (l.href && l.href.startsWith('http')) collected.links.add(l.href);
      if (l.title) collected.links.add(l.title);
    });
  });

  try {
    const bannerCss = await page.evaluate(() => {
      const div = document.querySelector('a[href$="/header_photo"] div[style*="background-image"]');
      if (!div) return null;
      return div.getAttribute('style');
    });
    if (bannerCss) {
      const m = bannerCss.match(/url\("([^"]+)"\)/);
      if (m) {
        collected.imageUrls.add(m[1]);
        collected.profile.bannerCss = m[1];
        console.log('banner from CSS:', m[1]);
      }
    }
  } catch(e) {}

} catch (e) {
  console.log('x.com error:', e.message);
  collected.errors.push({ source: 'x.com', error: e.message });
}

const allTextBlob = JSON.stringify({
  meta: collected.rawMeta, profile: collected.profile, tweets: collected.tweets,
  links: [...collected.links]
});
const linktreeCandidates = new Set();
(allTextBlob.match(/(linktr\.ee\/[\w\-_.]+)/g) || []).forEach(x => linktreeCandidates.add(x.replace(/[.,;:]+$/,'')));
(allTextBlob.match(/(lnk\.bio\/[\w\-_.]+)/g) || []).forEach(x => linktreeCandidates.add(x));
(allTextBlob.match(/(beacons\.ai\/[\w\-_.]+)/g) || []).forEach(x => linktreeCandidates.add(x));
(allTextBlob.match(/(allmylinks\.com\/[\w\-_.]+)/g) || []).forEach(x => linktreeCandidates.add(x));
collected.linktreeCandidates = [...linktreeCandidates];
console.log('Linktree candidates:', collected.linktreeCandidates);

const tcoLinks = [...collected.links].filter(l => l.includes('t.co/'));
console.log('t.co short links:', tcoLinks.length);
for (const t of tcoLinks.slice(0, 8)) {
  try {
    const r = await page.request.fetch(t, { maxRedirects: 5 });
    const finalUrl = r.url();
    console.log('t.co', t, '->', finalUrl);
    collected.links.add(finalUrl);
    if (finalUrl.includes('linktr.ee') || finalUrl.includes('lnk.bio') || finalUrl.includes('beacons.ai')) {
      const candidate = finalUrl.replace(/^https?:\/\//, '').replace(/\/$/,'');
      if (!collected.linktreeCandidates.includes(candidate)) collected.linktreeCandidates.push(candidate);
    }
  } catch(e) {}
}

if (collected.profile.userUrl) {
  let pUrl = collected.profile.userUrl;
  if (!pUrl.startsWith('http')) pUrl = 'https://' + pUrl;
  try {
    const r = await page.request.fetch(pUrl, { maxRedirects: 5 });
    const finalUrl = r.url();
    console.log('userUrl', pUrl, '->', finalUrl);
    collected.profile.userUrlExpanded = finalUrl;
    if (finalUrl.includes('linktr.ee') || finalUrl.includes('lnk.bio') || finalUrl.includes('beacons.ai')) {
      const candidate = finalUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!collected.linktreeCandidates.includes(candidate)) collected.linktreeCandidates.push(candidate);
    }
  } catch(e) { console.log('expand userUrl failed:', e.message); }
}

for (const lt of (collected.linktreeCandidates || [])) {
  const url = lt.startsWith('http') ? lt : `https://${lt}`;
  try {
    console.log('Visiting:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(4000);
    const html = await page.content();
    fs.writeFileSync(path.join(OUT, `linktree_${lt.replace(/[^\w]/g,'_')}.html`), html);
    await page.screenshot({ path: path.join(OUT, `linktree_${lt.replace(/[^\w]/g,'_')}.png`), fullPage: true });
    const ltData = await page.evaluate(() => {
      const out = {};
      out.title = document.querySelector('h1, h2')?.innerText;
      out.profileTitle = document.querySelector('[data-testid="profile-title"]')?.innerText;
      out.description = document.querySelector('[data-testid="profile-description"]')?.innerText;
      const linkEls = document.querySelectorAll('a[data-testid="LinkButton"], a[href]');
      const links = [];
      linkEls.forEach(a => {
        const href = a.href;
        const text = a.innerText.trim();
        if (href && href.startsWith('http') && !href.includes('linktr.ee/s/')) {
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
      return out;
    });
    collected.linktree[lt] = ltData;
    ltData.links?.forEach(l => collected.links.add(l.href));
    ltData.images?.forEach(i => i.src && collected.imageUrls.add(i.src));
    if (ltData.meta?.['og:image']) collected.imageUrls.add(ltData.meta['og:image']);
  } catch (e) {
    console.log('linktree fail', lt, e.message);
    collected.errors.push({ source: lt, error: e.message });
  }
}

const finalImages = [...collected.imageUrls];
const finalLinks = [...collected.links];

console.log('Downloading', finalImages.length, 'images...');
collected.downloaded = [];
for (let i = 0; i < finalImages.length; i++) {
  const url = finalImages[i];
  if (!url || !url.startsWith('http')) continue;
  let ext = 'jpg';
  const m = url.match(/\.(jpg|jpeg|png|gif|webp|svg)/i);
  if (m) ext = m[1].toLowerCase();
  const fname = `img_${String(i).padStart(3, '0')}.${ext}`;
  const fp = path.join(OUT, 'images', fname);
  const ok = await downloadFile(url, fp);
  if (ok) collected.downloaded.push({ url, file: fname });
}

const final = {
  profile: collected.profile,
  rawMeta: collected.rawMeta,
  tweets: collected.tweets,
  links: finalLinks,
  imageUrls: finalImages,
  linktree: collected.linktree,
  linktreeCandidates: collected.linktreeCandidates,
  downloaded: collected.downloaded,
  errors: collected.errors
};
fs.writeFileSync(path.join(OUT, 'collected.json'), JSON.stringify(final, null, 2));
console.log('=== DONE ===');
console.log('Profile name:', collected.profile.userName);
console.log('Tweets:', collected.tweets.length);
console.log('Links:', finalLinks.length);
console.log('Images downloaded:', collected.downloaded.length);
console.log('Linktree candidates:', collected.linktreeCandidates);
await browser.close();
