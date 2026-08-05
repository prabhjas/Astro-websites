#!/usr/bin/env node
/**
 * kpmpro.ae Playwright parity QA — local vs live, multi-viewport.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const LOCAL = process.env.QA_LOCAL || 'http://127.0.0.1:5098';
const LIVE = process.env.QA_LIVE || 'https://kpmpro.ae';
const OUT = path.resolve('_crawl/ui-qa');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  '/',
  '/about-us/',
  '/contact-us/',
  '/blog/',
  '/work-residency-visa/',
  '/uae-golden-visa/',
  '/ded-services/',
  '/trade-license-renewal/',
  '/legal-translation/',
  '/uae-government-entity-approvals/',
];

const VIEWPORTS = [
  { name: 'desktop-1920', width: 1920, height: 1080 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'laptop-1366', width: 1366, height: 768 },
  { name: 'tablet-1024', width: 1024, height: 768 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-320', width: 320, height: 568 },
];

const report = { pages: [], interactions: {}, viewports: [], fails: [], generatedAt: new Date().toISOString() };

async function settle(page) {
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('mousemove'));
  });
  await page.waitForTimeout(1500);
}

async function metrics(page) {
  return page.evaluate(() => {
    const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
    const h1 = document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || '';
    const header = !!document.querySelector('[data-elementor-type="header"], header');
    const footer = !!document.querySelector('[data-elementor-type="footer"], footer');
    const forms = document.querySelectorAll('form').length;
    const faqs = document.querySelectorAll('.elementor-accordion, .elementor-toggle').length;
    const carousels = document.querySelectorAll('.swiper, .slick-slider, .elementor-swiper').length;
    const menuLinks = document.querySelectorAll('.elementor-nav-menu a').length;
    const brokenImgs = [...document.querySelectorAll('img')].filter((img) => !img.naturalWidth && img.src && !img.src.startsWith('data:')).length;
    const consoleNote = window.__qaConsoleErrors || [];
    return {
      overflow,
      h1,
      header,
      footer,
      forms,
      faqs,
      carousels,
      menuLinks,
      brokenImgs,
      title: document.title,
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
      consoleNote,
    };
  });
}

const browser = await chromium.launch({ headless: true });

// Capture console errors helper
async function newPage(viewport) {
  const context = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__qaConsoleErrors = [];
    window.addEventListener('error', (e) => {
      window.__qaConsoleErrors.push(String(e.message || e));
    });
  });
  return { context, page };
}

// --- Page-by-page structural compare at 1440 ---
{
  const { context, page } = await newPage({ width: 1440, height: 900 });
  for (const p of PAGES) {
    const row = { path: p, fails: [] };
    try {
      await page.goto(LIVE + p + (p.includes('?') ? '' : ''), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(page);
      const live = await metrics(page);
      await page.screenshot({ path: path.join(OUT, `live${p.replace(/\//g, '_') || '_home'}-1440.png`), fullPage: false });

      await page.goto(LOCAL + p, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(page);
      const local = await metrics(page);
      await page.screenshot({ path: path.join(OUT, `local${p.replace(/\//g, '_') || '_home'}-1440.png`), fullPage: false });

      row.live = live;
      row.local = local;
      if (local.h1 !== live.h1) row.fails.push('h1_mismatch');
      if (!local.header) row.fails.push('no_header');
      if (!local.footer) row.fails.push('no_footer');
      if (local.forms < live.forms) row.fails.push(`forms_${local.forms}<${live.forms}`);
      if (local.menuLinks < live.menuLinks * 0.5) row.fails.push('menu_thin');
      if (local.overflow) row.fails.push('overflow_1440');
      if (local.brokenImgs > 3) row.fails.push(`broken_imgs_${local.brokenImgs}`);
    } catch (e) {
      row.fails.push('error_' + e.message.slice(0, 80));
    }
    report.pages.push(row);
    if (row.fails.length) report.fails.push(`${p}: ${row.fails.join(', ')}`);
    process.stdout.write(`page ${p} fails=${row.fails.length}\n`);
  }
  await context.close();
}

// --- Responsive overflow checks on homepage + contact ---
for (const vp of VIEWPORTS) {
  const { context, page } = await newPage(vp);
  const entry = { viewport: vp.name, checks: [] };
  for (const p of ['/', '/contact-us/', '/blog/']) {
    try {
      await page.goto(LOCAL + p, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await settle(page);
      const m = await metrics(page);
      const fail = m.overflow ? 'overflow' : null;
      entry.checks.push({ path: p, overflow: m.overflow, scrollW: m.scrollW, clientW: m.clientW, fail });
      if (fail) report.fails.push(`${vp.name}${p}: overflow`);
      if (vp.name === 'mobile-390' || vp.name === 'desktop-1920') {
        await page.screenshot({
          path: path.join(OUT, `${vp.name}${p.replace(/\//g, '_') || '_home'}.png`),
          fullPage: false,
        });
      }
    } catch (e) {
      entry.checks.push({ path: p, fail: e.message.slice(0, 80) });
      report.fails.push(`${vp.name}${p}: ${e.message.slice(0, 60)}`);
    }
  }
  report.viewports.push(entry);
  await context.close();
  console.log('viewport', vp.name, 'done');
}

// --- Interactions: mobile menu, FAQ accordion, form fields ---
{
  const { context, page } = await newPage({ width: 390, height: 844 });
  await page.goto(LOCAL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);

  // Mobile nav toggle
  const toggles = [
    '.elementor-menu-toggle',
    '.ast-mobile-menu-trigger-minimal',
    '.menu-toggle',
    'button[aria-label*="Menu" i]',
    '.elementor-clickable',
  ];
  let menuOpened = false;
  for (const sel of toggles) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      await loc.click({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      menuOpened = await page.evaluate(() => {
        const nav = document.querySelector('.elementor-nav-menu--dropdown, .elementor-nav-menu__container, .ast-mobile-popup-drawer, .main-header-menu');
        if (!nav) return !!document.querySelector('.elementor-menu-toggle.elementor-active, .elementor-menu-toggle[aria-expanded="true"]');
        const st = getComputedStyle(nav);
        return st.visibility !== 'hidden' && st.display !== 'none' && nav.getBoundingClientRect().height > 20;
      });
      if (menuOpened) {
        report.interactions.mobileMenu = { selector: sel, opened: true };
        break;
      }
    }
  }
  if (!menuOpened) {
    report.interactions.mobileMenu = { opened: false };
    report.fails.push('mobile_menu_not_opening');
  }
  await context.close();
}

{
  const { context, page } = await newPage({ width: 1440, height: 900 });
  await page.goto(LOCAL + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);

  // FAQ accordion
  const faqTitle = page.locator('.elementor-accordion .elementor-tab-title, .elementor-toggle .elementor-tab-title').first();
  if ((await faqTitle.count()) > 0) {
    await faqTitle.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => {
      const c = document.querySelector('.elementor-accordion .elementor-tab-content, .elementor-toggle .elementor-tab-content');
      return c ? getComputedStyle(c).display : null;
    });
    await faqTitle.click({ force: true });
    await page.waitForTimeout(500);
    const after = await page.evaluate(() => {
      const active = document.querySelector('.elementor-accordion .elementor-tab-title.elementor-active, .elementor-toggle .elementor-tab-title.elementor-active');
      const c = document.querySelector('.elementor-accordion .elementor-tab-content.elementor-active, .elementor-toggle .elementor-tab-content.elementor-active');
      return {
        active: !!active,
        display: c ? getComputedStyle(c).display : null,
        height: c ? c.getBoundingClientRect().height : 0,
      };
    });
    report.interactions.faq = { before, after };
    if (!after.active && !(after.height > 10)) report.fails.push('faq_accordion');
  } else {
    report.interactions.faq = { present: false };
  }

  // Desktop dropdown hover
  const parent = page.locator('.elementor-nav-menu > li.menu-item-has-children, .elementor-nav-menu > .elementor-item-has-submenu').first();
  if ((await parent.count()) > 0) {
    await parent.hover();
    await page.waitForTimeout(400);
    report.interactions.dropdown = await page.evaluate(() => {
      const sub = document.querySelector('.elementor-nav-menu .sub-menu, .elementor-nav-menu--dropdown');
      if (!sub) return { visible: false };
      const r = sub.getBoundingClientRect();
      const st = getComputedStyle(sub);
      return { visible: r.height > 10 && st.visibility !== 'hidden' && st.opacity !== '0', h: r.height };
    });
    if (!report.interactions.dropdown.visible) report.fails.push('desktop_dropdown');
  }

  // Form presence + required fields on contact
  await page.goto(LOCAL + '/contact-us/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await settle(page);
  report.interactions.form = await page.evaluate(() => {
    const form = document.querySelector('form.wpcf7-form, form');
    if (!form) return { present: false };
    const required = [...form.querySelectorAll('[required], .wpcf7-validates-as-required')].map((el) => el.getAttribute('name') || el.className);
    return {
      present: true,
      action: form.getAttribute('action'),
      method: form.getAttribute('method'),
      requiredCount: required.length,
      required,
      hasSubmit: !!form.querySelector('[type="submit"], input[type="submit"], button'),
    };
  });
  if (!report.interactions.form.present) report.fails.push('contact_form_missing');

  await context.close();
}

await browser.close();

fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
console.log('\n=== SUMMARY ===');
console.log(JSON.stringify({
  pagesChecked: report.pages.length,
  pageFails: report.pages.filter((p) => p.fails.length).length,
  viewportFails: report.fails.filter((f) => f.includes('overflow')).length,
  totalFails: report.fails.length,
  fails: report.fails,
  interactions: report.interactions,
}, null, 2));
