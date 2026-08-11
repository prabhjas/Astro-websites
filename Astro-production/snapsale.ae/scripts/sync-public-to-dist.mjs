#!/usr/bin/env node
/**
 * Astro build does not always copy large public/wp-content trees into dist/client.
 * Fleet production serves dist/client only — mirror public assets after every build.
 */
import { cpSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist/client');
const PUBLIC = join(ROOT, 'public');

if (!existsSync(DIST)) {
  console.warn('sync-public-to-dist: dist/client missing — run astro build first');
  process.exit(0);
}

for (const dir of ['wp-content', 'js', 'css', 'chrome', 'images']) {
  const src = join(PUBLIC, dir);
  if (!existsSync(src)) continue;
  cpSync(src, join(DIST, dir), { recursive: true, force: true });
  console.log(`sync-public-to-dist: public/${dir} → dist/client/${dir}`);
}
