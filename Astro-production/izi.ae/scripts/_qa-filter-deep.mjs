#!/usr/bin/env node
import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5121';
const LIVE = 'https://izi.ae';

async function locationDetail(origin, loc) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${origin}/filter-screen/?filterlocation=${loc}`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  });
  await page.waitForTimeout(3000);
  const data = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.filter.car-wrap')];
    return {
      total: all.length,
      classes: all.map((el) => ({
        make: el.getAttribute('data-make'),
        vehicle: el.getAttribute('data-vehicle'),
        id: el.getAttribute('data-id'),
        className: el.className,
        display: getComputedStyle(el).display,
        hasDubai: el.classList.contains('Dubai'),
        hasAbu: el.classList.contains('Abu-Dhabi'),
      })),
      visible: all.filter((el) => getComputedStyle(el).display !== 'none').length,
    };
  });
  await browser.close();
  return data;
}

async function dropdownFilter(origin) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${origin}/filter-screen/`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  // set vehicle type via native select + change event (mirrors live sidebar filters)
  await page.evaluate(() => {
    const sel = document.querySelector('#vehicleType');
    if (!sel) throw new Error('no #vehicleType');
    sel.value = 'SUV';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.jQuery) window.jQuery(sel).trigger('change');
  });
  await page.waitForTimeout(1500);
  const afterType = await page.evaluate(() =>
    [...document.querySelectorAll('.filter.car-wrap')]
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => el.getAttribute('data-make') + '/' + el.getAttribute('data-vehicle')),
  );
  await page.evaluate(() => {
    const sel = document.querySelector('#make');
    sel.value = 'Toyota';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.jQuery) window.jQuery(sel).trigger('change');
  });
  await page.waitForTimeout(1200);
  const afterMake = await page.evaluate(() =>
    [...document.querySelectorAll('.filter.car-wrap')]
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => el.getAttribute('data-make') + '/' + el.getAttribute('data-vehicle')),
  );
  await browser.close();
  return { afterType, afterMake };
}

async function innerShowCars(origin, path) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  const meta = await page.evaluate(() => {
    const form = document.querySelector('#filter-form');
    if (!form) return { hasForm: false };
    // Prefer location Dubai if present
    const loc = form.querySelector('select[name="filterlocation"]');
    if (loc) {
      const opt = [...loc.options].find((o) => /dubai/i.test(o.value || o.text));
      if (opt) loc.value = opt.value;
    }
    return {
      hasForm: true,
      action: form.getAttribute('action'),
      method: form.getAttribute('method'),
      loc: form.querySelector('select[name="filterlocation"]')?.value || null,
    };
  });
  if (!meta.hasForm) {
    await browser.close();
    return meta;
  }
  // submit form
  await Promise.all([
    page.waitForURL(/filter-screen/, { timeout: 20000 }),
    page.evaluate(() => {
      const form = document.querySelector('#filter-form');
      form.submit();
    }),
  ]);
  await page.waitForTimeout(2800);
  const result = await page.evaluate(() => ({
    url: location.pathname + location.search,
    visible: [...document.querySelectorAll('.filter.car-wrap')].filter(
      (el) => getComputedStyle(el).display !== 'none',
    ).length,
    total: document.querySelectorAll('.filter.car-wrap').length,
  }));
  await browser.close();
  return { ...meta, ...result };
}

async function homepageCategoryNavigate(origin) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  // direct navigation (owl carousel may keep link off-viewport)
  await page.goto(origin + '/filter-screen/?vehicle_type=SUV', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const m = await page.evaluate(() => ({
    url: location.pathname + location.search,
    visible: [...document.querySelectorAll('.filter.car-wrap')].filter(
      (el) => getComputedStyle(el).display !== 'none',
    ).length,
    vehicles: [
      ...new Set(
        [...document.querySelectorAll('.filter.car-wrap')]
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => el.getAttribute('data-vehicle')),
      ),
    ],
  }));
  // brand link
  await page.goto(origin + '/filter-screen/?make=BMW', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const brand = await page.evaluate(() => ({
    visible: [...document.querySelectorAll('.filter.car-wrap')].filter(
      (el) => getComputedStyle(el).display !== 'none',
    ).length,
    makes: [
      ...new Set(
        [...document.querySelectorAll('.filter.car-wrap')]
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => el.getAttribute('data-make')),
      ),
    ],
  }));
  await browser.close();
  return { categorySuv: m, brandBmw: brand };
}

console.log('LOCAL Dubai', JSON.stringify(await locationDetail(LOCAL, 'Dubai'), null, 2));
console.log('LIVE Dubai', JSON.stringify(await locationDetail(LIVE, 'Dubai'), null, 2));

const localDd = await dropdownFilter(LOCAL);
const liveDd = await dropdownFilter(LIVE);
console.log('LOCAL dropdown', localDd);
console.log('LIVE dropdown', liveDd);

for (const path of ['/', '/vehicles/', '/suv/', '/sedan/', '/rent-a-car-uae/rent-a-car-dubai/']) {
  const local = await innerShowCars(LOCAL, path);
  const live = await innerShowCars(LIVE, path);
  console.log(
    'INNER',
    path,
    'local',
    JSON.stringify(local),
    'live',
    JSON.stringify(live),
    'match',
    local.visible === live.visible && (local.url || '').replace(LOCAL, '') === (live.url || '').replace(LIVE, ''),
  );
}

console.log('NAV local', await homepageCategoryNavigate(LOCAL));
console.log('NAV live', await homepageCategoryNavigate(LIVE));
