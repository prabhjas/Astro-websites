#!/usr/bin/env node
/**
 * Rewrite remaining https://connectgroup.co asset/page URLs to root-relative paths
 * so the Astro site does not depend on the live WordPress host.
 *
 * Usage: node scripts/rewrite-absolute-origin-urls.mjs
 */
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function walkFiles(dir, exts) {
  const out = [];
  if (!existsSync(dir)) return out;
  async function walk(current) {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = join(current, ent.name);
      if (ent.isDirectory()) {
        if (['node_modules', '.git', 'dist'].includes(ent.name)) continue;
        await walk(full);
      } else if (!exts || exts.has(extname(ent.name).toLowerCase())) {
        out.push(full);
      }
    }
  }
  await walk(dir);
  return out;
}

function rewriteOriginUrls(text) {
  let out = text.replace(/https:\\\/\\\/connectgroup\.co/gi, '');
  out = out.replace(/http:\\\/\\\/connectgroup\.co/gi, '');
  out = out.replace(/https:\/\/connectgroup\.co(\/[^"'()\s<>]*)/gi, (_, path) =>
    path.replace(/&amp;/g, '&').split('#')[0],
  );
  out = out.replace(/http:\/\/connectgroup\.co(\/[^"'()\s<>]*)/gi, (_, path) =>
    path.replace(/&amp;/g, '&').split('#')[0],
  );
  return out;
}

async function main() {
  const files = [
    ...(await walkFiles(join(ROOT, 'src/legacy'), new Set(['.html', '.css', '.js', '.json']))),
    ...(await walkFiles(join(ROOT, 'src/content'), new Set(['.json']))),
    ...(await walkFiles(join(ROOT, 'src/data'), new Set(['.yml', '.yaml']))),
    ...(await walkFiles(join(ROOT, 'public/chrome'), new Set(['.html', '.css']))),
    ...(await walkFiles(join(ROOT, 'public/wp-content'), new Set(['.css', '.js', '.mjs']))),
    ...(await walkFiles(join(ROOT, 'public/wp-includes'), new Set(['.css', '.js', '.mjs']))),
  ];

  let changed = 0;
  for (const file of files) {
    let raw;
    try {
      raw = await readFile(file, 'utf8');
    } catch {
      continue;
    }
    if (!/https?:\/\/connectgroup\.co/i.test(raw) && !/https?:\\\/\\\/connectgroup\.co/i.test(raw)) {
      continue;
    }
    const next = rewriteOriginUrls(raw);
    if (next !== raw) {
      await writeFile(file, next, 'utf8');
      changed += 1;
      console.log('rewrote', file.replace(ROOT, ''));
    }
  }

  console.log(`\nDone. Rewrote ${changed} files.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
