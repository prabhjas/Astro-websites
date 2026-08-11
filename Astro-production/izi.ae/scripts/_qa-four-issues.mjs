#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const LOCAL = 'http://127.0.0.1:5121';
const LIVE = 'https://izi.ae';
fs.mkdirSync('.tmp-qa/shots', { recursive: true });

async function probeFaq(origin) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 140));
  });
  await page.goto(origin + '/faqs/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);

  // click Booking category if present
  const booking = page.locator('text=Booking & Reservation').first();
  if (await booking.count()) {
    await booking.click();
    await page.waitForTimeout(800);
  }

  const before = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.elementor-accordion-item, .e-n-accordion-item, .elementor-toggle-item')];
    return items.slice(0, 5).map((el) => {
      const title = el.querySelector('.elementor-tab-title, .e-n-accordion-item-title, a.elementor-toggle-title, .elementor-accordion-title');
      const content = el.querySelector('.elementor-tab-content, .e-n-accordion-item-content, .elementor-tab-content.elementor-active, .elementor-toggle-content');
      const icon = el.querySelector('.elementor-accordion-icon, .e-n-accordion-item-title-icon, i, svg');
      return {
        title: title?.textContent?.trim()?.slice(0, 80),
        titleActive: title?.className || '',
        aria: title?.getAttribute('aria-expanded'),
        contentDisplay: content ? getComputedStyle(content).display : null,
        contentH: content ? Math.round(content.getBoundingClientRect().height) : null,
        iconHtml: icon?.outerHTML?.slice(0, 120),
      };
    });
  });

  // click first accordion
  const first = page.locator('.elementor-accordion-item .elementor-tab-title, .e-n-accordion-item-title, .elementor-toggle-title').first();
  if (await first.count()) {
    await first.click();
    await page.waitForTimeout(600);
  }
  const afterClick = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.elementor-accordion-item, .e-n-accordion-item, .elementor-toggle-item')];
    return items.slice(0, 3).map((el) => {
      const title = el.querySelector('.elementor-tab-title, .e-n-accordion-item-title, a.elementor-toggle-title');
      const content = el.querySelector('.elementor-tab-content, .e-n-accordion-item-content, .elementor-toggle-content');
      return {
        title: title?.textContent?.trim()?.slice(0, 60),
        aria: title?.getAttribute('aria-expanded'),
        active: title?.classList?.contains('elementor-active'),
        contentDisplay: content ? getComputedStyle(content).display : null,
        contentH: content ? Math.round(content.getBoundingClientRect().height) : null,
        contentText: content?.textContent?.trim()?.slice(0, 100),
      };
    });
  });

  const label = origin.includes('5121') ? 'local' : 'live';
  await page.screenshot({ path: `.tmp-qa/shots/${label}-faqs.png` });
  await browser.close();
  return { before, afterClick, errors: errors.slice(0, 6) };
}

async function probeBlog(origin) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + '/blog/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  const before = await page.evaluate(() => {
    const grid = document.querySelector('.elementor-element-9a2f334 .ecs-posts, .ecs-posts.elementor-posts-container');
    const articles = [...(grid?.querySelectorAll('article') || [])];
    return {
      count: articles.length,
      sample: articles.slice(0, 2).map((a) => ({
        cls: a.className.slice(0, 120),
        html: a.outerHTML.slice(0, 500),
        hasImg: !!a.querySelector('img'),
        h: Math.round(a.getBoundingClientRect().height),
      })),
      gridCls: grid?.className,
    };
  });
  const btn = page.locator('[data-cs-blog-load-more] a, .ecs-load-more-button a').first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(2500);
  }
  const after = await page.evaluate(() => {
    const grid = document.querySelector('.elementor-element-9a2f334 .ecs-posts') || document.querySelectorAll('.ecs-posts')[document.querySelectorAll('.ecs-posts').length - 1];
    const articles = [...(grid?.querySelectorAll('article') || [])];
    return {
      count: articles.length,
      last3: articles.slice(-3).map((a) => ({
        cls: a.className.slice(0, 100),
        hasImg: !!a.querySelector('img'),
        imgSrc: a.querySelector('img')?.getAttribute('src')?.slice(0, 80),
        h: Math.round(a.getBoundingClientRect().height),
        title: a.querySelector('h2,h3,a')?.textContent?.trim()?.slice(0, 60),
        htmlHead: a.outerHTML.slice(0, 400),
      })),
    };
  });
  const label = origin.includes('5121') ? 'local' : 'live';
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(400);
  await page.screenshot({ path: `.tmp-qa/shots/${label}-blog-after-loadmore.png` });
  await browser.close();
  return { before, after };
}

async function probeFilter(origin) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + '/filter-screen/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const metrics = await page.evaluate(() => {
    const where = document.querySelector('select[name="filterlocation"], #filter-form .select2');
    const select2 = [...document.querySelectorAll('#filter-form .select2-container, .filterForm1 .select2-container')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        text: el.querySelector('.select2-selection__rendered')?.textContent?.trim(),
      };
    });
    const locgroup = document.querySelector('.locgroup, .where, [class*=location]');
    const long = document.querySelector('#long_reset, .long_term, [id*=long]');
    const short = document.querySelector('#short_reset, .short_term, [id*=short]');
    const rent = document.querySelector('#rent_length, select[name="rent_lenght"]');
    return {
      select2,
      nativeSelects: [...document.querySelectorAll('#filter-form select')].map((s) => ({
        name: s.name,
        id: s.id,
        cls: s.className.slice(0, 80),
        display: getComputedStyle(s).display,
        w: Math.round(s.getBoundingClientRect().width),
      })),
      longText: long?.textContent?.trim(),
      shortText: short?.textContent?.trim(),
      longActive: long?.className,
      shortActive: short?.className,
      rentOptions: rent ? [...rent.options].map((o) => o.text) : [],
      formHtml: document.querySelector('#filter-form')?.innerHTML?.slice(0, 800),
    };
  });
  const label = origin.includes('5121') ? 'local' : 'live';
  await page.screenshot({ path: `.tmp-qa/shots/${label}-filter-layout.png`, clip: { x: 0, y: 120, width: 1440, height: 420 } });

  // long / short term click
  const longBtn = page.locator('#long_reset, button:has-text("Long Term")').first();
  const shortBtn = page.locator('#short_reset, button:has-text("Short Term")').first();
  let term = {};
  if (await longBtn.count()) {
    await longBtn.click();
    await page.waitForTimeout(500);
    term.afterLong = await page.evaluate(() => ({
      long: document.querySelector('#long_reset')?.className,
      short: document.querySelector('#short_reset')?.className,
      rentDisplay: document.querySelector('#rent_length, select[name="rent_lenght"]')
        ? getComputedStyle(document.querySelector('#rent_length, select[name="rent_lenght"]').closest('div') || document.querySelector('#rent_length')).display
        : null,
      hiddenInputs: [...document.querySelectorAll('#filter-form input[type=hidden], #filter-form input[name*=term]')].map((i) => ({
        name: i.name,
        value: i.value,
      })),
    }));
  }
  if (await shortBtn.count()) {
    await shortBtn.click();
    await page.waitForTimeout(500);
    term.afterShort = await page.evaluate(() => ({
      long: document.querySelector('#long_reset')?.className,
      short: document.querySelector('#short_reset')?.className,
      rentLen: document.querySelector('#rent_length')?.value,
      visibleFields: [...document.querySelectorAll('#filter-form .locgroup, #filter-form > div')].slice(0, 8).map((el) => ({
        cls: el.className?.slice?.(0, 60),
        display: getComputedStyle(el).display,
        text: el.innerText?.slice(0, 40),
      })),
    }));
  }

  // homepage long/short
  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  const home = await page.evaluate(() => ({
    long: document.querySelector('#long_reset')?.className,
    short: document.querySelector('#short_reset')?.className,
    longExists: !!document.querySelector('#long_reset, button:has-text("Long Term"), .long-term'),
  }));
  await page.screenshot({ path: `.tmp-qa/shots/${label}-home-term.png`, clip: { x: 0, y: 200, width: 1440, height: 380 } });
  await browser.close();
  return { metrics, term, home };
}

const out = {
  faqLocal: await probeFaq(LOCAL),
  faqLive: await probeFaq(LIVE),
  blogLocal: await probeBlog(LOCAL),
  blogLive: await probeBlog(LIVE),
  filterLocal: await probeFilter(LOCAL),
  filterLive: await probeFilter(LIVE),
};
fs.writeFileSync('.tmp-qa/issue-probe.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
