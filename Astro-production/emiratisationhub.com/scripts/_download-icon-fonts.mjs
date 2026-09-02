import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const ROOT = 'D:/Astro-websites/Astro-production/emiratisationhub.com/public';
const LIVE = 'https://emiratisationhub.com';

const assets = [
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-brands-400.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-regular-400.woff2',
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2',
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff',
];

for (const path of assets) {
  const url = LIVE + path;
  const out = join(ROOT, path.replace(/^\//, '').replace(/\//g, '\\'));
  await mkdir(dirname(out), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    console.error('FAIL', path, res.status);
    continue;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(out, buf);
  console.log('OK', path, buf.length);
}
