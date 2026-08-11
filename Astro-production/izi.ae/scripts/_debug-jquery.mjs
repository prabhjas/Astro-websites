#!/usr/bin/env node
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => {
  if (m.type() === 'error') logs.push(m.text());
});
page.on('pageerror', (e) => logs.push(e.message));
await page.goto('http://127.0.0.1:5121/vehicles/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2000);
const info = await page.evaluate(() => {
  const scripts = [...document.scripts].map((s) => ({
    src: (s.src || '').replace(location.origin, ''),
    hasJQ: /jquery/i.test(s.src || ''),
  }));
  return {
    jquery: typeof window.jQuery,
    $: typeof window.$,
    jqFn: typeof window.jQuery === 'function' ? typeof window.jQuery.fn : 'n/a',
    scriptCount: scripts.length,
    jqScripts: scripts.filter((s) => s.hasJQ),
  };
});
console.log(info);
console.log('errors', logs);
await browser.close();
