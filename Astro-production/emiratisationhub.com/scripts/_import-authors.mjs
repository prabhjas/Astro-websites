/**
 * Import live author directory + author profile pages as cleaned HTML mirrors.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://emiratisationhub.com';

const AUTHORS = [
  'nakul',
  'binju-t-r',
  'cheyne-hogan',
  'tanzyn-giovanna',
  'siva-rama',
  'dylan-wesley',
  'timothy-patridge',
  'muhammad-faieezvistaoutsourcing-com',
  'kate-w',
];

function prepare(slug) {
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
    // Still refresh from live for parity
  }
  console.log('FETCH', path);
  const res = await fetch(`${ORIGIN}${path}`);
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

await ensure('/author/');
for (const slug of AUTHORS) {
  await ensure(`/author/${slug}/`);
}
console.log('import authors done');
