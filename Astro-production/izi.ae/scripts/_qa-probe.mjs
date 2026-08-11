#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const LOCAL = 'http://127.0.0.1:5121';
const LIVE = 'https://izi.ae';

async function probe(browser, origin, path) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  const fails = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 200));
  });
  page.on('response', (r) => {
    if (r.status() < 400) return;
    const u = r.url();
    if (!u.includes('127.0.0.1') && !u.includes('izi.ae')) return;
    const pathOnly = u.replace(origin, '').split('?')[0];
    fails.push(`${r.status()} ${pathOnly}`);
  });
  await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1800);
  const m = await page.evaluate(() => {
    const iconEls = [
      ...document.querySelectorAll(
        'header i, nav i, .elementor-nav-menu i, .elementor-icon i, .elementor-icon, [class*="eicon"], .fa, .fas, .fab, .far, .eicon',
      ),
    ];
    const icons = iconEls.slice(0, 30).map((el) => {
      const before = getComputedStyle(el, '::before');
      const r = el.getBoundingClientRect();
      return {
        cls: String(el.className || '').slice(0, 120),
        before: before.content,
        ff: before.fontFamily || getComputedStyle(el).fontFamily,
        w: Math.round(r.width),
        h: Math.round(r.height),
        visible: r.width > 0 && r.height > 0,
      };
    });
    const owl = {
      count: document.querySelectorAll('.owl-carousel').length,
      loaded: document.querySelectorAll('.owl-loaded').length,
      items: document.querySelectorAll('.owl-item').length,
      active: document.querySelectorAll('.owl-item.active').length,
      dots: document.querySelectorAll('.owl-dot').length,
      nav: document.querySelectorAll('.owl-nav button, .owl-prev, .owl-next').length,
    };
    const slick = {
      count: document.querySelectorAll('.slick-slider').length,
      init: document.querySelectorAll('.slick-initialized').length,
      slides: document.querySelectorAll('.slick-slide').length,
    };
    const swiper = {
      count: document.querySelectorAll('.swiper').length,
      init: document.querySelectorAll('.swiper-initialized').length,
      slides: document.querySelectorAll('.swiper-slide').length,
      active: document.querySelectorAll('.swiper-slide-active').length,
    };
    const loadMore = [...document.querySelectorAll('a, button, .elementor-button, span')].filter((el) =>
      /load\s*more/i.test((el.textContent || '').trim()),
    );
    const loadMoreInfo = loadMore.slice(0, 5).map((el) => ({
      tag: el.tagName,
      text: (el.textContent || '').trim().slice(0, 40),
      href: el.getAttribute('href'),
      cls: String(el.className || '').slice(0, 140),
      data: {
        settings: el.getAttribute('data-settings'),
        load: el.getAttribute('data-load'),
        page: el.getAttribute('data-page'),
      },
    }));
    const forms = [...document.querySelectorAll('form.wpcf7-form, form.wpcf7-form-control')].map((f) => {
      const r = f.getBoundingClientRect();
      const wrap = f.closest('.wpcf7, .elementor-widget-form, .elementor-widget-shortcode');
      const wr = wrap?.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        wrapW: wr ? Math.round(wr.width) : null,
        inputs: f.querySelectorAll('input:not([type=hidden]), textarea, select').length,
        display: getComputedStyle(f).display,
        classes: String(f.className).slice(0, 120),
      };
    });
    // broken icon fonts: ::before content none and zero size for icon-looking elements
    const brokenIcons = icons.filter((i) => i.before === 'none' || i.w === 0 || /eicons|Font Awesome|FontAwesome/i.test(i.ff) === false && /eicon|fa[srb]?\s|fa-/i.test(i.cls));
    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim()?.slice(0, 80),
      icons,
      brokenIconSample: brokenIcons.slice(0, 10),
      owl,
      slick,
      swiper,
      loadMoreInfo,
      forms,
      jQuery: typeof window.jQuery,
      elementorFrontend: typeof window.elementorFrontend,
    };
  });
  await page.close();
  return {
    origin,
    path,
    m,
    errors: [...new Set(errors)].slice(0, 12),
    fails: [...new Set(fails)].slice(0, 40),
  };
}

const browser = await chromium.launch();

// find first blog post
const listPage = await browser.newPage();
await listPage.goto(LOCAL + '/insights/', { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(async () => {
  await listPage.goto(LOCAL + '/blog/', { waitUntil: 'domcontentloaded', timeout: 60000 });
});
await listPage.waitForTimeout(1000);
const insightPath = listPage.url().replace(LOCAL, '');
const firstPost = await listPage.evaluate(() => {
  const a = document.querySelector('a[href*="/"]');
  const links = [...document.querySelectorAll('a[href]')].map((x) => x.getAttribute('href'));
  const post = links.find(
    (h) =>
      h &&
      !h.includes('/insights') &&
      !h.includes('/blog') &&
      !h.includes('/category') &&
      !h.includes('/wp-') &&
      !h.startsWith('#') &&
      !h.includes('tel:') &&
      !h.includes('mailto:') &&
      h.split('/').filter(Boolean).length >= 1 &&
      !h.includes('/car/') &&
      !h.includes('/vehicles') &&
      !h.includes('/contact') &&
      !h.includes('/about'),
  );
  return { post, sample: links.filter((h) => h && h.includes('/') && !h.includes('#')).slice(0, 30) };
});
await listPage.close();

const paths = ['/', insightPath.startsWith('/insights') ? '/insights/' : '/blog/', firstPost.post || '/blog/'];
const results = [];
for (const path of ['/', '/insights/', '/blog/']) {
  results.push(await probe(browser, LOCAL, path));
  results.push(await probe(browser, LIVE, path));
}

// resolve a concrete post slug from inventory or blog listing
let postSlug = null;
try {
  const inv = JSON.parse(fs.readFileSync(new URL('../src/data/sitemap-inventory.json', import.meta.url), 'utf8'));
  postSlug = inv.posts?.[0]?.url?.replace('https://izi.ae', '');
} catch {}
if (!postSlug && firstPost.post) {
  postSlug = firstPost.post.startsWith('http') ? new URL(firstPost.post).pathname : firstPost.post;
}
if (postSlug) {
  results.push(await probe(browser, LOCAL, postSlug));
  results.push(await probe(browser, LIVE, postSlug));
}

fs.mkdirSync('.tmp-qa', { recursive: true });
fs.writeFileSync('.tmp-qa/qa-probe.json', JSON.stringify({ firstPost, insightPath, results }, null, 2));
console.log(JSON.stringify({ insightPath, postSlug, firstPost, summary: results.map((r) => ({
  o: r.origin.includes('5121') ? 'local' : 'live',
  path: r.path,
  owl: r.m.owl,
  slick: r.m.slick,
  swiper: r.m.swiper,
  icons: r.m.icons.slice(0, 8),
  loadMore: r.m.loadMoreInfo,
  forms: r.m.forms,
  errors: r.errors.slice(0, 6),
  fails: r.fails.slice(0, 15),
  jq: r.m.jQuery,
})) }, null, 2));

await browser.close();
