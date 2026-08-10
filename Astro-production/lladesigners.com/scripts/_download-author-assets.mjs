import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.cwd();
const htmlFiles = ['src/legacy/author.cleaned.html', 'src/legacy/author-shell/template.html'];

const missing = new Set();
for (const file of htmlFiles) {
  const html = readFileSync(join(ROOT, file), 'utf8');
  const urls = [
    ...html.matchAll(/href=["']([^"']*wp-content[^"']+\.css[^"']*)["']/gi),
    ...html.matchAll(/src=["']([^"']*wp-content[^"']+\.(?:js|css)[^"']*)["']/gi),
  ].map((m) => m[1].split('?')[0]);
  for (const u of urls) {
    let path = u;
    try {
      if (u.startsWith('http')) path = new URL(u).pathname;
    } catch {
      continue;
    }
    if (!path.startsWith('/')) continue;
    const dest = join(ROOT, 'public', ...path.split('/').filter(Boolean));
    if (!existsSync(dest)) missing.add(path);
  }
}

console.log('missing assets', missing.size);
const list = [...missing];
console.log(list.join('\n'));

async function download(pathname) {
  const dest = join(ROOT, 'public', ...pathname.split('/').filter(Boolean));
  mkdirSync(dirname(dest), { recursive: true });
  const url = `https://lladesigners.com${pathname}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn('FAIL', pathname, res.status);
    return;
  }
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
  console.log('OK', pathname);
}

for (const path of list) {
  await download(path);
}
