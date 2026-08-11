import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { dirname, join } from 'path';

const root = process.cwd();
const dir = join(root, 'src/content/blog');
const urls = new Set();

for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  try {
    const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    const s = j.featuredImage?.src;
    if (s) urls.add(String(s).split('?')[0]);
  } catch {
    /* ignore */
  }
}

let got = 0;
let miss = 0;
for (const u of urls) {
  const rel = u.replace(/^https?:\/\/[^/]+/i, '').replace(/^\//, '');
  const dest = join(root, 'public', rel);
  if (existsSync(dest) && statSync(dest).size > 200) continue;
  mkdirSync(dirname(dest), { recursive: true });
  try {
    const res = await fetch(`https://saudicompanyformation.com/${rel}`, {
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://saudicompanyformation.com/' },
    });
    if (!res.ok) {
      miss++;
      continue;
    }
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('text/html')) {
      miss++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 200) {
      miss++;
      continue;
    }
    writeFileSync(dest, buf);
    got++;
  } catch {
    miss++;
  }
}
console.log('featured urls', urls.size, 'downloaded', got, 'missing', miss);
