#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('pageerror', (err) => {
  console.log('PAGEERROR:', err.message);
  console.log(err.stack?.split('\n').slice(0, 8).join('\n'));
});
page.on('console', async (msg) => {
  if (msg.type() !== 'error') return;
  const loc = msg.location();
  console.log('CONSOLE', msg.text().slice(0, 180), loc?.url, loc?.lineNumber);
});

await page.goto('http://127.0.0.1:5121/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
await page.waitForTimeout(2000);

// Locate speculationrules / untyped json scripts
const bad = await page.evaluate(() => {
  return [...document.querySelectorAll('script:not([src])')].map((s, i) => ({
    i,
    type: s.type || '(empty)',
    head: (s.textContent || '').slice(0, 120).replace(/\s+/g, ' '),
  })).filter((s) => /prefetch|Rent|IZI/.test(s.head));
});
console.log('scripts of interest', JSON.stringify(bad, null, 2));
await browser.close();
