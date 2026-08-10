import { mkdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = 'Astro-production/emiratisationhub.com/public';
const urls = [
  '/wp-content/uploads/elementor/css/post-2598.css',
  '/wp-content/uploads/elementor/css/post-2625.css',
  '/wp-content/uploads/elementor/css/post-2593.css',
  '/wp-content/uploads/2024/05/a.png',
  '/wp-content/uploads/2024/05/8.png',
  '/wp-content/uploads/2024/05/6.png',
  '/wp-content/uploads/2024/05/9.png',
  '/wp-content/uploads/2024/05/5-2.png',
  '/wp-content/uploads/2024/05/7.png',
  '/wp-content/uploads/2024/05/1-1.png',
];

for (const u of urls) {
  const dest = join(ROOT, u.replace(/^\//, ''));
  if (existsSync(dest) && statSync(dest).size > 50) {
    console.log('HAVE', u);
    continue;
  }
  const res = await fetch('https://emiratisationhub.com' + u, {
    headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://emiratisationhub.com/author/' },
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const t = buf.slice(0, 60).toString('utf8');
  if (!res.ok || /<!doctype|<html/i.test(t)) {
    console.log('FAIL', res.status, buf.length, u, t.slice(0, 40).replace(/\s+/g, ' '));
    continue;
  }
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  console.log('GOT', buf.length, u);
}
