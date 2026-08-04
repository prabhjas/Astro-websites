/**
 * Sync ALL Elementor + Elementor Pro webpack runtimes and bundle chunks from live.
 * Fixes stale hashed chunk 404s that break sliders/carousels/accordions/posts.
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
const CONCURRENCY = 6;

async function download(pathname) {
  const dest = join(ROOT, 'public', ...pathname.split('/').filter(Boolean));
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + pathname, {
    headers: { 'User-Agent': 'KinzaHR-Astro-Migrator/0.1', Accept: '*/*' },
    redirect: 'follow',
  });
  if (!res.ok) return { pathname, ok: false, status: res.status };
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return { pathname, ok: true, status: res.status };
}

async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

const CORE_FILES = [
  '/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js',
  '/wp-content/plugins/elementor/assets/js/frontend.min.js',
  '/wp-content/plugins/elementor/assets/js/frontend-modules.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/frontend.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/elements-handlers.min.js',
  '/wp-content/plugins/elementor/assets/lib/swiper/v8/swiper.min.js',
  '/wp-content/plugins/elementor/assets/lib/swiper/v8/css/swiper.min.css',
  '/wp-content/plugins/elementor/assets/css/conditionals/e-swiper.min.css',
  '/wp-content/plugins/elementor/assets/css/widget-image-carousel.min.css',
  '/wp-content/plugins/elementor-pro/assets/css/widget-nested-carousel.min.css',
];

console.log('Refreshing core runtimes…');
for (const p of CORE_FILES) {
  const r = await download(p);
  console.log(r.ok ? 'OK' : `FAIL ${r.status}`, p);
}

function bundlesFromRuntime(relPath, urlPrefix) {
  const abs = join(ROOT, 'public', ...relPath.split('/').filter(Boolean));
  if (!existsSync(abs)) return [];
  const text = readFileSync(abs, 'utf8');
  return [...text.matchAll(/"([^"]+\.bundle\.min\.js)"/g)].map((m) => `${urlPrefix}/${m[1]}`);
}

const fromMaps = [
  ...bundlesFromRuntime(
    'wp-content/plugins/elementor/assets/js/webpack.runtime.min.js',
    '/wp-content/plugins/elementor/assets/js',
  ),
  ...bundlesFromRuntime(
    'wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js',
    '/wp-content/plugins/elementor-pro/assets/js',
  ),
];

console.log('Capturing live network chunk URLs…');
const liveHits = new Set();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on('response', (res) => {
  const u = res.url();
  if (res.status() !== 200) return;
  if (!/\/wp-content\/plugins\/elementor(?:-pro)?\/assets\/js\/[^/?]+\.js/.test(u)) return;
  try {
    liveHits.add(new URL(u).pathname);
  } catch {
    /* ignore */
  }
});
await page.goto(ORIGIN + '/', { waitUntil: 'networkidle', timeout: 120000 });
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 150));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(2500);
// also hit a couple inner pages that use accordions/carousels
for (const path of ['/services/', '/about-us/', '/platform/', '/blog/']) {
  await page.goto(ORIGIN + path, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(1200);
}
await browser.close();

const all = [...new Set([...fromMaps, ...liveHits])];
console.log(`Downloading ${all.length} JS assets (maps=${fromMaps.length}, liveHits=${liveHits.size})…`);
const results = await mapPool(all, CONCURRENCY, download);
const ok = results.filter((r) => r.ok).length;
const fail = results.filter((r) => !r.ok);
console.log(`Done: ${ok} ok, ${fail.length} failed`);
fail.slice(0, 30).forEach((f) => console.log(' FAIL', f.status, f.pathname));

await writeFile(
  join(ROOT, '.tmp-qa', 'elementor-chunks-sync.json'),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      ok,
      failed: fail,
      total: all.length,
      sampleLiveHits: [...liveHits].slice(0, 40),
    },
    null,
    2,
  ),
);
