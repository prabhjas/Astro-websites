#!/usr/bin/env node
/**
 * Parity QA: filter-screen + inner-page filter forms (local vs live).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const LOCAL = 'http://127.0.0.1:5121';
const LIVE = 'https://izi.ae';

const FILTER_URLS = [
  '/filter-screen/',
  '/filter-screen/?vehicle_type=SUV',
  '/filter-screen/?vehicle_type=Sedan',
  '/filter-screen/?vehicle_type=Convertible',
  '/filter-screen/?vehicle_type=Coupe',
  '/filter-screen/?vehicle_type=Hatchback',
  '/filter-screen/?vehicle_type=Pickup',
  '/filter-screen/?vehicle_type=Van',
  '/filter-screen/?vehicle_type=Wagon',
  '/filter-screen/?make=Toyota',
  '/filter-screen/?make=BMW',
  '/filter-screen/?make=Nissan',
  '/filter-screen/?make=Hyundai',
  '/filter-screen/?make=Audi',
  '/filter-screen/?experience=Electric',
  '/filter-screen/?experience=Deluxe',
  '/filter-screen/?experience=4x4',
  '/filter-screen/?experience=Clasic-car',
  '/filter-screen/?experience=Convertible',
  '/filter-screen/?experience=Pet-Friendly',
  '/filter-screen/?filterlocation=Dubai',
  '/filter-screen/?filterlocation=Abu-Dhabi',
  '/filter-screen/?make=Toyota&vehicle_type=SUV',
];

const INNER_PAGES = [
  '/',
  '/vehicles/',
  '/suv/',
  '/sedan/',
  '/vehicles/toyota/',
  '/vehicles/nissan/',
  '/rent-a-car-uae/',
  '/rent-a-car-uae/rent-a-car-dubai/',
];

async function probeFilterResults(page, origin, path) {
  const fails = new Set();
  const errors = [];
  const onFail = (r) => {
    if (r.status() >= 400 && r.url().includes(origin.replace('https://', '').replace('http://', '').split('/')[0])) {
      const u = r.url().replace(origin, '').split('?')[0];
      if (!u.includes('/cdn-cgi/')) fails.add(`${r.status()} ${u}`);
    }
  };
  const onErr = (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 120));
  };
  page.on('response', onFail);
  page.on('console', onErr);

  const res = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2800);

  const data = await page.evaluate(() => {
    const all = [...document.querySelectorAll('.filter.car-wrap, .car-wrap.filter')];
    const visible = all.filter((el) => {
      const s = getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && el.getBoundingClientRect().height > 10;
    });
    const notFound = document.querySelector('.not-found');
    const notFoundVisible =
      !!notFound &&
      getComputedStyle(notFound).display !== 'none' &&
      notFound.getBoundingClientRect().height > 10;
    return {
      statusOk: true,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 80) || '',
      total: all.length,
      visible: visible.length,
      visibleKeys: visible
        .map(
          (el) =>
            `${el.getAttribute('data-make') || ''}|${el.getAttribute('data-vehicle') || ''}|${el.getAttribute('data-experience') || ''}`,
        )
        .sort(),
      notFoundVisible,
      hasForm: !!document.querySelector('#filter-form, form.filterForm1, form.s2form'),
      jq: typeof window.jQuery,
    };
  });

  page.off('response', onFail);
  page.off('console', onErr);

  return {
    path,
    status: res?.status() || 0,
    ...data,
    fails: [...fails].slice(0, 8),
    errors: errors.slice(0, 5),
  };
}

async function probeInnerForm(page, origin, path) {
  await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  return page.evaluate(() => {
    const form = document.querySelector('#filter-form, form.filterForm1, form.s2form');
    if (!form) return { hasForm: false };
    const action = form.getAttribute('action') || '';
    const method = (form.getAttribute('method') || 'get').toLowerCase();
    const fields = [...form.querySelectorAll('select, input')].map((el) => ({
      tag: el.tagName,
      name: el.name,
      id: el.id,
      type: el.type,
      options: el.tagName === 'SELECT' ? el.options.length : undefined,
    }));
    const showCars = [...form.querySelectorAll('button, a, input')].find((el) =>
      /show\s*cars|search|filter/i.test((el.textContent || el.value || '').trim()),
    );
    // category / brand deep links
    const vehicleLinks = [...document.querySelectorAll('a[href*="vehicle_type="]')].map((a) =>
      a.getAttribute('href'),
    );
    const makeLinks = [...document.querySelectorAll('a[href*="make="]')].map((a) => a.getAttribute('href'));
    const expLinks = [...document.querySelectorAll('a[href*="experience="]')].map((a) => a.getAttribute('href'));
    return {
      hasForm: true,
      action,
      method,
      fields,
      showCars: showCars
        ? { tag: showCars.tagName, text: (showCars.textContent || showCars.value || '').trim().slice(0, 40) }
        : null,
      vehicleLinks: [...new Set(vehicleLinks)].slice(0, 12),
      makeLinks: [...new Set(makeLinks)].slice(0, 12),
      expLinks: [...new Set(expLinks)].slice(0, 12),
      select2: document.querySelectorAll('.select2-container').length,
    };
  });
}

async function submitHomepageShowCars(page, origin) {
  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  // Prefer selecting SUV if select exists
  const has = await page.locator('#vehicleType, select[name="vehicle_type"], select#vehicleType').count();
  // Homepage booking may not include vehicle type — click a category link instead
  const suvLink = page.locator('a[href*="vehicle_type=SUV"]').first();
  if (await suvLink.count()) {
    await Promise.all([
      page.waitForURL(/filter-screen/, { timeout: 15000 }).catch(() => {}),
      suvLink.click(),
    ]);
    await page.waitForTimeout(2500);
    return page.evaluate(() => ({
      url: location.pathname + location.search,
      visible: [...document.querySelectorAll('.filter.car-wrap')].filter(
        (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 10,
      ).length,
      titles: [...document.querySelectorAll('.filter.car-wrap')]
        .filter((el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 10)
        .map((el) => el.getAttribute('data-vehicle')),
    }));
  }
  // fallback: Show Cars button
  const btn = page.locator('text=Show Cars').first();
  if (await btn.count()) {
    await Promise.all([
      page.waitForURL(/filter-screen/, { timeout: 15000 }).catch(() => {}),
      btn.click(),
    ]);
    await page.waitForTimeout(2500);
    return page.evaluate(() => ({
      url: location.pathname + location.search,
      visible: [...document.querySelectorAll('.filter.car-wrap')].filter(
        (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 10,
      ).length,
    }));
  }
  return { url: null, visible: 0, note: 'no SUV link / Show Cars' };
}

const browser = await chromium.launch();
const report = { filterScreen: [], mismatches: [], inner: [], interactions: {} };

const localPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const livePage = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const path of FILTER_URLS) {
  const local = await probeFilterResults(localPage, LOCAL, path);
  const live = await probeFilterResults(livePage, LIVE, path);
  const row = {
    path,
    local: {
      status: local.status,
      total: local.total,
      visible: local.visible,
      keys: local.visibleKeys,
      notFound: local.notFoundVisible,
      fails: local.fails,
    },
    live: {
      status: live.status,
      total: live.total,
      visible: live.visible,
      keys: live.visibleKeys,
      notFound: live.notFoundVisible,
      fails: live.fails,
    },
  };
  // parity: same visible set when both have cards
  const keysMatch =
    JSON.stringify(local.visibleKeys) === JSON.stringify(live.visibleKeys) &&
    local.visible === live.visible;
  const statusMatch = local.status === live.status || (local.status === 200 && live.status === 200);
  row.match = keysMatch && statusMatch && local.total === live.total;
  if (!row.match) {
    report.mismatches.push({
      path,
      reason: !statusMatch
        ? `status local=${local.status} live=${live.status}`
        : local.total !== live.total
          ? `total local=${local.total} live=${live.total}`
          : `visible local=${local.visible} [${local.visibleKeys.join('; ')}] vs live=${live.visible} [${live.visibleKeys.join('; ')}]`,
    });
  }
  report.filterScreen.push(row);
  console.log(
    `${row.match ? 'PASS' : 'FAIL'} ${path}  local=${local.visible}/${local.total} live=${live.visible}/${live.total}`,
  );
}

for (const path of INNER_PAGES) {
  const local = await probeInnerForm(localPage, LOCAL, path);
  const live = await probeInnerForm(livePage, LIVE, path);
  const actionMatch = (local.action || '').replace(/\/$/, '') === (live.action || '').replace(/\/$/, '');
  const formMatch = !!local.hasForm === !!live.hasForm;
  const linkParity =
    (local.vehicleLinks?.length || 0) === (live.vehicleLinks?.length || 0) ||
    Math.abs((local.vehicleLinks?.length || 0) - (live.vehicleLinks?.length || 0)) <= 1;
  const ok = formMatch && (local.hasForm ? actionMatch : true);
  report.inner.push({
    path,
    ok,
    local: {
      hasForm: local.hasForm,
      action: local.action,
      select2: local.select2,
      vehicleLinks: local.vehicleLinks?.length || 0,
      makeLinks: local.makeLinks?.length || 0,
      expLinks: local.expLinks?.length || 0,
      showCars: local.showCars,
    },
    live: {
      hasForm: live.hasForm,
      action: live.action,
      select2: live.select2,
      vehicleLinks: live.vehicleLinks?.length || 0,
      makeLinks: live.makeLinks?.length || 0,
      expLinks: live.expLinks?.length || 0,
      showCars: live.showCars,
    },
    linkParity,
  });
  console.log(
    `${ok ? 'PASS' : 'FAIL'} inner ${path} form=${local.hasForm}/${live.hasForm} action=${local.action} vehicleLinks=${local.vehicleLinks?.length}/${live.vehicleLinks?.length}`,
  );
}

report.interactions.localSuvClick = await submitHomepageShowCars(localPage, LOCAL);
report.interactions.liveSuvClick = await submitHomepageShowCars(livePage, LIVE);

await browser.close();

fs.mkdirSync('.tmp-qa', { recursive: true });
fs.writeFileSync('.tmp-qa/filter-parity.json', JSON.stringify(report, null, 2));

const pass = report.filterScreen.filter((r) => r.match).length;
const fail = report.filterScreen.filter((r) => !r.match).length;
const innerPass = report.inner.filter((r) => r.ok).length;
const innerFail = report.inner.filter((r) => !r.ok).length;

console.log('\n=== SUMMARY ===');
console.log(`filter-screen: ${pass} pass / ${fail} fail of ${report.filterScreen.length}`);
console.log(`inner pages: ${innerPass} pass / ${innerFail} fail of ${report.inner.length}`);
console.log('mismatches', JSON.stringify(report.mismatches, null, 2));
console.log('interactions', JSON.stringify(report.interactions, null, 2));

if (fail > 0 || innerFail > 0) process.exitCode = 1;
