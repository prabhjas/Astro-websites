#!/usr/bin/env node
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 160)); });
page.on('pageerror', (e) => errs.push('PAGE: ' + e.message.slice(0, 160)));
await page.goto('http://127.0.0.1:5121/filter-screen/?vehicle_type=SUV', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3500);
const m = await page.evaluate(() => {
  const all = [...document.querySelectorAll('.filter.car-wrap')];
  const visible = all.filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 20);
  return {
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim(),
    total: all.length,
    visible: visible.length,
    titles: visible.map((el) => el.getAttribute('data-make') + ' ' + el.getAttribute('data-vehicle')),
    jq: typeof window.jQuery,
    filterScriptRan: all.some((el) => el.style.display === 'none') || visible.length < all.length,
  };
});
console.log(JSON.stringify({ m, errs: errs.slice(0, 10) }, null, 2));
await page.screenshot({ path: '.tmp-qa/shots/local-filter-suv.png', fullPage: false });
await browser.close();
if (m.visible < 1) process.exit(1);
