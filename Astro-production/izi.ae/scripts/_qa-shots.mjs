#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const LOCAL = 'http://127.0.0.1:5121';
const LIVE = 'https://izi.ae';
fs.mkdirSync('.tmp-qa/shots', { recursive: true });

const browser = await chromium.launch();

async function shot(origin, path, name, opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 180));
  });
  await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(opts.wait || 2500);
  if (opts.scrollY) await page.evaluate((y) => window.scrollTo(0, y), opts.scrollY);
  await page.waitForTimeout(400);
  const metrics = await page.evaluate(() => {
    const headerIcons = [...document.querySelectorAll('header svg, header i, .elementor-location-header svg, .elementor-location-header i')].map((el) => {
      const r = el.getBoundingClientRect();
      const fill = el.tagName === 'svg' ? el.querySelector('path')?.getAttribute('fill') || getComputedStyle(el).fill : '';
      return {
        tag: el.tagName,
        cls: String(el.className?.baseVal || el.className || '').slice(0, 100),
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        fill,
        display: getComputedStyle(el).display,
        opacity: getComputedStyle(el).opacity,
      };
    });
    const owl = [...document.querySelectorAll('.owl-carousel')].map((el) => ({
      cls: el.className,
      loaded: el.classList.contains('owl-loaded'),
      items: el.querySelectorAll('.owl-item').length,
      active: el.querySelectorAll('.owl-item.active').length,
      stageW: el.querySelector('.owl-stage')?.getBoundingClientRect?.().width || 0,
      visible: el.getBoundingClientRect().height > 0,
    }));
    const slick = [...document.querySelectorAll('.slider-for, .slider-nav, .slick-slider')].map((el) => ({
      cls: el.className.slice(0, 80),
      init: el.classList.contains('slick-initialized'),
      slides: el.querySelectorAll('.slick-slide').length,
      h: Math.round(el.getBoundingClientRect().height),
    }));
    const social = [...document.querySelectorAll('.elementor-social-icon, .elementor-social-icons-wrapper a')].slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect();
      const svg = el.querySelector('svg');
      return {
        cls: String(el.className).slice(0, 80),
        w: Math.round(r.width),
        h: Math.round(r.height),
        hasSvg: !!svg,
        svgHtml: svg ? svg.outerHTML.slice(0, 120) : '',
        color: getComputedStyle(el).color,
        bg: getComputedStyle(el).backgroundColor,
      };
    });
    const form = document.querySelector('form.wpcf7-form');
    let formMetrics = null;
    if (form) {
      const r = form.getBoundingClientRect();
      const inputs = [...form.querySelectorAll('input:not([type=hidden]), textarea')].map((i) => ({
        name: i.name,
        w: Math.round(i.getBoundingClientRect().width),
        h: Math.round(i.getBoundingClientRect().height),
        display: getComputedStyle(i).display,
      }));
      formMetrics = {
        w: Math.round(r.width),
        h: Math.round(r.height),
        inputs,
        parentCls: form.closest('[data-id]')?.getAttribute('data-id'),
      };
    }
    const loadMore = document.querySelector('.ecs-load-more-button a, [data-cs-blog-load-more] a');
    return {
      owl,
      slick,
      headerIcons: headerIcons.filter((i) => i.w > 0 || i.h > 0 || /menu|search|cart|chevron|caret|facebook|instagram/i.test(i.cls)).slice(0, 20),
      social,
      formMetrics,
      loadMore: loadMore
        ? { href: loadMore.getAttribute('href'), text: loadMore.textContent.trim(), parent: loadMore.parentElement?.outerHTML.slice(0, 200) }
        : null,
      jqOwl: typeof window.jQuery !== 'undefined' && typeof window.jQuery.fn?.owlCarousel,
    };
  });
  const label = origin.includes('5121') ? 'local' : 'live';
  await page.screenshot({ path: `.tmp-qa/shots/${label}-${name}.png`, fullPage: false });
  if (opts.full) {
    await page.screenshot({ path: `.tmp-qa/shots/${label}-${name}-full.png`, fullPage: true });
  }
  await page.close();
  return { label, path, metrics, errors: errors.slice(0, 10) };
}

const results = [];
results.push(await shot(LOCAL, '/', 'home'));
results.push(await shot(LIVE, '/', 'home'));
results.push(await shot(LOCAL, '/blog/', 'blog'));
results.push(await shot(LIVE, '/blog/', 'blog'));
results.push(await shot(LOCAL, '/abu-dhabi-toll-system/', 'post', { scrollY: 400 }));
results.push(await shot(LIVE, '/abu-dhabi-toll-system/', 'post', { scrollY: 400 }));

// try clicking load more on local blog
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(LOCAL + '/blog/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() => document.querySelectorAll('.elementor-element-9a2f334 article, .elementor-element-9a2f334 .ecs-post-loop').length);
  const btn = page.locator('.ecs-load-more-button a, [data-cs-blog-load-more] a').first();
  let clickResult = { before };
  if (await btn.count()) {
    await btn.click({ timeout: 5000 }).catch((e) => {
      clickResult.clickError = e.message;
    });
    await page.waitForTimeout(2000);
    clickResult.after = await page.evaluate(() => document.querySelectorAll('.elementor-element-9a2f334 article, .elementor-element-9a2f334 .ecs-post-loop').length);
    clickResult.href = await btn.getAttribute('href');
  }
  results.push({ label: 'local-loadmore-click', clickResult });
  await page.close();
}

fs.writeFileSync('.tmp-qa/shots-metrics.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
await browser.close();
