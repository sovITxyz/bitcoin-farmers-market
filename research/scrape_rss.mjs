// Scrape @btcfarmersmrkt via Nitter's RSS feed (more reliable than the JS-rendered HTML).
// Saves all raw feeds, parses into a normalized tweets.json, and downloads every referenced
// image and video poster locally to research/raw/media_recent/.

import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const OUT = './research/raw';
const MEDIA = path.join(OUT, 'media_recent');
fs.mkdirSync(MEDIA, { recursive: true });

const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0';
const NITTER = 'https://nitter.net';

function curlOnce(url, outPath = null) {
  const args = [
    '-sSL', '-m', '90', '--compressed',
    '-A', UA,
    '-H', 'Accept: application/rss+xml, application/xml, text/xml, text/html, */*',
    '-H', `Referer: ${NITTER}`,
    '-w', '%{http_code}',
  ];
  if (outPath) args.push('-o', outPath);
  args.push(url);
  const r = spawnSync('curl', args, { encoding: 'utf8', maxBuffer: 80 * 1024 * 1024 });
  if (outPath) {
    const code = (r.stdout || '').trim();
    if (code === '200' && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) {
      return { status: 200, body: '' };
    }
    return { status: parseInt(code) || 0, body: '' };
  }
  const out = r.stdout || '';
  // last 3-digit code at end is the status
  const m = out.match(/(\d{3})$/);
  const status = m ? parseInt(m[1]) : 0;
  const body = m ? out.slice(0, m.index) : out;
  return { status, body };
}

async function withRetry(label, fn, attempts = 6) {
  for (let i = 1; i <= attempts; i++) {
    const r = fn();
    if (r.status === 200) {
      console.log(`  ${label}: ok on attempt ${i}`);
      return r;
    }
    console.log(`  ${label}: attempt ${i} status=${r.status}`);
    if (i < attempts) await new Promise(res => setTimeout(res, 3000 + i * 1500));
  }
  return { status: 0, body: '' };
}

async function fetchText(url, label) {
  console.log(`fetching ${label}: ${url}`);
  const r = await withRetry(label, () => curlOnce(url));
  console.log(`  ${label}: status=${r.status} size=${r.body.length}`);
  return r;
}

async function downloadFile(url, filePath) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) return 'cached';
  const r = await withRetry(`dl ${path.basename(filePath)}`, () => curlOnce(url, filePath), 4);
  if (r.status === 200 && fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    return `ok ${fs.statSync(filePath).size}b`;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).size === 0) fs.unlinkSync(filePath);
  return `http ${r.status}`;
}


// Parse a Nitter RSS feed into normalized tweet objects
function parseRss(xml, source) {
  const items = [];
  const itemRe = /<item>([\s\S]+?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml))) {
    const block = m[1];
    const get = (tag) => {
      const r = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(block);
      return r ? r[1].trim() : '';
    };
    const title = get('title').replace(/^<!\[CDATA\[|\]\]>$/g,'');
    const link = get('link');
    const guid = get('guid').replace(/<[^>]+>/g,'').trim();
    const creator = get('dc:creator');
    const pub = get('pubDate');
    let desc = get('description');
    desc = desc.replace(/^<!\[CDATA\[|\]\]>$/g,'');
    // Extract image urls from desc
    const imgs = [...desc.matchAll(/<img[^>]+src=\"([^\"]+)\"/g)].map(m => m[1]);
    const videos = [...desc.matchAll(/<source[^>]+src=\"([^\"]+\.mp4[^\"]*)\"/g)].map(m => m[1]);
    // Extract original-link from creator status path
    items.push({
      source,
      title: decodeEntities(title),
      link,
      guid,
      creator,
      pubDate: pub,
      pubDateIso: pub ? new Date(pub).toISOString() : null,
      isRetweet: title.startsWith('RT by '),
      desc,
      imgs,
      videos
    });
  }
  return items;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

// Convert Nitter media-proxy URL back to original twimg URL
function unproxyNitter(url) {
  // /pic/media%2FHHF6fHWXoAAWOFT.jpg => https://pbs.twimg.com/media/HHF6fHWXoAAWOFT.jpg
  // /pic/amplify_video_thumb%2F... => https://pbs.twimg.com/amplify_video_thumb/...
  // /pic/ext_tw_video_thumb%2F.../pu/img/...
  // /pic/card_img%2F.../...
  // /pic/tweet_video_thumb%2F....jpg
  // /pic/video.twimg.com%2Ftweet_video%2F....mp4
  const m = url.match(/\/pic\/(.+)$/);
  if (!m) return url;
  let p = decodeURIComponent(m[1]);
  if (p.startsWith('https://') || p.startsWith('http://')) return p;
  if (p.startsWith('video.twimg.com')) return 'https://' + p;
  return 'https://pbs.twimg.com/' + p;
}

const feeds = [
  { url: `${NITTER}/btcfarmersmrkt/rss`, label: 'main',    file: 'rss_main.xml' },
  { url: `${NITTER}/btcfarmersmrkt/with_replies/rss`, label: 'replies', file: 'rss_replies.xml' },
  { url: `${NITTER}/btcfarmersmrkt/media/rss`, label: 'media',   file: 'rss_media.xml' },
];

const all = new Map();
for (const f of feeds) {
  const { status, body } = await fetchText(f.url, f.label);
  if (status === 200 && body.length > 200) {
    fs.writeFileSync(path.join(OUT, f.file), body);
    const items = parseRss(body, f.label);
    items.forEach(t => {
      const key = t.guid || t.link || (t.pubDate + '|' + t.title.substring(0,40));
      if (!all.has(key)) all.set(key, t);
    });
    console.log(`  ${f.label}: parsed ${items.length} items, total unique=${all.size}`);
  }
}

const tweets = [...all.values()].sort((a, b) =>
  (b.pubDateIso || '').localeCompare(a.pubDateIso || '')
);
fs.writeFileSync(path.join(OUT, 'recent_tweets.json'), JSON.stringify(tweets, null, 2));

// Build flat image list and download each one to local media folder
const dl = new Map(); // localFilename -> originalUrl
for (const t of tweets) {
  const allMedia = [...t.imgs, ...t.videos];
  for (const u of allMedia) {
    const orig = unproxyNitter(u);
    // local filename: short, deterministic
    let base = orig.split('?')[0].split('/').pop().split('#')[0];
    if (!base.match(/\.(jpg|jpeg|png|webp|gif|mp4)$/i)) base += '.jpg';
    if (!dl.has(base)) dl.set(base, orig);
  }
}
console.log(`\nDownloading ${dl.size} unique media files`);
let dlOk = 0, dlFail = 0;
for (const [name, url] of dl) {
  // Try original (twimg) first; fallback to nitter proxy
  let res = await downloadFile(url, path.join(MEDIA, name));
  if (!res.startsWith('ok') && !res.startsWith('cached')) {
    // fallback: pull through nitter
    const nitterPath = url.replace('https://pbs.twimg.com/', '/pic/').replace('https://video.twimg.com/','/pic/video.twimg.com/');
    const nitterUrl = NITTER + nitterPath;
    res = await downloadFile(nitterUrl, path.join(MEDIA, name));
  }
  if (res.startsWith('ok') || res.startsWith('cached')) dlOk++; else { dlFail++; console.log('  fail', name, '<-', url, ':', res); }
}
console.log(`Downloaded: ok=${dlOk} fail=${dlFail}`);

// Summary report
console.log('\n=== Summary ===');
console.log('Total unique tweets:', tweets.length);
const dates = tweets.map(t => t.pubDateIso?.slice(0,10)).filter(Boolean);
if (dates.length) {
  console.log('Newest:', dates[0]);
  console.log('Oldest:', dates[dates.length - 1]);
}
const own = tweets.filter(t => !t.isRetweet);
console.log('Own posts:', own.length);
const rts = tweets.filter(t => t.isRetweet);
console.log('Retweets:', rts.length);

console.log('\n=== Recent posts referencing market days/locations ===');
const dayWords = /(?:saturday|sunday|sábado|domingo|club cocal|el zonte|berlin|berlín|surf city|mañana|10\s*am|9\s*am|today|hoy|next week|esta semana)/i;
tweets.forEach(t => {
  if (dayWords.test(t.title) || dayWords.test(t.desc)) {
    console.log(`  ${t.pubDateIso?.slice(0,10)}  by ${t.creator}  ${t.isRetweet?'RT':'OWN'}`);
    console.log(`    ${t.title.substring(0, 200).replace(/\n/g,' ')}`);
  }
});
