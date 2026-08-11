import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE = 'http://127.0.0.1:5121';
const OUT = join(process.cwd(), '.tmp-qa', 'four-fixes');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

function ok(label, pass, detail = '') {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}${detail ? ' — ' + detail : ''}`);
}

// FAQ
await page.goto(`${BASE}/faqs/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.locator('.elementor-tab-desktop-title', { hasText: 'Booking' }).click();
await page.waitForTimeout(300);
await page.locator('#elementor-tab-content-2462 .elementor-accordion-item > .elementor-tab-title').first().click();
await page.waitForTimeout(300);
const faq = await page.evaluate(() => {
  const panel = document.querySelector('#elementor-tab-content-2462');
  return [...panel.querySelectorAll('.elementor-accordion-item')].map((item) => {
    const t = item.querySelector(':scope > .elementor-tab-title');
    const c = item.querySelector(':scope > .elementor-tab-content');
    return {
      q: t.innerText.trim().slice(0, 40),
      active: t.classList.contains('elementor-active'),
      shown: getComputedStyle(c).display !== 'none',
      h: c.clientHeight,
      sync: t.classList.contains('elementor-active') === (getComputedStyle(c).display !== 'none'),
    };
  });
});
await page.screenshot({ path: join(OUT, 'faqs-open.png') });
ok('FAQ accordion sync', faq.every((i) => i.sync) && faq.filter((i) => i.shown).length === 1, JSON.stringify(faq));

// Home long/short
await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.locator('#short_reset').click();
await page.waitForTimeout(350);
const short = await page.evaluate(() => ({
  longA: document.querySelector('#long_reset').classList.contains('active'),
  shortA: document.querySelector('#short_reset').classList.contains('active'),
  longV: document.querySelector('#long').value,
  shortV: document.querySelector('#short').value,
  opts: [...document.querySelectorAll('#rent_length option')]
    .filter((o) => o.value && o.value !== 'Select')
    .map((o) => ({ v: o.value, show: o.style.display !== 'none' && !o.hidden })),
}));
await page.locator('#long_reset').click();
await page.waitForTimeout(350);
const longg = await page.evaluate(() => ({
  longA: document.querySelector('#long_reset').classList.contains('active'),
  shortA: document.querySelector('#short_reset').classList.contains('active'),
  longV: document.querySelector('#long').value,
  shortV: document.querySelector('#short').value,
  opts: [...document.querySelectorAll('#rent_length option')]
    .filter((o) => o.value && o.value !== 'Select')
    .map((o) => ({ v: o.value, show: o.style.display !== 'none' && !o.hidden })),
}));
ok(
  'Short Term',
  short.shortA && !short.longA && short.shortV === 'short_terms' && short.opts.filter((o) => o.show).every((o) => ['by-day', 'by-month'].includes(o.v)),
  JSON.stringify(short),
);
ok(
  'Long Term',
  longg.longA && !longg.shortA && longg.longV === 'long_terms' && longg.opts.filter((o) => o.show).every((o) => ['6-months', '1-year'].includes(o.v)),
  JSON.stringify(longg),
);

// Where select2
await page.locator('.locgroup .select2-selection').first().click();
await page.waitForTimeout(200);
await page.locator('.select2-results__option', { hasText: 'Dubai' }).first().click();
await page.waitForTimeout(200);
const where = await page.evaluate(() => ({
  val: document.querySelector('select[name=filterlocation]').value,
  text: document.querySelector('.locgroup .select2-selection__rendered')?.textContent?.trim(),
  double: document.querySelectorAll('.locgroup .select2-container').length,
  w: Math.round(document.querySelector('.locgroup .select2-container').getBoundingClientRect().width),
}));
ok('Where Select2', where.val === 'Dubai' && where.double === 1 && where.w > 100, JSON.stringify(where));
await page.screenshot({ path: join(OUT, 'home-filter.png') });

// Filter-screen bottom filters
await page.goto(`${BASE}/filter-screen/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);
const layout = await page.evaluate(() => {
  const whereEl = document.querySelector('.locgroup .select2-container');
  const r = whereEl?.getBoundingClientRect();
  return {
    whereText: document.querySelector('.locgroup .select2-selection__rendered')?.textContent?.trim(),
    whereW: r ? Math.round(r.width) : 0,
    whereH: r ? Math.round(r.height) : 0,
    s2Count: document.querySelectorAll('.select2-container').length,
    btnDisplay: getComputedStyle(document.querySelector('.btn-form')).display,
  };
});
ok('Filter-screen Where layout', layout.whereText === 'Locations' && layout.whereW > 100 && layout.s2Count === 1, JSON.stringify(layout));

async function visibleCars() {
  return page.evaluate(() =>
    [...document.querySelectorAll('.car-wrap.filter')]
      .filter((el) => getComputedStyle(el).display !== 'none')
      .map((el) => `${el.getAttribute('data-make')}/${el.getAttribute('data-vehicle')}`),
  );
}

const base = await visibleCars();
await page.selectOption('#vehicleType', { label: 'SUV' });
await page.evaluate(() => {
  const s = document.querySelector('#vehicleType');
  if (window.jQuery) window.jQuery(s).trigger('change');
  else s.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(900);
const afterSuv = await visibleCars();
ok(
  'Vehicle type SUV filter',
  afterSuv.length > 0 && afterSuv.every((x) => x.endsWith('/SUV')),
  `${base.length} -> ${afterSuv.length}: ${afterSuv.join(', ')}`,
);

await page.goto(`${BASE}/filter-screen/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.selectOption('#make', 'Toyota');
await page.evaluate(() => {
  const s = document.querySelector('#make');
  if (window.jQuery) window.jQuery(s).trigger('change');
  else s.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(900);
const brands = await visibleCars();
ok('Brand Toyota filter', brands.length > 0 && brands.every((x) => x.startsWith('Toyota/')), brands.join(', '));

await page.selectOption('#experience', 'Deluxe');
await page.evaluate(() => {
  const s = document.querySelector('#experience');
  if (window.jQuery) window.jQuery(s).trigger('change');
  else s.dispatchEvent(new Event('change', { bubbles: true }));
});
await page.waitForTimeout(900);
const deluxe = await visibleCars();
ok('Experience Deluxe filter', deluxe.length > 0 && deluxe.length <= brands.length, deluxe.join(', '));

await page.screenshot({ path: join(OUT, 'filter-screen.png') });

// Blog load more skin
await page.goto(`${BASE}/blog/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);
const before = await page.locator('.ecs-posts.elementor-posts-container article').count();
await page.locator('[data-cs-blog-load-more] a, .ecs-load-more-button a').first().click();
await page.waitForTimeout(1500);
const blog = await page.evaluate(() => {
  const arts = [...document.querySelectorAll('.ecs-posts.elementor-posts-container article')];
  const last = arts.slice(-3);
  return {
    total: arts.length,
    last: last.map((a) => ({
      tpl: a.querySelector('[data-elementor-id]')?.getAttribute('data-elementor-id'),
      img: !!a.querySelector('img'),
      readMore: /read more/i.test(a.textContent || ''),
      excerpt: !!a.querySelector('.elementor-widget-theme-post-excerpt'),
    })),
  };
});
ok('Blog load more +1595 skin', blog.total > before && blog.last.every((c) => c.tpl === '1595' && c.img && c.readMore && c.excerpt), JSON.stringify({ before, ...blog }));
await page.evaluate(() =>
  document.querySelector('.ecs-posts.elementor-posts-container article:last-of-type')?.scrollIntoView({ block: 'center' }),
);
await page.waitForTimeout(300);
await page.screenshot({ path: join(OUT, 'blog-load-more.png') });

await browser.close();
console.log('shots in', OUT);
