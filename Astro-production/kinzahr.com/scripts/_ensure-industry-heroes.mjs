import { createWriteStream, existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(ROOT, 'public/wp-content/uploads/2025/09');

for (const f of readdirSync(dir)) {
  if (/Construction|Logistics/i.test(f)) {
    console.log(
      JSON.stringify({
        f,
        size: statSync(join(dir, f)).size,
        tail: [...f].slice(-8).map((c) => c.codePointAt(0).toString(16)),
      }),
    );
  }
}

async function ensureCssBg(cssId) {
  const cssPath = join(ROOT, `public/wp-content/uploads/elementor/css/post-${cssId}.css`);
  const css = readFileSync(cssPath, 'utf8');
  const m = css.match(/url\("([^"]+)"\)/);
  if (!m) {
    console.log('no url in', cssId);
    return;
  }
  const localPath = m[1];
  const dest = join(ROOT, 'public', localPath.replace(/^\//, ''));
  console.log(cssId, 'bg', JSON.stringify(localPath), 'exists', existsSync(dest), existsSync(dest) ? statSync(dest).size : 0);
  if (!existsSync(dest) || statSync(dest).size < 1000) {
    const remote = 'https://kinzahr.com' + encodeURI(localPath);
    console.log('downloading', remote);
    const res = await fetch(remote, { headers: { 'User-Agent': 'kinzahr-astro-Migrator/0.1' } });
    console.log('status', res.status);
    if (!res.ok) throw new Error(String(res.status));
    await mkdir(dirname(dest), { recursive: true });
    await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
    console.log('wrote', dest, statSync(dest).size);
  }
  // sync dist
  const distDest = join(ROOT, 'dist/client', localPath.replace(/^\//, ''));
  mkdirSync(dirname(distDest), { recursive: true });
  copyFileSync(dest, distDest);
  copyFileSync(cssPath, join(ROOT, `dist/client/wp-content/uploads/elementor/css/post-${cssId}.css`));
}

await ensureCssBg('12738');
await ensureCssBg('12748');
console.log('done');
