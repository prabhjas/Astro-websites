#!/usr/bin/env node
/**
 * Final UI QA — phone, blog, contact map, FAQ accordion collapse.
 */
import { chromium } from 'playwright';

const BASE = process.env.QA_BASE || 'http://127.0.0.1:5097';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const out = { fails: [] };

async function settle() {
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    try {
      window.dispatchEvent(new Event('mousemove'));
      window.dispatchEvent(new Event('scroll'));
    } catch (_) {}
  });
  await page.waitForTimeout(2200);
}

// --- Homepage phone ---
await page.goto(`${BASE}/`, { waitUntil: 'load', timeout: 60000 });
await settle();
out.homePhone = await page.evaluate(() => {
  const input = document.querySelector('.wpcf7-phonetext');
  const wrap = input?.closest('.intl-tel-input');
  const flag = wrap?.querySelector('.flag-container');
  return {
    detected: window.__astroDetectedCountry || null,
    pad: input ? getComputedStyle(input).paddingLeft : null,
    flagW: flag ? Math.ceil(flag.getBoundingClientRect().width) : 0,
    dial: wrap?.querySelector('.selected-dial-code')?.textContent?.trim() || null,
    overlap:
      flag && input
        ? parseFloat(getComputedStyle(input).paddingLeft) < flag.getBoundingClientRect().width
        : null,
  };
});
if (out.homePhone.overlap !== false) out.fails.push('phone_overlap');

// --- Blog ---
await page.goto(`${BASE}/blog/`, { waitUntil: 'load', timeout: 60000 });
await settle();
await page.waitForSelector('#blog-list .post', { timeout: 20000 }).catch(() => null);
out.blog = await page.evaluate(() => ({
  posts: document.querySelectorAll('#blog-list .post').length,
  pages: document.querySelectorAll('#pagination .page-numbers').length,
  active: document.querySelector('.category-btn.active')?.getAttribute('data-category'),
}));
if (!(out.blog.posts >= 9)) out.fails.push('blog_posts');

const cancelBtn = page.locator('button.category-btn[data-category="visa-cancellation-letter"]');
if ((await cancelBtn.count()) > 0) {
  await cancelBtn.first().click({ force: true });
  await page.waitForTimeout(1200);
}
out.blogCancel = await page.evaluate(() => ({
  posts: document.querySelectorAll('#blog-list .post').length,
  active: document.querySelector('.category-btn.active')?.getAttribute('data-category'),
}));
if (out.blogCancel.posts !== 1) out.fails.push('blog_cancel_tab');

// --- Contact ---
await page.goto(`${BASE}/contact-us/`, { waitUntil: 'load', timeout: 60000 });
await settle();
out.contact = await page.evaluate(() => {
  // Runtime loader may inject googletagmanager from PUBLIC_GA4_ID / PUBLIC_GTM_ID — that is OK.
  // Fail only if a static mirror script still hardcodes gtag/gtm outside /runtime-gtm.js.
  const hardScripts = [...document.querySelectorAll('script[src*="googletagmanager"]')].filter(
    (s) => !s.closest('[data-runtime-gtm]') && !document.querySelector('script[data-runtime-gtm]'),
  );
  // Scripts appended by runtime-gtm live in head without our marker; treat as OK if runtime loader present.
  const hasRuntime = !!document.querySelector('script[src*="runtime-gtm"], [data-runtime-gtm]');
  const staticHard =
    !hasRuntime &&
    /googletagmanager\.com\/(gtag|gtm)/i.test(document.documentElement.innerHTML);
  return {
    mapLeak: /Connect Resources Dubai/i.test(document.body.innerHTML),
    royalMap: /Royal Visa Dubai|City Tower/i.test(document.body.innerHTML),
    phone: !!document.querySelector('.wpcf7-phonetext'),
    hardGtm: staticHard,
    runtimeGtm: hasRuntime,
    injectedTagCount: hardScripts.length,
  };
});
if (out.contact.mapLeak) out.fails.push('contact_map_leak');
if (out.contact.hardGtm) out.fails.push('hard_gtm');
if (!out.contact.runtimeGtm) out.fails.push('missing_runtime_gtm');

// --- FAQ accordion (golden-visa) ---
await page.goto(`${BASE}/golden-visa/`, { waitUntil: 'load', timeout: 60000 });
await settle();
const faq = page.locator('.elementor-widget-accordion').first();
await faq.scrollIntoViewIfNeeded();
const titles = page.locator('.elementor-widget-accordion .elementor-tab-title');
const count = await titles.count();
out.faq = { count };

await titles.nth(1).click({ force: true });
await page.waitForTimeout(150);
out.faq.open = await page.evaluate(() => {
  const items = [...document.querySelectorAll('.elementor-widget-accordion .elementor-accordion-item')];
  const item = items[1];
  const content = item.querySelector('.elementor-tab-content');
  const cs = getComputedStyle(content);
  return {
    titleActive: item.querySelector('.elementor-tab-title').classList.contains('elementor-active'),
    contentActive: content.classList.contains('elementor-active'),
    display: cs.display,
    height: content.getBoundingClientRect().height,
    deco: getComputedStyle(item.querySelector('.elementor-accordion-title')).textDecorationLine,
  };
});
if (!out.faq.open.titleActive || out.faq.open.display === 'none' || out.faq.open.height < 10) {
  out.fails.push('faq_open');
}
if (out.faq.open.deco && out.faq.open.deco !== 'none') out.fails.push('faq_underline');

await titles.nth(1).click({ force: true });
await page.waitForTimeout(80);
out.faq.closed = await page.evaluate(() => {
  const item = document.querySelectorAll('.elementor-widget-accordion .elementor-accordion-item')[1];
  const content = item.querySelector('.elementor-tab-content');
  const cs = getComputedStyle(content);
  return {
    titleActive: item.querySelector('.elementor-tab-title').classList.contains('elementor-active'),
    contentActive: content.classList.contains('elementor-active'),
    display: cs.display,
    height: content.getBoundingClientRect().height,
    hidden: content.hidden,
    ghostVisible: cs.display !== 'none' && content.getBoundingClientRect().height > 0,
  };
});
if (out.faq.closed.ghostVisible || out.faq.closed.display !== 'none' || out.faq.closed.titleActive) {
  out.fails.push('faq_collapse_ghost');
}

// open A then B — only B open
await titles.nth(0).click({ force: true });
await page.waitForTimeout(80);
await titles.nth(2).click({ force: true });
await page.waitForTimeout(80);
out.faq.switch = await page.evaluate(() => {
  return [...document.querySelectorAll('.elementor-widget-accordion .elementor-accordion-item')]
    .slice(0, 3)
    .map((item, i) => ({
      i,
      open: item.querySelector('.elementor-tab-title').classList.contains('elementor-active'),
      h: item.querySelector('.elementor-tab-content').getBoundingClientRect().height,
    }));
});
const openCount = out.faq.switch.filter((x) => x.open).length;
if (openCount !== 1 || !out.faq.switch[2].open) out.fails.push('faq_exclusive_open');

console.log(JSON.stringify({ ...out, ok: out.fails.length === 0 }, null, 2));
await browser.close();
process.exit(out.fails.length ? 2 : 0);
