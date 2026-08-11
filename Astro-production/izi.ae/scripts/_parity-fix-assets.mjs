#!/usr/bin/env node
/**
 * Download missing parity assets and rewrite leftover absolute izi.ae asset URLs in cleaned HTML.
 */
import { createWriteStream, existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const LEGACY = join(ROOT, 'src/legacy');
const ORIGIN = 'https://izi.ae';

const EXTRA = [
  '/wp-content/uploads/2025/05/logo-izi.png',
  '/wp-content/uploads/2025/10/IZI-rent-a-cars-150x150.webp',
  '/wp-content/uploads/2024/04/logo-izi.png',
  '/wp-content/uploads/elementor/google-fonts/css/lexend.css',
  '/wp-content/uploads/elementor/google-fonts/fonts/lexend-v19-latin-regular.woff2',
  '/wp-content/uploads/elementor/google-fonts/fonts/lexend-v19-latin-500.woff2',
  '/wp-content/uploads/elementor/google-fonts/fonts/lexend-v19-latin-600.woff2',
  '/wp-content/uploads/elementor/google-fonts/fonts/lexend-v19-latin-700.woff2',
];

async function download(pathname) {
  const dest = join(PUBLIC, ...pathname.replace(/^\//, '').split('/'));
  if (existsSync(dest) && statSync(dest).size > 0) return 'cached';
  mkdirSync(dirname(dest), { recursive: true });
  const url = ORIGIN + pathname;
  const res = await fetch(url, { headers: { 'User-Agent': 'izi-parity-fix/0.1' } });
  if (!res.ok) return `fail ${res.status}`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return 'new';
}

function rewriteFile(file) {
  let raw = readFileSync(file, 'utf8');
  const next = raw
    .replace(/https?:\/\/(?:www\.)?izi\.ae(\/wp-content\/[^"'()\s]+)/gi, '$1')
    .replace(/https?:\/\/(?:www\.)?izi\.ae(\/wp-includes\/[^"'()\s]+)/gi, '$1');
  if (next !== raw) {
    writeFileSync(file, next);
    return true;
  }
  return false;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, out);
    else if (name.name.endsWith('.cleaned.html')) out.push(p);
  }
  return out;
}

const results = {};
for (const p of EXTRA) {
  results[p] = await download(p);
}
console.log('downloads', results);

// Also pull font files referenced by lexend.css if present
const lexendPath = join(PUBLIC, 'wp-content/uploads/elementor/google-fonts/css/lexend.css');
if (existsSync(lexendPath)) {
  const css = readFileSync(lexendPath, 'utf8');
  const fonts = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1].replace(/['"]/g, '').split('?')[0]);
  for (const f of fonts) {
    let path = f;
    if (path.startsWith('../')) path = '/wp-content/uploads/elementor/google-fonts/' + path.replace(/^\.\.\//, '');
    else if (path.startsWith('/')) path = path;
    else path = '/wp-content/uploads/elementor/google-fonts/css/' + path;
    if (path.includes('google-fonts')) {
      const st = await download(path.replace(/\\/g, '/'));
      console.log('font', path, st);
    }
  }
}

let rewritten = 0;
for (const f of walk(LEGACY)) {
  if (rewriteFile(f)) rewritten++;
}
console.log('rewrote cleaned files', rewritten);
