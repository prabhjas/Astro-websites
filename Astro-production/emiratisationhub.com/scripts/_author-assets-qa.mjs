import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = 'Astro-production/emiratisationhub.com';
const files = [
  'src/legacy/author.cleaned.html',
  ...['nakul', 'binju-t-r', 'cheyne-hogan', 'tanzyn-giovanna', 'siva-rama', 'dylan-wesley'].map(
    (s) => `src/legacy/author/${s}.cleaned.html`,
  ),
];
const urls = new Set();
for (const f of files) {
  const html = readFileSync(join(ROOT, f), 'utf8');
  for (const m of html.matchAll(/(?:src|srcset|data-lazy-src|href)=["']([^"']+)["']/gi)) {
    for (const part of m[1].split(',')) {
      let u = part
        .trim()
        .split(/\s+/)[0]
        .replace(/^https?:\/\/(?:www\.)?emiratisationhub\.com/i, '');
      if (u.startsWith('/wp-content/') || u.startsWith('/images/')) urls.add(u.split('?')[0]);
    }
  }
}
let got = 0;
let miss = 0;
for (const u of urls) {
  const dest = join(ROOT, 'public', u.replace(/^\//, ''));
  if (existsSync(dest) && statSync(dest).size > 50) continue;
  try {
    const res = await fetch('' + u, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const t = buf.slice(0, 40).toString('utf8');
    if (!res.ok || /<html/i.test(t)) {
      miss++;
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    got++;
  } catch {
    miss++;
  }
}
console.log('author assets checked', urls.size, 'downloaded', got, 'miss', miss);

const local = await (await fetch('http://127.0.0.1:5107/author/')).text();
const live = await (await fetch('/author/')).text();
const h1 = (html) =>
  (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
console.log('local h1:', h1(local));
console.log('live h1:', h1(live));
console.log('local imgs', (local.match(/<img\b/g) || []).length, 'live imgs', (live.match(/<img\b/g) || []).length);
console.log('local abs anchors', [...local.matchAll(/<a\b[^>]*href=["']https:\/\/emiratisationhub\.com[^"']*/gi)].length);
