#!/usr/bin/env node
/**
 * Deep interactive parity: console errors, form fields, menus, sliders.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa');
mkdirSync(OUT, { recursive: true });

const LIVE = 'https://izi.ae';
const LOCAL = 'http://127.0.0.1:5121';

async function probe(base, path, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  const failed = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 200));
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err.message).slice(0, 200)));
  page.on('response', (res) => {
    if (res.status() >= 400 && /\.(css|js|png|jpe?g|webp|svg|woff2?)(\?|$)/i.test(res.url())) {
      failed.push(`${res.status()} ${res.url().replace(base, '').slice(0, 140)}`);
    }
  });

  await page.goto(`${base}${path}${base.includes('izi.ae') && !base.includes('127') ? '?nowprocket=1' : ''}`, {
    waitUntil: 'networkidle',
    timeout: 90000,
  }).catch(() => page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 }));

  await page.waitForTimeout(2000);

  const data = await page.evaluate(async () => {
    const menu = document.querySelector('.elementor-nav-menu, nav');
    const burger = document.querySelector('.elementor-menu-toggle, .menu-toggle, button[aria-label*="Menu" i]');
    const select2 = document.querySelectorAll('.select2-container').length;
    const owl = document.querySelectorAll('.owl-carousel, .owl-loaded').length;
    const slick = document.querySelectorAll('.slick-initialized, .slick-slider').length;
    const cf7 = document.querySelectorAll('.wpcf7-form, form.wpcf7-form').length;
    const datepickers = document.querySelectorAll('.xdsoft_datetimepicker, input.hasDatepicker, .flatpickr-input, input[type="date"]').length;
    const longTerm = [...document.querySelectorAll('a,button,div,span,li')].find((el) =>
      /long\s*term/i.test(el.textContent || '') && el.getBoundingClientRect().height > 10,
    );
    const shortTerm = [...document.querySelectorAll('a,button,div,span,li')].find((el) =>
      /short\s*term/i.test(el.textContent || '') && el.getBoundingClientRect().height > 10,
    );
    const showCars = [...document.querySelectorAll('a,button,input')].find((el) =>
      /show\s*cars/i.test(el.value || el.textContent || ''),
    );

    // brand logos visible in strip
    const brandImgs = [...document.querySelectorAll('img')].filter((img) => {
      const s = (img.getAttribute('src') || '') + (img.getAttribute('data-src') || '') + (img.alt || '');
      return /logo|bmw|toyota|audi|nissan|hyundai|mercedes|tesla|ford/i.test(s);
    }).length;

    return {
      title: document.title,
      select2,
      owl,
      slick,
      cf7,
      datepickers,
      hasMenu: !!menu,
      hasBurger: !!burger,
      longTerm: !!longTerm,
      shortTerm: !!shortTerm,
      showCars: !!showCars,
      brandImgs,
      bodyScrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });

  // Try opening mobile menu at 375
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const mobile = await page.evaluate(async () => {
    const toggle = document.querySelector(
      '.elementor-menu-toggle, .menu-toggle, button.elementor-menu-toggle',
    );
    if (!toggle) return { toggle: false, opened: false };
    toggle.click();
    await new Promise((r) => setTimeout(r, 400));
    const open =
      document.querySelector('.elementor-menu-toggle.elementor-active, .elementor-nav-menu--dropdown.elementor-nav-menu__container') ||
      document.body.classList.contains('elementor-menu-open');
    const links = document.querySelectorAll('.elementor-nav-menu--dropdown a, .elementor-nav-menu a').length;
    return { toggle: true, opened: !!open, links };
  });

  await browser.close();
  return { label, path, data, mobile, consoleErrors: consoleErrors.slice(0, 20), failed: [...new Set(failed)].slice(0, 25) };
}

const pages = ['/', '/contact-us/', '/vehicles/', '/car/toyota-yaris-2024/'];
const rows = [];
for (const path of pages) {
  console.log('probe local', path);
  rows.push(await probe(LOCAL, path, 'local'));
  console.log('probe live', path);
  rows.push(await probe(LIVE, path, 'live'));
}

writeFileSync(join(OUT, 'parity-interactive.json'), JSON.stringify(rows, null, 2));
for (const r of rows) {
  console.log(
    `\n${r.label} ${r.path} select2=${r.data.select2} owl=${r.data.owl} slick=${r.data.slick} cf7=${r.data.cf7} showCars=${r.data.showCars} overflow=${r.data.bodyScrollWidth > r.data.clientWidth + 2} consoleErr=${r.consoleErrors.length} failedAssets=${r.failed.length}`,
  );
  if (r.failed.length) r.failed.slice(0, 8).forEach((f) => console.log('  FAIL', f));
  if (r.consoleErrors.length) r.consoleErrors.slice(0, 5).forEach((e) => console.log('  ERR', e));
  console.log('  mobile', r.mobile);
}
console.log('\nWrote .tmp-qa/parity-interactive.json');
