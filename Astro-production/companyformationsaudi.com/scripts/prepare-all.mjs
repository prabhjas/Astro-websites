#!/usr/bin/env node
/**
 * Prepare all sitemap inventory slugs into src/legacy/*.cleaned.html
 * Uses Phase 01 exports (assets already in public/ — no --download).
 */
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const INV = join(ROOT, 'src/data/sitemap-inventory.json');
const CONCURRENCY = 4;

async function prepareOne(slug) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [join(ROOT, 'scripts/prepare-page.mjs'), slug], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('exit', (code) => {
      resolve({ slug, ok: code === 0, err: err.trim() });
    });
  });
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function main() {
  const inv = JSON.parse(await readFile(INV, 'utf8'));
  const slugs = new Set();
  for (const p of inv.pages || []) slugs.add(p.slug);
  for (const p of inv.posts || []) slugs.add(p.slug);
  for (const p of inv.law || []) slugs.add(p.slug);
  const list = [...slugs].sort();
  console.log(`Preparing ${list.length} slugs…`);

  const results = await mapPool(list, CONCURRENCY, async (slug, idx) => {
    const r = await prepareOne(slug);
    if ((idx + 1) % 20 === 0 || !r.ok) {
      console.log(`[${idx + 1}/${list.length}] ${r.ok ? 'ok' : 'FAIL'} ${slug}`);
      if (!r.ok && r.err) console.log(r.err.slice(0, 300));
    }
    return r;
  });

  const ok = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok);
  console.log(`Done: ok=${ok} fail=${fail.length}`);
  if (fail.length) {
    for (const f of fail.slice(0, 30)) console.log('  FAIL', f.slug);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
