import { chromium } from 'playwright';
import { createWriteStream, existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function brokenOn(path) {
  await page.goto('http://127.0.0.1:5085' + path, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2500);
  return page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => ({
        src: img.getAttribute('src') || '',
        current: (img.currentSrc || '').replace(location.origin, ''),
        alt: (img.alt || '').slice(0, 80),
      })),
  );
}

const paths = [
  '/industries/construction-and-engineering/',
  '/industries/logistics-transport-and-warehousing/',
];

const report = {};
for (const path of paths) {
  report[path] = await brokenOn(path);
  console.log(path, JSON.stringify(report[path], null, 2));
}

async function download(url, dest) {
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'kinzahr-astro-Migrator/0.1' },
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

const needed = new Set();
for (const list of Object.values(report)) {
  for (const img of list) {
    const src = img.src || img.current;
    if (!src || src.startsWith('data:')) continue;
    if (src.startsWith('http') && !src.includes('kinzahr.com') && !src.includes('127.0.0.1')) continue;
    const path = src.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    needed.add(path);
  }
}

for (const path of needed) {
  const local = join(ROOT, 'public', decodeURIComponent(path).replace(/^\//, ''));
  const remote = 'https://kinzahr.com' + path;
  // Also try encodeURI for unicode filenames
  const candidates = [remote, 'https://kinzahr.com' + encodeURI(decodeURIComponent(path))];
  let ok = existsSync(local) && statSync(local).size > 500;
  if (ok) {
    console.log('have', path);
    continue;
  }
  for (const url of candidates) {
    try {
      await download(url, local);
      console.log('dl', path, statSync(local).size);
      ok = true;
      break;
    } catch (e) {
      console.warn('fail', url, e.message);
    }
  }
  if (ok) {
    const dist = join(ROOT, 'dist/client', decodeURIComponent(path).replace(/^\//, ''));
    mkdirSync(dirname(dist), { recursive: true });
    copyFileSync(local, dist);
  }
}

// Special: ZWSP filenames — ensure HTML img src matches file on disk
const uploadDir = join(ROOT, 'public/wp-content/uploads/2025/09');
for (const f of readdirSync(uploadDir)) {
  if (!/Logistics|Construction|Find-/i.test(f)) continue;
  const hasZwsp = f.includes('\u200b');
  if (!hasZwsp) continue;
  // If HTML references without ZWSP, also copy alias without ZWSP
  const alias = f.replace(/\u200b/g, '');
  const src = join(uploadDir, f);
  const dest = join(uploadDir, alias);
  if (!existsSync(dest)) {
    copyFileSync(src, dest);
    console.log('alias', alias);
  }
  const distDir = join(ROOT, 'dist/client/wp-content/uploads/2025/09');
  mkdirSync(distDir, { recursive: true });
  copyFileSync(src, join(distDir, f));
  copyFileSync(src, join(distDir, alias));
}

await browser.close();
console.log('done');
