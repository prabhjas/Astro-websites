#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'scripts/_parity-shots');
mkdirSync(OUT, { recursive: true });

const pages = [
  { id: 'home', path: '/' },
  { id: 'about', path: '/about-us/' },
  { id: 'contact', path: '/contact-us/' },
  { id: 'services', path: '/services/' },
  { id: 'portfolio', path: '/portfolio/' },
];

const widths = [375, 768, 1440];

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});

async function shot(base, label, path, width) {
  const page = await context.newPage();
  await page.setViewportSize({ width, height: 900 });
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  const file = join(OUT, `${label}-${path === '/' ? 'home' : path.replace(/\//g, '')}-${width}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await page.close();
  return file;
}

for (const p of pages) {
  for (const w of widths) {
    try {
      const live = await shot('https://lladesigners.com', 'live', p.path, w);
      const local = await shot('http://127.0.0.1:5112', 'local', p.path, w);
      console.log('OK', p.id, w, live, local);
    } catch (e) {
      console.error('FAIL', p.id, w, e.message);
    }
  }
}

await browser.close();
console.log('done', OUT);
