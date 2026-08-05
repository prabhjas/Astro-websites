/**
 * Focused QA: homepage sliders + form vs live, then page status/chunk errors.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa');
mkdirSync(OUT, { recursive: true });
const LOCAL = 'http://127.0.0.1:5085';
const LIVE = 'https://kinzahr.com';

async function homeProbe(page, origin, label) {
  const failed = [];
  const errors = [];
  page.removeAllListeners('requestfailed');
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/google|facebook|hotjar|doubleclick|mouseflow|analytics|fonts\.googleapis/i.test(u)) return;
    failed.push(u.replace(origin, ''));
  });
  page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 180)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text().slice(0, 180));
  });

  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(4500);

  const state = await page.evaluate(() => {
    const swipers = [...document.querySelectorAll('.swiper')].map((el) => ({
      initialized: el.classList.contains('swiper-initialized'),
      slides: el.querySelectorAll('.swiper-slide').length,
      parent:
        el.closest('.elementor-widget')?.getAttribute('data-widget_type') ||
        el.closest('[class*="slider"], [class*="carousel"]')?.className?.slice(0, 80) ||
        '',
    }));
    const form = document.querySelector('.n-footer') || document.querySelector('form.wpcf7-form');
    const name = document.querySelector('.n-footer input[name="f-name"], form.wpcf7-form input[name="f-name"]');
    const submit = document.querySelector('.n-footer .wpcf7-submit, form.wpcf7-form .wpcf7-submit');
    const phone = document.querySelector('.n-footer input[name="your-phone"], .intl-tel-input input');
    const ns = name ? getComputedStyle(name) : null;
    const ss = submit ? getComputedStyle(submit) : null;
    return {
      swipers,
      initializedCount: swipers.filter((s) => s.initialized).length,
      totalSwipers: swipers.length,
      kzform: !!document.querySelector('.kzform'),
      iti: document.querySelectorAll('.intl-tel-input, .iti').length,
      name: ns && {
        height: ns.height,
        radius: ns.borderRadius,
        border: ns.border,
        font: ns.fontFamily,
        padding: ns.padding,
      },
      submit: ss && {
        height: ss.height,
        radius: ss.borderRadius,
        background: ss.backgroundImage || ss.backgroundColor,
        font: ss.fontFamily,
        fontWeight: ss.fontWeight,
      },
      phoneWrapped: !!(phone && phone.closest('.intl-tel-input, .iti')),
    };
  });

  // Try advancing first initialized image/n carousel
  let moved = false;
  const next = page.locator('.elementor-swiper-button-next, .swiper-button-next').first();
  if ((await next.count()) > 0) {
    const before = await page.evaluate(() => {
      const s = document.querySelector('.swiper-initialized');
      return s?.swiper?.activeIndex ?? -1;
    });
    await next.click({ force: true }).catch(() => {});
    await page.waitForTimeout(700);
    const after = await page.evaluate(() => {
      const s = document.querySelector('.swiper-initialized');
      return s?.swiper?.activeIndex ?? -1;
    });
    moved = before !== -1 && after !== -1 && before !== after;
  }

  await page.screenshot({ path: join(OUT, `${label}-home-viewport.png`), fullPage: false });
  await page.evaluate(() => document.querySelector('.n-footer, form.wpcf7-form')?.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${label}-form.png`), fullPage: false });

  return {
    label,
    state,
    moved,
    failedChunks: [...new Set(failed)].filter((u) => /\.bundle\.min\.js|ChunkLoadError/i.test(u)).slice(0, 20),
    errors: [...new Set(errors)].filter((e) => /ChunkLoadError|Loading chunk/i.test(e)).slice(0, 15),
    otherFails: [...new Set(failed)].filter((u) => !/\.bundle\.min\.js/i.test(u)).slice(0, 15),
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const live = await homeProbe(page, LIVE, 'live');
const local = await homeProbe(page, LOCAL, 'local');

const inv = JSON.parse(readFileSync(join(ROOT, 'src/data/sitemap-inventory.json'), 'utf8'));
const paths = [];
for (const p of inv.pages || []) {
  const raw = typeof p === 'string' ? p : p.path || p.url || p.slug;
  if (!raw) continue;
  try {
    paths.push(String(raw).startsWith('http') ? new URL(raw).pathname : raw.startsWith('/') ? raw : `/${raw}/`);
  } catch {
    /* ignore */
  }
}
const uniq = [...new Set(paths.map((p) => (p.endsWith('/') ? p : p + '/')))];

const pages = [];
for (const path of uniq) {
  const fails = [];
  const errs = [];
  page.removeAllListeners('requestfailed');
  page.removeAllListeners('pageerror');
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/google|facebook|hotjar|doubleclick|mouseflow|analytics/i.test(u)) return;
    if (u.includes('127.0.0.1') && /\.bundle\.min\.js/.test(u)) fails.push(u.replace(LOCAL, ''));
  });
  page.on('pageerror', (e) => {
    const m = String(e.message || e);
    if (/ChunkLoadError|Loading chunk/i.test(m)) errs.push(m.slice(0, 160));
  });
  const res = await page.goto(LOCAL + path, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => null);
  await page.waitForTimeout(1500);
  pages.push({
    path,
    status: res?.status() || 0,
    chunkFails: [...new Set(fails)].slice(0, 8),
    chunkErrors: [...new Set(errs)].slice(0, 5),
  });
  const ok = (res?.status() || 0) === 200 && fails.length === 0 && errs.length === 0;
  console.log(`${ok ? 'OK' : 'ISSUE'} ${res?.status() || 0} ${path} chunks=${fails.length}`);
}

await browser.close();
const report = {
  live,
  local,
  pagesSummary: {
    total: pages.length,
    ok: pages.filter((p) => p.status === 200 && !p.chunkFails.length && !p.chunkErrors.length).length,
    withChunkIssues: pages.filter((p) => p.chunkFails.length || p.chunkErrors.length).length,
    not200: pages.filter((p) => p.status !== 200),
  },
  worstPages: pages
    .filter((p) => p.chunkFails.length || p.chunkErrors.length)
    .sort((a, b) => b.chunkFails.length - a.chunkFails.length)
    .slice(0, 15),
};
writeFileSync(join(OUT, 'slider-form-qa.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ live: live.state, local: local.state, moved: { live: live.moved, local: local.moved }, pagesSummary: report.pagesSummary }, null, 2));
