/**
 * Download featured images referenced by blog JSON.
 */
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG = join(ROOT, 'src/content/blog');
const ORIGIN = 'https://emiratisationhub.com';

const urls = new Set();
for (const f of readdirSync(BLOG).filter((x) => x.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(join(BLOG, f), 'utf8'));
  const src = j.featuredImage?.src;
  if (src) urls.add(src.split('?')[0]);
}

let got = 0;
let miss = 0;
let have = 0;
for (const u of urls) {
  const dest = join(ROOT, 'public', u.replace(/^\//, ''));
  if (existsSync(dest) && statSync(dest).size > 100) {
    have++;
    continue;
  }
  try {
    const res = await fetch(ORIGIN + u, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: ORIGIN + '/' },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    const t = buf.slice(0, 40).toString('utf8');
    if (!res.ok || /<html/i.test(t)) {
      miss++;
      console.warn('MISS', res.status, u);
      continue;
    }
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, buf);
    got++;
  } catch {
    miss++;
  }
}
console.log({ total: urls.size, have, got, miss });
