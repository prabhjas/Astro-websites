#!/usr/bin/env node
/**
 * Localize Lexend fonts + rewrite absolute izi.ae asset URLs in cleaned HTML/CSS.
 */
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const LEGACY = join(ROOT, 'src/legacy');
const ORIGIN = 'https://izi.ae';

async function download(pathname) {
  const clean = pathname.split('?')[0];
  if (!clean.startsWith('/')) return `skip ${clean}`;
  const dest = join(PUBLIC, ...clean.replace(/^\//, '').split('/'));
  if (existsSync(dest) && statSync(dest).size > 50) return 'cached';
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + clean, { headers: { 'User-Agent': 'izi-parity-fix/0.2' } });
  if (!res.ok || !res.body) return `fail ${res.status}`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return `new:${statSync(dest).size}`;
}

function walk(dir, pred, out = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, pred, out);
    else if (pred(name.name)) out.push(p);
  }
  return out;
}

// 1) Lexend CSS + fonts
const lexCssPath = '/wp-content/uploads/elementor/google-fonts/css/lexend.css';
console.log('lexend.css', await download(lexCssPath));
const absLex = join(PUBLIC, ...lexCssPath.replace(/^\//, '').split('/'));
let css = readFileSync(absLex, 'utf8');
const fontUrls = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) =>
  m[1].replace(/['"]/g, '').split('?')[0],
);
for (const u of fontUrls) {
  if (!u.includes('izi.ae') && !u.startsWith('/wp-content/')) continue;
  const path = u.replace(/^https?:\/\/(?:www\.)?izi\.ae/i, '');
  console.log('font', path, await download(path));
}
css = css.replace(/https?:\/\/(?:www\.)?izi\.ae(\/wp-content\/[^)"'\s]+)/gi, '$1');
// Prefer relative from css/ -> ../fonts/
css = css.replace(/url\(\/wp-content\/uploads\/elementor\/google-fonts\/fonts\//g, 'url(../fonts/');
writeFileSync(absLex, css);
console.log('rewrote lexend.css urls');

// 2) Rewrite cleaned HTML abs assets
let n = 0;
for (const f of walk(LEGACY, (name) => name.endsWith('.cleaned.html'))) {
  const raw = readFileSync(f, 'utf8');
  const next = raw.replace(
    /https?:\/\/(?:www\.)?izi\.ae(\/(?:wp-content|wp-includes)\/[^"'()\s]+)/gi,
    '$1',
  );
  if (next !== raw) {
    writeFileSync(f, next);
    n++;
  }
}
console.log('rewrote cleaned html files', n);

// 3) Rewrite public css that still point at absolute origin
let cssN = 0;
for (const f of walk(join(PUBLIC, 'wp-content'), (name) => name.endsWith('.css'))) {
  const raw = readFileSync(f, 'utf8');
  if (!/izi\.ae\/wp-content/.test(raw)) continue;
  const next = raw.replace(/https?:\/\/(?:www\.)?izi\.ae(\/wp-content\/[^)"'\s]+)/gi, '$1');
  if (next !== raw) {
    writeFileSync(f, next);
    cssN++;
  }
}
console.log('rewrote public css files', cssN);
