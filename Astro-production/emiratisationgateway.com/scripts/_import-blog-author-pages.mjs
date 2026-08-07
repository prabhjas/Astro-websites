/**
 * Import blog pagination + author pages from live emiratisationgateway.com.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const ORIGIN = 'https://emiratisationgateway.com';

async function prepare(slug) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, ['scripts/prepare-page.mjs', slug, '--download'], {
      cwd: ROOT,
      stdio: 'inherit',
    });
    c.on('exit', (code) => resolve(code === 0));
  });
}

async function ensure(path) {
  const slug = path.replace(/^\/+|\/+$/g, '');
  const cleaned = join(ROOT, 'src/legacy', `${slug}.cleaned.html`);
  if (existsSync(cleaned)) {
    console.log('HAVE', path);
    return true;
  }
  console.log('FETCH', path);
  const res = await fetch(`${ORIGIN}${path}`, {
    headers: { 'User-Agent': 'emiratisationgateway-astro-Migrator/0.1' },
    redirect: 'follow',
  });
  const html = await res.text();
  if (!res.ok || !/<html/i.test(html) || html.length < 2000) {
    console.warn('SKIP', path, res.status, html.length);
    return false;
  }
  const dir = join(ROOT, 'source/wordpress-exports', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index-https.html'), html);
  const ok = await prepare(slug);
  console.log(ok ? 'OK' : 'FAIL', path);
  return ok;
}

const blog = await (await fetch(`${ORIGIN}/blog/`)).text();
const maxFromSettings = [...blog.matchAll(/max_num_pages&quot;:&quot;(\d+)/g)].map((m) => Number(m[1]));
const maxPage = Math.max(5, ...maxFromSettings, 1);
console.log('blog max page', maxPage);

for (let i = 2; i <= maxPage; i++) {
  await ensure(`/blog/page/${i}/`);
}

await ensure('/author/');

const authorSlugs = [
  'admin',
  'nakul',
  'binju-t-r',
  'cheyne-hogan',
  'siva-rama-krishna',
  'dylan-wesley-wright',
  'tanzyn-giovanna',
  'liam-doherty',
  'kate',
  'timothy-patridge',
];

for (const slug of authorSlugs) {
  await ensure(`/author/${slug}/`);
}

// Author pagination pages (if linked)
for (const slug of authorSlugs) {
  const html = await (await fetch(`${ORIGIN}/author/${slug}/`)).text();
  const pages = [...html.matchAll(new RegExp(`/author/${slug}/page/(\\d+)/`, 'g'))].map((m) =>
    Number(m[1]),
  );
  const max = Math.max(0, ...pages);
  for (let i = 2; i <= max; i++) {
    await ensure(`/author/${slug}/page/${i}/`);
  }
}

console.log('import-blog-author done');
