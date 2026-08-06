#!/usr/bin/env node
/**
 * Download Elementor eicons, Font Awesome webfonts, and ElementsKit icon font.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://kpmpro.ae';

const PATHS = [
  '/wp-content/plugins/elementskit-lite/modules/elementskit-icon-pack/assets/fonts/elementskit.woff',
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2',
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff',
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.ttf',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-brands-400.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-brands-400.woff',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-regular-400.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-regular-400.woff',
];

async function download(rel) {
  const dest = path.join(ROOT, 'public', rel.replace(/^\//, ''));
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const url = `${ORIGIN}${rel}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'KpmproAssetSync/1.0' } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
  const size = fs.statSync(dest).size;
  console.log('OK', rel, size);
}

async function main() {
  let ok = 0;
  const failed = [];
  for (const rel of PATHS) {
    try {
      await download(rel);
      ok++;
    } catch (e) {
      failed.push([rel, String(e.message || e)]);
      console.error('FAIL', rel, e.message || e);
    }
  }
  console.log({ ok, failed: failed.length });
  if (failed.length) process.exitCode = 1;
}

main();
