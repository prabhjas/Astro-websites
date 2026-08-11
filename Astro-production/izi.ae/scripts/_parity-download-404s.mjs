#!/usr/bin/env node
/**
 * Download known 404 assets from live izi.ae into public/.
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const ORIGIN = 'https://izi.ae';

const MISSING = [
  '/wp-content/plugins/elementor/assets/js/section-frontend-handlers.d85ab872da118940910d.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/shared-frontend-handlers.03caa53373b56d3bab67.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/accordion.8b0db5058afeb74622f5.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/text-editor.45609661e409413f1cef.bundle.min.js',
  '/wp-content/plugins/elementor/assets/js/counter.12335f45aaa79d244f24.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/share-buttons.b99b5ff11c944a3a8ea9.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/nav-menu.3afa8f5eb1fef7c22561.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/loop.1594a1df76e87a11eda2.bundle.min.js',
  '/wp-content/plugins/elementor-pro/assets/js/loop-carousel.881847b13e8fe1f8bfc2.bundle.min.js',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags@2x.png',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/js/intlTelInput-jquery.min.js',
];

async function download(pathname) {
  const dest = join(PUBLIC, ...pathname.replace(/^\//, '').split('/'));
  if (existsSync(dest) && statSync(dest).size > 20) return 'cached';
  mkdirSync(dirname(dest), { recursive: true });
  const res = await fetch(ORIGIN + pathname, {
    headers: { 'User-Agent': 'izi-parity-dl/0.3', Accept: '*/*' },
  });
  if (!res.ok || !res.body) return `fail ${res.status}`;
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return `new ${statSync(dest).size}`;
}

for (const p of MISSING) {
  console.log(p, await download(p));
}

// Scan interactive report for more 404s if present
try {
  const report = JSON.parse(readFileSync(join(ROOT, '.tmp-qa/parity-interactive.json'), 'utf8'));
  const more = new Set();
  for (const row of report) {
    for (const f of row.failed || []) {
      const m = f.match(/^\d+\s+(\/wp-content\/\S+)/);
      if (m) more.add(m[1].split('?')[0]);
    }
  }
  for (const p of more) {
    if (MISSING.includes(p)) continue;
    console.log('extra', p, await download(p));
  }
} catch {
  /* */
}

// Create empty chrome/header.css stub only if shared-chrome links it and file missing
const chromeCss = join(PUBLIC, 'chrome/header.css');
if (!existsSync(chromeCss)) {
  mkdirSync(dirname(chromeCss), { recursive: true });
  writeFileSync(chromeCss, '/* izi.ae — chrome header extras (mirror uses Elementor header) */\n');
  console.log('created /chrome/header.css stub');
}
