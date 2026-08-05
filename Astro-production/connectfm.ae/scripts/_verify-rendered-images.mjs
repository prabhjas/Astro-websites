import { existsSync, mkdirSync, createWriteStream, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://connectfm.ae';
const pages = ['/', '/top-hvac-companies-in-dubai/', '/blog/', '/about-us/', '/contact-us/'];

async function download(url, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(url, {
    headers: { 'User-Agent': 'connectfm-local-asset-check/1.0', Referer: ORIGIN + '/' },
  });
  if (!res.ok || !res.body) throw new Error(String(res.status));
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

function collectImgUrls(html) {
  const urls = new Set();
  for (const m of html.matchAll(/<(?:img|source|link)\b[^>]*>/gi)) {
    const tag = m[0];
    for (const a of tag.matchAll(/\b(?:src|srcset|href|content|data-src|data-lazy-src|data-lazy-srcset)=["']([^"']+)["']/gi)) {
      for (const part of a[1].split(',')) {
        const u = part.trim().split(/\s+/)[0];
        if (u) urls.add(u);
      }
    }
  }
  for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) urls.add(m[1].trim());
  return [...urls];
}

function normalize(u) {
  if (u.startsWith('//')) u = 'https:' + u;
  if (/^https?:\/\/(?:www\.)?connectfm\.ae\//i.test(u)) {
    return { kind: 'live-abs', path: u.replace(/^https?:\/\/(?:www\.)?connectfm\.ae/i, '') };
  }
  if (u.startsWith('/wp-content/') || u.startsWith('/js/') || u.startsWith('/css/') || u.startsWith('/chrome/')) {
    return { kind: 'local-rel', path: u.split('?')[0] };
  }
  if (/^https?:\/\//i.test(u)) return { kind: 'other-remote', path: u };
  return { kind: 'other', path: u };
}

const report = [];
const needDl = new Set();

for (const page of pages) {
  const res = await fetch('http://127.0.0.1:5087' + page);
  const html = await res.text();
  const urls = collectImgUrls(html);
  const rows = urls.map(normalize);
  const liveAbs = rows.filter((r) => r.kind === 'live-abs');
  const localRel = rows.filter((r) => r.kind === 'local-rel');
  const otherRemote = rows.filter((r) => r.kind === 'other-remote' && /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i.test(r.path));
  const missingLocal = [];
  for (const r of [...liveAbs, ...localRel]) {
    const p = r.path.split('?')[0];
    if (!/\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i.test(p) && !p.includes('/uploads/')) continue;
    const disk = join(PUBLIC, ...p.split('/').filter(Boolean));
    if (!existsSync(disk)) {
      missingLocal.push(p);
      needDl.add(p);
    }
  }
  report.push({
    page,
    imgish: rows.filter((r) => /\.(png|jpe?g|webp|gif|svg|avif|ico)(\?|$)/i.test(r.path) || r.path.includes('/uploads/')).length,
    liveAbs: liveAbs.length,
    liveAbsSamples: [...new Set(liveAbs.map((r) => r.path))].slice(0, 12),
    missingLocal: missingLocal.length,
    missingSamples: missingLocal.slice(0, 12),
    otherRemote: otherRemote.length,
    otherSamples: otherRemote.map((r) => r.path).slice(0, 5),
  });
}

console.log(JSON.stringify(report, null, 2));
console.log('\nNeed download', needDl.size);
let ok = 0;
let fail = 0;
for (const p of needDl) {
  const dest = join(PUBLIC, ...p.split('/').filter(Boolean));
  try {
    await download(ORIGIN + p, dest);
    ok += 1;
    console.log('DL', p);
  } catch (e) {
    fail += 1;
    console.warn('FAIL', p, e.message);
  }
}
console.log('Downloaded', ok, 'failed', fail);
writeFileSync(join(ROOT, 'scripts/_image-verify-report.json'), JSON.stringify({ report, needDl: [...needDl] }, null, 2));
