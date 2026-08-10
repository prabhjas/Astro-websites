#!/usr/bin/env node
/**
 * Download all Elementor + Elementor Pro webpack chunks referenced by runtime maps.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://companyformationsaudi.com';

async function download(rel) {
  const dest = join(PUBLIC, ...rel.split('/').filter(Boolean));
  if (existsSync(dest) && readFileSync(dest).slice(0, 12).toString() !== '<!doctype ht') {
    const head = readFileSync(dest, 'utf8').slice(0, 20);
    if (!head.includes('<!doctype') && !head.includes('<html')) {
      console.log('cached', rel);
      return;
    }
  }
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + rel, {
    headers: { 'User-Agent': 'crs-chunk-fetch/0.1', Accept: '*/*' },
  });
  if (!res.ok) {
    console.warn('FAIL', res.status, rel);
    return;
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.slice(0, 15).toString().toLowerCase().includes('<!doctype')) {
    console.warn('HTML', rel);
    return;
  }
  writeFileSync(dest, buf);
  console.log('new', rel, buf.length);
}

function extractBundleNames(runtime) {
  const names = new Set();
  for (const m of runtime.matchAll(/"([a-z0-9._-]+\.bundle\.min\.js)"/gi)) {
    names.add(m[1]);
  }
  // Also ternary form: ?"name.bundle.min.js"
  for (const m of runtime.matchAll(/\?\"([a-z0-9._-]+\.bundle\.min\.js)\"/gi)) {
    names.add(m[1]);
  }
  for (const m of runtime.matchAll(/([a-z0-9._-]+\.bundle\.min\.js)/gi)) {
    names.add(m[1]);
  }
  return [...names];
}

const runtimes = [
  '/wp-content/plugins/elementor/assets/js/webpack.runtime.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/webpack-pro.runtime.min.js',
];

for (const rt of runtimes) {
  const local = join(PUBLIC, ...rt.split('/').filter(Boolean));
  let text;
  if (existsSync(local)) text = readFileSync(local, 'utf8');
  else {
    text = await (await fetch(ORIGIN + rt)).text();
    writeFileSync(local, text);
  }
  const base = rt.includes('elementor-pro')
    ? '/wp-content/plugins/elementor-pro/assets/js/'
    : '/wp-content/plugins/elementor/assets/js/';
  const names = extractBundleNames(text);
  console.log(rt, 'bundles', names.length);
  for (const name of names) {
    await download(base + name);
  }
}

console.log('done');
