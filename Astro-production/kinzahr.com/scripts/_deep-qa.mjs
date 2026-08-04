/**
 * Deep QA: homepage slider/form + every inventory page.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa');
mkdirSync(OUT, { recursive: true });

const LOCAL = 'http://127.0.0.1:5085';
const LIVE = 'https://kinzahr.com';

function inventoryPaths() {
  const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
  const pages = (inv.pages || []).map((p) => {
    if (typeof p === 'string') return p;
    return p.path || p.url || p.slug;
  });
  // normalize to pathnames
  const paths = [];
  for (const raw of pages) {
    if (!raw) continue;
    try {
      if (String(raw).startsWith('http')) paths.push(new URL(raw).pathname);
      else if (String(raw).startsWith('/')) paths.push(raw.endsWith('/') ? raw : raw + '/');
      else paths.push(`/${raw}/`);
    } catch {
      /* skip */
    }
  }
  if (!paths.includes('/')) paths.unshift('/');
  return [...new Set(paths)];
}

async function probeHome(page, origin, label) {
  const failed = [];
  const errors = [];
  page.removeAllListeners('requestfailed');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/google|facebook|hotjar|doubleclick|mouseflow|analytics|googletagmanager/i.test(u)) return;
    failed.push(u.replace(origin, ''));
  });
  page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 200));
  });

  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);

  const state = await page.evaluate(() => {
    const owl = document.querySelectorAll('.owl-carousel, .owl-loaded, .slider-sec .owl-carousel');
    const owlItems = document.querySelectorAll('.owl-item');
    const swiper = document.querySelectorAll('.swiper, .swiper-initialized');
    const form = document.querySelector('form.wpcf7-form, form.elementor-form, .wpcf7 form, .elementor-widget-form form');
    const formBox = form?.getBoundingClientRect();
    const inputs = form ? [...form.querySelectorAll('input, textarea, select')].slice(0, 8) : [];
    return {
      owlCount: owl.length,
      owlLoaded: !!document.querySelector('.owl-loaded'),
      owlItemCount: owlItems.length,
      owlActiveWidth: document.querySelector('.owl-item.active')?.getBoundingClientRect().width || 0,
      swiperCount: swiper.length,
      hasJQuery: typeof window.jQuery !== 'undefined',
      hasOwlFn: !!(window.jQuery && jQuery.fn && jQuery.fn.owlCarousel),
      formFound: !!form,
      formClass: form?.className?.slice(0, 120) || null,
      formWidth: formBox?.width || 0,
      formHeight: formBox?.height || 0,
      inputStyles: inputs.map((el) => {
        const s = getComputedStyle(el);
        return {
          tag: el.tagName,
          type: el.getAttribute('type') || '',
          name: el.getAttribute('name') || el.id || '',
          height: s.height,
          padding: s.padding,
          borderRadius: s.borderRadius,
          border: s.border,
          background: s.backgroundColor,
          fontSize: s.fontSize,
          width: s.width,
        };
      }),
      itiCount: document.querySelectorAll('.iti, .intl-tel-input').length,
    };
  });

  await page.screenshot({ path: join(OUT, `${label}-home-form.png`), fullPage: false });
  // scroll to form
  await page.evaluate(() => {
    const f = document.querySelector('form.wpcf7-form, form.elementor-form, .wpcf7, .elementor-widget-form');
    f?.scrollIntoView({ block: 'center' });
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${label}-form-closeup.png`), fullPage: false });

  // try slider next
  const next = page.locator('.owl-next, .elementor-swiper-button-next, .swiper-button-next').first();
  let sliderMoved = null;
  if ((await next.count()) > 0) {
    const before = await page.evaluate(
      () => document.querySelector('.owl-item.active, .swiper-slide-active')?.textContent?.slice(0, 40) || '',
    );
    await next.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
    const after = await page.evaluate(
      () => document.querySelector('.owl-item.active, .swiper-slide-active')?.textContent?.slice(0, 40) || '',
    );
    sliderMoved = before !== after;
  }

  return {
    label,
    state,
    sliderMoved,
    failed: [...new Set(failed)].slice(0, 40),
    errors: [...new Set(errors)].slice(0, 25),
  };
}

async function probePage(page, path) {
  const failed = [];
  const errors = [];
  page.removeAllListeners('requestfailed');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/google|facebook|hotjar|doubleclick|mouseflow|analytics|googletagmanager/i.test(u)) return;
    if (!u.includes('127.0.0.1')) return;
    failed.push(u.replace(LOCAL, ''));
  });
  page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 160)));

  let status = 0;
  try {
    const res = await page.goto(LOCAL + path, { waitUntil: 'domcontentloaded', timeout: 45000 });
    status = res?.status() || 0;
    await page.waitForTimeout(800);
  } catch (e) {
    return { path, status: 0, error: String(e.message || e).slice(0, 160), failed: [], errors: [] };
  }
  const title = await page.title();
  return {
    path,
    status,
    title,
    failed: [...new Set(failed)].slice(0, 15),
    errors: [...new Set(errors)].slice(0, 10),
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const liveHome = await probeHome(page, LIVE, 'live');
const localHome = await probeHome(page, LOCAL, 'local');

const paths = inventoryPaths();
console.log('inventory paths', paths.length);
const pageResults = [];
for (const path of paths) {
  const r = await probePage(page, path);
  pageResults.push(r);
  const mark = r.status === 200 && r.failed.length === 0 && r.errors.length === 0 ? 'OK' : 'ISSUE';
  console.log(`${mark} ${r.status} ${path} fails=${r.failed.length} errs=${r.errors.length}`);
}

await browser.close();

const report = {
  generatedAt: new Date().toISOString(),
  liveHome,
  localHome,
  pages: pageResults,
  summary: {
    total: pageResults.length,
    ok200: pageResults.filter((p) => p.status === 200).length,
    not200: pageResults.filter((p) => p.status !== 200).map((p) => ({ path: p.path, status: p.status })),
    withFails: pageResults.filter((p) => p.failed.length).length,
    withErrors: pageResults.filter((p) => p.errors.length).length,
  },
};
writeFileSync(join(OUT, 'deep-qa.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report.summary, null, 2));
console.log(
  'slider local',
  localHome.state,
  'moved',
  localHome.sliderMoved,
  'live moved',
  liveHome.sliderMoved,
);
