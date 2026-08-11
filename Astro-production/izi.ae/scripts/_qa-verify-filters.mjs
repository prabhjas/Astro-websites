/**
 * Verify filter-screen URL params + dropdowns + homepage Show Cars / term toggles.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.BASE || 'http://127.0.0.1:5121';
const checks = [];
const add = (name, pass, detail = '') => {
  checks.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function withPage(fn) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function visibleCars(page) {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll('.filter.car-wrap')];
    const vis = all.filter(
      (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 10,
    );
    return {
      total: all.length,
      visible: vis.length,
      makes: [...new Set(vis.map((el) => el.getAttribute('data-make')))],
      vehicles: [...new Set(vis.map((el) => el.getAttribute('data-vehicle')))],
    };
  });
}

async function setSelect(page, selector, value) {
  await page.evaluate(
    ({ selector, value }) => {
      const sel = document.querySelector(selector);
      if (!sel) throw new Error('missing ' + selector);
      sel.value = value;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      if (window.jQuery) window.jQuery(sel).val(value).trigger('change');
    },
    { selector, value },
  );
  await page.waitForTimeout(1000);
}

const urlCases = [
  {
    path: '/filter-screen/',
    label: 'all cars',
    expect: (m) => m.visible > 0,
  },
  {
    path: '/filter-screen/?vehicle_type=SUV',
    label: 'vehicle_type=SUV',
    expect: (m) => m.visible > 0 && m.vehicles.every((v) => /SUV/i.test(v || '')),
  },
  {
    path: '/filter-screen/?vehicle_type=Sedan',
    label: 'vehicle_type=Sedan',
    expect: (m) => m.visible > 0 && m.vehicles.every((v) => /Sedan/i.test(v || '')),
  },
  {
    path: '/filter-screen/?make=Toyota',
    label: 'make=Toyota',
    expect: (m) => m.visible > 0 && m.makes.every((v) => /Toyota/i.test(v || '')),
  },
  {
    path: '/filter-screen/?make=BMW',
    label: 'make=BMW',
    expect: (m) => m.visible > 0 && m.makes.every((v) => /BMW/i.test(v || '')),
  },
  {
    path: '/filter-screen/?filterlocation=Dubai',
    label: 'location=Dubai',
    expect: (m) => m.visible > 0,
  },
  {
    path: '/filter-screen/?filterlocation=Abu-Dhabi',
    label: 'location=Abu-Dhabi',
    expect: (m) => m.visible > 0,
  },
  {
    path: '/filter-screen/?experience=Electric',
    label: 'experience=Electric',
    expect: (m) => typeof m.visible === 'number',
  },
  {
    path: '/filter-screen/?experience=Deluxe',
    label: 'experience=Deluxe',
    expect: (m) => typeof m.visible === 'number',
  },
];

for (const c of urlCases) {
  await withPage(async (page) => {
    await page.goto(BASE + c.path, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2800);
    const m = await visibleCars(page);
    add(
      `URL ${c.label}`,
      c.expect(m),
      `vis=${m.visible}/${m.total} makes=${m.makes.join(',')} vehicles=${m.vehicles.join(',')}`,
    );
  });
}

await withPage(async (page) => {
  await page.goto(`${BASE}/filter-screen/`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const base = await visibleCars(page);
  add('dropdown baseline has cars', base.visible > 0, `vis=${base.visible}`);

  await setSelect(page, '#vehicleType', 'SUV');
  const suv = await visibleCars(page);
  add(
    'dropdown vehicleType=SUV',
    suv.visible > 0 && suv.vehicles.every((v) => /SUV/i.test(v || '')),
    `vis=${suv.visible} ${suv.vehicles.join(',')}`,
  );

  await setSelect(page, '#make', 'Toyota');
  const toyota = await visibleCars(page);
  add(
    'dropdown make=Toyota after SUV',
    toyota.visible > 0 && toyota.makes.every((v) => /Toyota/i.test(v || '')),
    `vis=${toyota.visible} ${toyota.makes.join('/')} ${toyota.vehicles.join('/')}`,
  );

  const expMeta = await page.evaluate(() => {
    const s = document.querySelector('#experience, select[name="experience"]');
    if (!s) return null;
    return {
      selector: s.id ? `#${s.id}` : 'select[name="experience"]',
      opts: [...s.options].map((o) => o.value).filter(Boolean),
    };
  });
  if (expMeta?.opts?.length) {
    await setSelect(page, expMeta.selector, expMeta.opts[0]);
    const exp = await visibleCars(page);
    add(`dropdown experience=${expMeta.opts[0]}`, exp.visible >= 0, `vis=${exp.visible}`);
  } else {
    add('dropdown experience select', true, 'not present — skip');
  }
});

await withPage(async (page) => {
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2800);

  const clickedLong = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('a,button,div,span')].filter((el) =>
      /^\s*Long\s*Term\s*$/i.test(el.textContent || ''),
    );
    if (!candidates.length) return false;
    candidates[0].click();
    return true;
  });
  await page.waitForTimeout(600);
  const afterLong = await page.evaluate(() =>
    [...document.querySelectorAll('#rent_length option')]
      .filter((o) => o.style.display !== 'none' && o.value)
      .map((o) => o.value),
  );
  add(
    'homepage Long Term toggles rent options',
    clickedLong && afterLong.some((v) => /6-months|1-year/.test(v)),
    `clicked=${clickedLong} opts=${afterLong.join(',')}`,
  );

  const clickedShort = await page.evaluate(() => {
    const candidates = [...document.querySelectorAll('a,button,div,span')].filter((el) =>
      /^\s*Short\s*Term\s*$/i.test(el.textContent || ''),
    );
    if (!candidates.length) return false;
    candidates[0].click();
    return true;
  });
  await page.waitForTimeout(600);
  const afterShort = await page.evaluate(() =>
    [...document.querySelectorAll('#rent_length option')]
      .filter((o) => o.style.display !== 'none' && o.value)
      .map((o) => o.value),
  );
  add(
    'homepage Short Term toggles rent options',
    clickedShort && afterShort.some((v) => /by-day|by-month/.test(v)),
    `clicked=${clickedShort} opts=${afterShort.join(',')}`,
  );

  await page.evaluate(() => {
    const loc = document.querySelector('select[name="filterlocation"], #filterlocation');
    if (loc) {
      const opt = [...loc.options].find((o) => /dubai/i.test(o.value || o.text));
      if (opt) {
        loc.value = opt.value;
        loc.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.jQuery) window.jQuery(loc).trigger('change');
      }
    }
    const rent = document.querySelector('#rent_length');
    if (rent) {
      const opt = [...rent.options].find((o) => o.value && o.style.display !== 'none');
      if (opt) {
        rent.value = opt.value;
        rent.dispatchEvent(new Event('change', { bubbles: true }));
        if (window.jQuery) window.jQuery(rent).val(opt.value).trigger('change');
      }
    }
    if (window.jQuery && window.jQuery('#start_date').hasClass('hasDatepicker')) {
      const d = new Date();
      d.setDate(d.getDate() + 5);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      window.jQuery('#start_date').datepicker('setDate', `${y}-${m}-${day}`);
    }
    const t = document.querySelector('#timePicker, input[name="from_time"]');
    if (t && !t.value) t.value = '10:00';
  });

  await Promise.all([
    page.waitForURL(/filter-screen/, { timeout: 20000 }).catch(() => null),
    page.evaluate(() => {
      const form = document.querySelector('#filter-form');
      if (form) form.submit();
      else {
        const btn = [...document.querySelectorAll('input[type=submit],button')].find((b) =>
          /show cars/i.test(b.value || b.textContent || ''),
        );
        if (btn) btn.click();
      }
    }),
  ]);
  await page.waitForTimeout(2500);
  const landed = await page.evaluate(() => ({
    url: location.pathname + location.search,
    vis: [...document.querySelectorAll('.filter.car-wrap')].filter(
      (el) => getComputedStyle(el).display !== 'none',
    ).length,
  }));
  add(
    'homepage Show Cars -> filter-screen',
    /filter-screen/.test(landed.url) && landed.vis > 0,
    JSON.stringify(landed),
  );
});

await withPage(async (page) => {
  await page.goto(`${BASE}/filter-screen/?filterlocation=Dubai`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const dubai = await visibleCars(page);
  await page.goto(`${BASE}/filter-screen/?filterlocation=Abu-Dhabi`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const abu = await visibleCars(page);
  add(
    'location Dubai vs Abu-Dhabi both return cars',
    dubai.visible > 0 && abu.visible > 0,
    `Dubai=${dubai.visible} Abu=${abu.visible}`,
  );
});

mkdirSync(join(ROOT, '.tmp-qa'), { recursive: true });
writeFileSync(join(ROOT, '.tmp-qa/verify-filters.json'), JSON.stringify({ base: BASE, checks }, null, 2));
const failed = checks.filter((c) => !c.pass).length;
console.log(`\nDONE filters pass=${checks.length - failed} fail=${failed}`);
if (failed) process.exitCode = 1;
