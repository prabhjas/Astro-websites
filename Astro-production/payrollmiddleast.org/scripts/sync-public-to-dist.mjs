#!/usr/bin/env node
/**
 * Mirror public/ into dist/client/ so Node production (`node dist/server/entry.mjs`)
 * serves the same assets that look fine under `astro dev`.
 *
 * Connect FZ regression: localhost OK, go-live missing images because uploads
 * lived only under public/ and were never synced into dist/client.
 *
 * Usage: node scripts/sync-public-to-dist.mjs
 */
import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const DIST = join(ROOT, 'dist/client');

if (!existsSync(PUBLIC)) {
  console.error('public/ missing');
  process.exit(1);
}
mkdirSync(DIST, { recursive: true });

function syncTree(srcName) {
  const src = join(PUBLIC, srcName);
  const dest = join(DIST, srcName);
  if (!existsSync(src)) return;
  mkdirSync(dirname(dest), { recursive: true });
  // Prefer rsync when available (faster, preserves mtimes).
  const rsync = spawnSync(
    'rsync',
    ['-a', '--delete', `${src}/`, `${dest}/`],
    { stdio: 'inherit' },
  );
  if (rsync.error || rsync.status !== 0) {
    rmSync(dest, { recursive: true, force: true });
    cpSync(src, dest, { recursive: true });
  }
  const srcSize = spawnSync('du', ['-sh', src], { encoding: 'utf8' }).stdout?.trim();
  const destSize = spawnSync('du', ['-sh', dest], { encoding: 'utf8' }).stdout?.trim();
  console.log(`synced ${srcName}: ${srcSize} -> ${destSize}`);
}

syncTree('wp-content');
syncTree('wp-includes');

// Copy other top-level public entries (css/js/scripts/runtime files, etc.).
for (const name of [
  'css',
  'js',
  'scripts',
  'images',
  'fonts',
  'favicon.ico',
  'robots.txt',
  'runtime-gtm.js',
]) {
  const src = join(PUBLIC, name);
  if (!existsSync(src)) continue;
  const dest = join(DIST, name);
  const st = statSync(src);
  if (st.isDirectory()) {
    mkdirSync(dest, { recursive: true });
    cpSync(src, dest, { recursive: true });
  } else {
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
  }
  console.log(`synced ${name}`);
}

console.log('sync-public-to-dist done');
