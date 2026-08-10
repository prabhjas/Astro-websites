/**
 * Verify all redirects from public/_redirects against local server.
 * Deeper image audit: crawl key pages for img/srcset/background urls.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'http://127.0.0.1:5106';

const lines = readFileSync(join(root, 'public/_redirects'), 'utf8')
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const redirectResults = [];
for (const line of lines) {
  const [from, to, status = '301'] = line.split(/\s+/);
  const res = await fetch(`${BASE}${from}`, { redirect: 'manual' });
  const loc = res.headers.get('location') || '';
  const locPath = loc.replace(/^https?:\/\/[^/]+/, '') || loc;
  const ok = res.status === Number(status) && (locPath === to || loc === to);
  redirectResults.push({ from, to, status: res.status, loc: locPath, ok });
}

const redirOk = redirectResults.filter((r) => r.ok).length;
const redirFail = redirectResults.filter((r) => !r.ok);
console.log(JSON.stringify({ redirects: { total: redirectResults.length, ok: redirOk, fail: redirFail } }, null, 2));

// Image crawl on representative pages
const pages = [
  '/',
  '/about-us/',
  '/blog/',
  '/contact-us/',
  '/emiratisation-services/',
  '/author/binju-t-r/',
  '/category/emiratisation/',
];
// add first 5 posts from sitemap
const postXml = await (await fetch(`${BASE}/post-sitemap.xml`)).text();
const postLocs = [...postXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace('https://emiratisationgateway.com', ''));
pages.push(...postLocs.slice(0, 5));

const urlRe = /(?:src|href|data-src|data-lazy-src|content)=["']([^"']+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?[^"']*)?)["']/gi;
const srcsetRe = /srcset=["']([^"']+)["']/gi;
const cssUrlRe = /url\(\s*['"]?([^'")\s]+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?[^'")\s]*)?)['"]?\s*\)/gi;

const external = new Set();
const missing = new Set();
let checked = 0;

function collect(html) {
  const urls = new Set();
  for (const m of html.matchAll(urlRe)) urls.add(m[1]);
  for (const m of html.matchAll(srcsetRe)) {
    for (const part of m[1].split(',')) {
      const u = part.trim().split(/\s+/)[0];
      if (u) urls.add(u);
    }
  }
  for (const m of html.matchAll(cssUrlRe)) urls.add(m[1]);
  return urls;
}

for (const page of pages) {
  let res;
  try {
    res = await fetch(`${BASE}${page}`, { redirect: 'follow' });
  } catch (e) {
    console.log('page fetch failed', page, e.message);
    continue;
  }
  if (!res.ok) {
    console.log('page status', page, res.status);
    continue;
  }
  const html = await res.text();
  for (const raw of collect(html)) {
    if (/^(data:|blob:|#)/i.test(raw)) continue;
    if (/^https?:\/\//i.test(raw) && !/emiratisationgateway\.com|127\.0\.0\.1:5106/i.test(raw)) {
      if (/\.(png|jpe?g|gif|webp|svg|avif)/i.test(raw)) external.add(raw);
      continue;
    }
    const path = raw
      .replace(/^https?:\/\/(?:emiratisationgateway\.com|127\.0\.0\.1:5106)/i, '')
      .split('?')[0];
    if (!path.startsWith('/')) continue;
    checked++;
    // Prefer filesystem check for /wp-content and /assets
    const fsPath = join(root, 'public', path.replace(/^\//, ''));
    const distPath = join(root, 'dist/client', path.replace(/^\//, ''));
    if (existsSync(fsPath) || existsSync(distPath)) continue;
    const head = await fetch(`${BASE}${path}`, { method: 'HEAD' }).catch(() => null);
    if (!head || head.status >= 400) missing.add(`${page} -> ${path}`);
  }
}

console.log(JSON.stringify({ images: { pages: pages.length, checked, external: [...external], missing: [...missing].slice(0, 30), missingCount: missing.size } }, null, 2));

// sitemap index
const idx = await (await fetch(`${BASE}/sitemap_index.xml`)).text();
console.log('sitemap_index has', (idx.match(/<loc>/g) || []).length, 'child sitemaps');
console.log('robots sample:', (await (await fetch(`${BASE}/robots.txt`)).text()).split('\n').slice(0, 12).join(' | '));
