/**
 * Download missing public assets referenced by cleaned HTML / CSS / blog JSON.
 */
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://emiratisationhub.com';
const urls = new Set();

function addUrl(raw) {
  if (!raw) return;
  for (const part of String(raw).split(',')) {
    let u = part.trim().split(/\s+/)[0];
    if (!u) continue;
    u = u.replace(/^https?:\/\/(?:www\.)?emiratisationhub\.com/i, '');
    u = u.replace(/^https?:\/\/secure\.gravatar\.com\/avatar\/.*/i, '');
    if (u.startsWith('/wp-content/') || u.startsWith('/wp-includes/') || u.startsWith('/images/')) {
      urls.add(u.split('?')[0]);
    }
  }
}

function scanText(text) {
  for (const m of text.matchAll(/(?:src|srcset|href|data-src|data-lazy-src|data-lazy-srcset)=["']([^"']+)["']/gi)) {
    addUrl(m[1]);
  }
  for (const m of text.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) {
    addUrl(m[2]);
  }
}

function walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p);
    else if (/\.(html|css|json)$/i.test(name.name)) scanText(readFileSync(p, 'utf8'));
  }
}

walk(join(ROOT, 'src/legacy'));
walk(join(ROOT, 'src/content'));
walk(join(ROOT, 'public/wp-content/uploads/elementor/css'));

// Known missing parity assets
[
  '/wp-content/uploads/2024/02/CTA-5.png',
  '/wp-content/uploads/2024/10/iconoir_arrow-left.svg',
  '/wp-content/uploads/2024/05/cropped-8.png',
  '/wp-content/uploads/2024/05/cropped-6.png',
  '/wp-content/uploads/2024/05/cropped-9.png',
  '/wp-content/uploads/2024/05/cropped-5-2-1.png',
  '/wp-content/uploads/2024/05/cropped-1-1.png',
].forEach(addUrl);

console.log('unique asset paths', urls.size);
const missing = [];
let ok = 0;
for (const u of urls) {
  const disk = join(ROOT, 'public', u.replace(/^\//, ''));
  try {
    if (existsSync(disk) && statSync(disk).size > 50) {
      ok++;
      continue;
    }
  } catch {
    /* missing */
  }
  missing.push(u);
}
console.log('on disk ok', ok, 'missing', missing.length);

let got = 0;
let fail = 0;
const still = [];
for (const u of missing) {
  const dest = join(ROOT, 'public', u.replace(/^\//, ''));
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const res = await fetch(`${ORIGIN}${u}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: `${ORIGIN}/` },
      redirect: 'follow',
    });
    if (!res.ok) {
      fail++;
      still.push(`${res.status} ${u}`);
      continue;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      fail++;
      still.push(`html ${u}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 40) {
      fail++;
      still.push(`tiny ${u}`);
      continue;
    }
    writeFileSync(dest, buf);
    got++;
  } catch (err) {
    fail++;
    still.push(`err ${u}`);
  }
}
console.log('downloaded', got, 'still fail', fail);
if (still.length) console.log(still.slice(0, 40).join('\n'));
