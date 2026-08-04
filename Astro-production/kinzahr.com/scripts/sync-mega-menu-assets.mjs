/**
 * Sync Elementor Pro mega-menu webpack runtime + chunks from live kinzahr.com.
 * Local hashes were stale (404); live serves working filenames.
 */
import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://kinzahr.com';
const JS = '/wp-content/plugins/elementor-pro/assets/js';

const CORE = [
  `${JS}/webpack-pro.runtime.min.js`,
  `${JS}/frontend.min.js`,
  `${JS}/elements-handlers.min.js`,
];

// Working hashes observed on live network (2026-08-03)
const LIVE_CHUNKS = [
  `${JS}/mega-menu.857df1cf3198ae47b617.bundle.min.js`,
  `${JS}/mega-menu-stretch-content.7ed04741ba7d5a80c556.bundle.min.js`,
  `${JS}/menu-title-keyboard-handler.b3891112675eb0b0c4d5.bundle.min.js`,
  `${JS}/nested-carousel.659b0373371215e60dab.bundle.min.js`,
];

async function download(pathname, { force = false } = {}) {
  const dest = join(ROOT, 'public', ...pathname.split('/').filter(Boolean));
  if (!force && existsSync(dest)) {
    // still refresh core always
  }
  await mkdir(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + pathname, {
    headers: { 'User-Agent': 'KinzaHR-Astro-Migrator/0.1', Accept: '*/*' },
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

for (const p of CORE) await download(p, { force: true });
for (const p of LIVE_CHUNKS) await download(p, { force: true });

// Parse refreshed runtime for ALL mega/menu/nested chunk filenames and fetch any missing
const runtimePath = join(ROOT, 'public', ...`${JS}/webpack-pro.runtime.min.js`.split('/').filter(Boolean));
const { readFileSync } = await import('node:fs');
const runtime = readFileSync(runtimePath, 'utf8');
const files = [...runtime.matchAll(/"([^"]+\.bundle\.min\.js)"/g)].map((m) => m[1]);
const needed = files.filter((f) =>
  /mega-menu|menu-title-keyboard|nested-carousel|nav-menu|load-more|^loop\.|ajax-pagination|taxonomy-filter/.test(
    f,
  ),
);
console.log('runtime needed chunks:', needed);
for (const f of needed) {
  await download(`${JS}/${f}`, { force: false });
}

// Also ensure mega-menu CSS present
await download('/wp-content/uploads/elementor/css/custom-pro-widget-mega-menu.min.css');
await download('/wp-content/plugins/elementor-pro/assets/css/widget-nested-carousel.min.css');

writeFile(
  join(ROOT, '.tmp-qa', 'mega-sync.json'),
  JSON.stringify({ syncedAt: new Date().toISOString(), core: CORE, chunks: LIVE_CHUNKS, runtimeNeeded: needed }, null, 2),
);
console.log('done');
