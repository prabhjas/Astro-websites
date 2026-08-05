import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { dirname, join } from 'path';

const ROOT = process.cwd();
const legacy = join(ROOT, 'src/legacy');
const blogDir = join(ROOT, 'src/content/blog');
const files = readdirSync(legacy).filter((f) => f.endsWith('.cleaned.html'));
const urls = new Set();

function addUrl(raw) {
  if (!raw) return;
  for (const part of String(raw).split(',')) {
    let u = part.trim().split(/\s+/)[0];
    if (!u) continue;
    u = u.replace(/^https?:\/\/(?:www\.)?royalvisa\.ae/i, '');
    if (u.startsWith('/wp-content/') || u.startsWith('/wp-includes/')) {
      urls.add(u.split('?')[0]);
    }
  }
}

for (const f of files) {
  const html = readFileSync(join(legacy, f), 'utf8');
  for (const m of html.matchAll(/(?:src|srcset|href|data-src|data-lazy-src)=["']([^"']+)["']/gi)) {
    addUrl(m[1]);
  }
  for (const m of html.matchAll(/url\((['"]?)([^'")]+)\1\)/gi)) {
    addUrl(m[2]);
  }
}

// Featured images from blog JSON
if (existsSync(blogDir)) {
  for (const f of readdirSync(blogDir).filter((x) => x.endsWith('.json'))) {
    try {
      const j = JSON.parse(readFileSync(join(blogDir, f), 'utf8'));
      const src = j.featuredImage?.src || j.featuredImage?.url;
      if (src) addUrl(src);
    } catch {
      /* ignore */
    }
  }
}

console.log('unique asset paths', urls.size);
const missing = [];
let ok = 0;
for (const u of urls) {
  const disk = join(ROOT, 'public', u.replace(/^\//, ''));
  try {
    if (existsSync(disk) && statSync(disk).size > 100) {
      ok++;
      continue;
    }
  } catch {
    /* missing */
  }
  missing.push(u);
}
console.log('on disk ok', ok, 'missing', missing.length);
writeFileSync(join(ROOT, '.tmp-missing-assets.json'), JSON.stringify(missing, null, 2));

let got = 0;
let fail = 0;
const still = [];
for (const u of missing) {
  const dest = join(ROOT, 'public', u.replace(/^\//, ''));
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const res = await fetch(`https://royalvisa.ae${u}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://royalvisa.ae/' },
      redirect: 'follow',
    });
    if (!res.ok) {
      fail++;
      still.push(u);
      continue;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      fail++;
      still.push(u);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) {
      fail++;
      still.push(u);
      continue;
    }
    writeFileSync(dest, buf);
    got++;
  } catch {
    fail++;
    still.push(u);
  }
}
console.log('downloaded', got, 'still fail', fail);
writeFileSync(join(ROOT, '.tmp-still-missing.json'), JSON.stringify(still, null, 2));
console.log('sample still missing:\n' + still.slice(0, 25).join('\n'));
