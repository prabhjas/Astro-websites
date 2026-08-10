import { readdirSync, readFileSync, existsSync, writeFileSync, mkdirSync, createWriteStream } from 'node:fs';
import { join, dirname } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = 'd:/Astro-websites/Astro-production/emiratisationgateway.com';
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://emiratisationgateway.com';

function walk(dir, acc = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(html|css|js|json)$/i.test(e.name)) acc.push(p);
  }
  return acc;
}

const cssMissing = new Set();
const imgMissing = new Set();
const files = [
  ...walk(join(ROOT, 'src/legacy')),
  ...walk(join(PUBLIC, 'wp-content/uploads/elementor/css')).filter((f) => f.endsWith('.css')),
];

for (const f of files) {
  let text = '';
  try {
    text = readFileSync(f, 'utf8');
  } catch {
    continue;
  }
  for (const m of text.matchAll(/\/wp-content\/uploads\/elementor\/css\/post-(\d+)\.css/g)) {
    if (!existsSync(join(PUBLIC, 'wp-content/uploads/elementor/css', `post-${m[1]}.css`))) {
      cssMissing.add(m[1]);
    }
  }
  for (const m of text.matchAll(/(?:src|href|content|url\()\s*['"]?(https?:\/\/(?:www\.)?emiratisationgateway\.com)?(\/wp-content\/uploads\/[^"'?\s)]+)/gi)) {
    const path = m[2].replace(/\\/g, '/').split('?')[0];
    if (!existsSync(join(PUBLIC, path.slice(1)))) imgMissing.add(path);
  }
}

async function download(path) {
  const dest = join(PUBLIC, path.replace(/^\//, ''));
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + path);
  if (!res.ok || !res.body) throw new Error(String(res.status));
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

const report = { cssMissing: [...cssMissing], imgMissingCount: imgMissing.size, downloaded: [], failed: [] };

for (const id of cssMissing) {
  try {
    await download(`/wp-content/uploads/elementor/css/post-${id}.css`);
    report.downloaded.push(`post-${id}.css`);
  } catch (e) {
    report.failed.push({ id, err: e.message });
  }
}

// Priority images referenced by newly downloaded CSS + common author header
const priority = [
  '/wp-content/uploads/2023/07/header-city-emirati.jpg',
  '/wp-content/uploads/2024/05/Rectangle-462.png',
];
for (const p of [...priority, ...[...imgMissing].slice(0, 200)]) {
  if (existsSync(join(PUBLIC, p.slice(1)))) continue;
  try {
    await download(p);
    report.downloaded.push(p);
  } catch (e) {
    report.failed.push({ path: p, err: e.message });
  }
}

// Rewrite absolute same-origin URLs in elementor CSS to root-relative
for (const f of walk(join(PUBLIC, 'wp-content/uploads/elementor/css')).filter((x) => x.endsWith('.css'))) {
  const before = readFileSync(f, 'utf8');
  const after = before.replace(/https?:\/\/(?:www\.)?emiratisationgateway\.com(\/wp-content\/[^"')\s]+)/gi, '$1');
  if (after !== before) {
    writeFileSync(f, after);
    report.downloaded.push('rewrote:' + f.replace(PUBLIC, ''));
  }
}

writeFileSync(join(ROOT, 'scripts/_missing-assets-report.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ cssMissing: report.cssMissing, downloaded: report.downloaded.length, failed: report.failed.length, imgMissingCount: report.imgMissingCount }, null, 2));
console.log('failed sample', report.failed.slice(0, 15));
