#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
async function check(path) {
  const page = await browser.newPage();
  const fails = new Set();
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().includes('127.0.0.1:5121')) {
      fails.add(r.status() + ' ' + r.url().replace('http://127.0.0.1:5121', '').split('?')[0]);
    }
  });
  await page.goto('http://127.0.0.1:5121' + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.filter.car-wrap')];
    const visible = all.filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 20);
    return {
      total: all.length,
      visible: visible.length,
      titles: visible.map((el) => (el.getAttribute('data-make') || '') + '/' + (el.getAttribute('data-vehicle') || '')),
    };
  });
  console.log(path, JSON.stringify({ m, fails: [...fails] }, null, 2));
  await page.close();
  return { path, m, fails: [...fails] };
}

const results = [];
results.push(await check('/filter-screen/?vehicle_type=SUV'));
results.push(await check('/filter-screen/?make=Toyota'));
results.push(await check('/filter-screen/?vehicle_type=Sedan'));
results.push(await check('/filter-screen/?experience=Electric'));

// interact: change vehicle type dropdown and submit if possible
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5121/filter-screen/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
const before = await page.evaluate(() => document.querySelectorAll('.filter.car-wrap').length);
// try select SUV and click search if button exists
const changed = await page.evaluate(() => {
  const sel = document.querySelector('#vehicleType');
  if (!sel) return { ok: false };
  sel.value = 'SUV';
  sel.dispatchEvent(new Event('change', { bubbles: true }));
  const form = document.querySelector('#filter-form, form.filterForm1');
  const btn = form?.querySelector('[type=submit], button, .elementor-button');
  return { ok: true, hasForm: !!form, btn: btn?.outerHTML?.slice(0, 120), name: sel.getAttribute('name') };
});
console.log('interact meta', changed, 'beforeAll', before);
if (changed.ok) {
  // form uses GET with name selectField for multiple - may need special handling
  await page.selectOption('#vehicleType', 'SUV').catch(() => {});
  // navigate like homepage does
  await page.goto('http://127.0.0.1:5121/filter-screen/?vehicle_type=SUV', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
}
await browser.close();
