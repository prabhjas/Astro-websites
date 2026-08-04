/**
 * Sync Elementor CORE carousel chunks (image-carousel etc.) from live.
 * Pro nested-carousel was already synced; core hashes were stale.
 */
import { createWriteStream, existsSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://kinzahr.com';

async function download(pathname, { force = true } = {}) {
  const dest = join(ROOT, 'public', ...pathname.split('/').filter(Boolean));
  if (!force && existsSync(dest)) {
    console.log('have', pathname);
    return true;
  }
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + pathname, {
    headers: { 'User-Agent': 'KinzaHR-Astro-Migrator/0.1' },
    redirect: 'follow',
  });
  if (!res.ok) {
    console.warn('FAIL', res.status, pathname);
    return false;
  }
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  console.log('OK', pathname);
  return true;
}

// 1) Refresh elementor core webpack runtime + frontend
const CORE = [
  '/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js',
  '/wp-content/plugins/elementor/assets/js/frontend.min.js',
  '/wp-content/plugins/elementor/assets/js/frontend-modules.min.js',
  '/wp-content/plugins/elementor/assets/lib/swiper/v8/swiper.min.js',
  '/wp-content/plugins/elementor/assets/lib/swiper/v8/css/swiper.min.css',
  '/wp-content/plugins/elementor/assets/css/conditionals/e-swiper.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-image-carousel.min.css',
];
for (const p of CORE) await download(p);

// 2) Capture live network for carousel chunk filenames
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const hits = new Set();
page.on('response', (res) => {
  const u = res.url();
  if (/elementor\/assets\/js\/.*(?:carousel|slides|nested|swiper|section-frontend|shared-frontend)/i.test(u) && res.status() === 200) {
    try {
      hits.add(new URL(u).pathname);
    } catch {
      /* ignore */
    }
  }
  if (/elementor-pro\/assets\/js\/.*(?:carousel|nested)/i.test(u) && res.status() === 200) {
    try {
      hits.add(new URL(u).pathname);
    } catch {
      /* ignore */
    }
  }
});
await page.goto(ORIGIN + '/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);
// scroll to trigger lazy widgets
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 200));
  }
});
await page.waitForTimeout(2000);
await browser.close();

console.log('live carousel-related JS:');
[...hits].forEach((p) => console.log(' ', p));
for (const p of hits) await download(p);

// 3) Also pull any carousel filenames from refreshed webpack.runtime
const runtimePath = join(ROOT, 'public/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js');
const runtime = readFileSync(runtimePath, 'utf8');
const files = [...runtime.matchAll(/"([^"]+\.bundle\.min\.js)"/g)].map((m) => m[1]);
const needed = files.filter((f) =>
  /carousel|slides|nested-title|shared-frontend|section-frontend|counter|text-editor|video/.test(f),
);
console.log('core runtime needed:', needed);
for (const f of needed) {
  await download(`/wp-content/plugins/elementor/assets/js/${f}`);
}

writeFile(
  join(ROOT, '.tmp-qa', 'carousel-sync.json'),
  JSON.stringify({ hits: [...hits], needed, at: new Date().toISOString() }, null, 2),
);
console.log('done');
