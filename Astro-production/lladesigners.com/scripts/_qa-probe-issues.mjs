#!/usr/bin/env node
import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';

async function probe(base, path, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  const errors = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url().split('?')[0]}`);
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    const icons = {
      fab: document.querySelectorAll('i.fab, .fab').length,
      fas: document.querySelectorAll('i.fas, .fas, i.fa').length,
      eicon: document.querySelectorAll('i.eicon-close, .eicon').length,
      ekit: document.querySelectorAll('[class*="ekiticon"], [class*="icon-"]').length,
      socialVisible: [...document.querySelectorAll('.elementor-social-icon, .fab')].slice(0, 5).map((el) => {
        const cs = getComputedStyle(el);
        const before = getComputedStyle(el, '::before');
        return {
          cls: el.className.toString().slice(0, 80),
          content: before.content,
          font: before.fontFamily,
          w: el.getBoundingClientRect().width,
          color: cs.color,
        };
      }),
    };
    const swiper = {
      el: !!document.querySelector('.elementor-main-swiper, .swiper'),
      slides: document.querySelectorAll('.elementor-main-swiper .swiper-slide, .elementor-slides .swiper-slide').length,
      active: document.querySelectorAll('.swiper-slide-active').length,
      instance: !!(window.jQuery && document.querySelector('.elementor-main-swiper') && window.jQuery(document.querySelector('.elementor-main-swiper')).data('swiper')),
      swiperGlobal: typeof window.Swiper,
    };
    const smart = {
      el: !!document.querySelector('#n2-ss-6, .n2-ss-slider'),
      slides: document.querySelectorAll('#n2-ss-6 .n2-ss-slide, .n2-ss-slide').length,
      ready: typeof window._N2 !== 'undefined',
    };
    const loadMore = {
      btn: !!document.querySelector('.eael-load-more-button, .elementor-button-link, a.load-more, .eael-post-load-more, button.load-more, .loadmore'),
      candidates: [...document.querySelectorAll('a,button')].filter((el) => /load more/i.test(el.textContent || '')).map((el) => ({
        tag: el.tagName,
        text: el.textContent.trim().slice(0, 40),
        cls: el.className.toString().slice(0, 120),
        href: el.getAttribute('href'),
      })),
      eael: !!document.querySelector('.eael-post-grid, .eael-post-appender, .eael-load-more-button'),
    };
    const form = {
      cf7: document.querySelectorAll('.wpcf7-form, form.wpcf7-form').length,
      inputs: document.querySelectorAll('.wpcf7 input, .wpcf7 textarea').length,
      boxes: [...document.querySelectorAll('.wpcf7, .elementor-widget-form, .elementor-widget-html')].slice(0, 3).map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return { w: r.width, h: r.height, display: cs.display, bg: cs.backgroundColor, cls: el.className.toString().slice(0, 100) };
      }),
    };
    return { icons, swiper, smart, loadMore, form, title: document.title };
  });
  await browser.close();
  return {
    label,
    base,
    path,
    info,
    failed: [...new Set(failed)].filter((u) => u.includes('wp-content') || u.includes('/js/') || u.includes('font')).slice(0, 25),
    errors: [...new Set(errors)].slice(0, 15),
  };
}

const jobs = [
  ['local-home', LOCAL, '/'],
  ['live-home', LIVE, '/'],
  ['local-blogs', LOCAL, '/our-blogs/'],
  ['live-blogs', LIVE, '/our-blogs/'],
  ['local-post', LOCAL, '/importance-of-lighting-in-interior-design/'],
  ['live-post', LIVE, '/importance-of-lighting-in-interior-design/'],
];

for (const [label, base, path] of jobs) {
  console.log('\n====', label, '====');
  console.log(JSON.stringify(await probe(base, path, label), null, 2));
}
