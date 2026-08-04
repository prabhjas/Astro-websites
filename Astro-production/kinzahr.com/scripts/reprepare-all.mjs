/**
 * Re-prepare every wordpress export with fixed URL rewrite + asset download.
 * Usage: node scripts/reprepare-all.mjs [--no-download]
 */
import { readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const EXPORTS = join(ROOT, 'source/wordpress-exports');
const noDownload = process.argv.includes('--no-download');
const CONCURRENCY = 2;

async function listSlugs(dir, prefix = '') {
  const out = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const slug = prefix ? `${prefix}/${ent.name}` : ent.name;
    const html = join(dir, ent.name, 'index-https.html');
    if (existsSync(html)) out.push(slug);
    else out.push(...(await listSlugs(join(dir, ent.name), slug)));
  }
  return out;
}

function prepare(slug) {
  return new Promise((resolve) => {
    const args = [join(ROOT, 'scripts/prepare-page.mjs'), slug];
    if (!noDownload) args.push('--download');
    const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let buf = '';
    child.stdout.on('data', (d) => {
      buf += d;
    });
    child.stderr.on('data', (d) => {
      buf += d;
    });
    child.on('close', (code) => {
      const ok = code === 0;
      const line = buf
        .split(/\r?\n/)
        .filter((l) => /Found |HTML asset|Wrote |FAIL |Missing/.test(l))
        .slice(0, 4)
        .join(' | ');
      console.log(`${ok ? 'OK' : 'ERR'} ${slug}${line ? ` — ${line}` : ''}`);
      resolve(ok);
    });
  });
}

async function mapPool(items, limit, fn) {
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
}

const slugs = await listSlugs(EXPORTS);
console.log(`Re-preparing ${slugs.length} exports (download=${!noDownload})…`);
let ok = 0;
let fail = 0;
await mapPool(slugs, CONCURRENCY, async (slug) => {
  const good = await prepare(slug);
  if (good) ok += 1;
  else fail += 1;
});
console.log(`Done: ${ok} ok, ${fail} failed`);
