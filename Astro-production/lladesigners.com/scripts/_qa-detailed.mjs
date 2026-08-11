#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

async function shot(base, path, name, fn) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url().split('?')[0]}`);
  });
  await page.goto(base + path, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3500);
  const data = fn ? await page.evaluate(fn) : null;
  if (name.includes('smart')) {
    const el = await page.$('#n2-ss-6, .n2-section-smartslider');
    if (el) await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
  }
  if (name.includes('form')) {
    const el = await page.$('.eael-contact-form-7-wrapper, .wpcf7, .contact-form');
    if (el) await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1000);
    await page.screenshot({
      path: `scripts/_parity-shots/${name}.png`,
      clip: await el.boundingBox(),
    });
  } else if (name.includes('smart')) {
    const el = await page.$('#n2-ss-6, .n2-section-smartslider');
    const box = el ? await el.boundingBox() : null;
    if (box) await page.screenshot({ path: `scripts/_parity-shots/${name}.png`, clip: box });
    else await page.screenshot({ path: `scripts/_parity-shots/${name}.png`, fullPage: false });
  } else {
    await page.screenshot({ path: `scripts/_parity-shots/${name}.png`, fullPage: false });
  }
  await browser.close();
  return { base, path, data, failed: [...new Set(failed)].filter((u) => /icon|font|fa-|ekit|smart|swiper|slides|css|woff/i.test(u)).slice(0, 30) };
}

function smartFn() {
  const root = document.querySelector('#n2-ss-6');
  const section = document.querySelector('.n2-section-smartslider');
  return {
    rootH: root?.getBoundingClientRect().height,
    sectionH: section?.getBoundingClientRect().height,
    slides: document.querySelectorAll('#n2-ss-6 .n2-ss-slide').length,
    visibleSlides: [...document.querySelectorAll('#n2-ss-6 .n2-ss-slide')].filter((s) => getComputedStyle(s).display !== 'none' && s.getBoundingClientRect().height > 0).length,
    bullets: document.querySelectorAll('#n2-ss-6 .n2-bullet, #n2-ss-6 [class*=bullet]').length,
    display: root ? getComputedStyle(root).display : null,
    opacity: root ? getComputedStyle(root).opacity : null,
    html: root?.outerHTML?.slice(0, 300),
  };
}

function formFn() {
  const wrap = document.querySelector('.eael-contact-form-7-wrapper, .wpcf7');
  const phone = document.querySelector('.iti, .country-list, .wpcf7-phonetext, .country-select');
  const labels = [...document.querySelectorAll('.label_form, .wpcf7 label')].map((l) => ({
    text: l.childNodes[0]?.textContent?.trim()?.slice(0, 40),
    display: getComputedStyle(l).display,
    w: l.getBoundingClientRect().width,
  }));
  const inputs = [...document.querySelectorAll('.wpcf7 input:not([type=hidden]), .wpcf7 textarea')].map((i) => ({
    name: i.name,
    type: i.type,
    cls: i.className.toString().slice(0, 80),
    w: i.getBoundingClientRect().width,
    h: i.getBoundingClientRect().height,
    display: getComputedStyle(i).display,
  }));
  const cs = wrap ? getComputedStyle(wrap) : null;
  return {
    wrap: wrap
      ? {
          w: wrap.getBoundingClientRect().width,
          h: wrap.getBoundingClientRect().height,
          bg: cs.backgroundColor,
          pad: cs.padding,
        }
      : null,
    phoneUI: !!document.querySelector('.iti, .country-select, .flag-container'),
    labels,
    inputs,
    attributionVisible: [...document.querySelectorAll('.wpcf7 input[type=hidden], .wpcf7 input')].filter((i) => /gclid|utm_|attribution|campaign/i.test(i.name)).map((i) => ({ name: i.name, type: i.type, display: getComputedStyle(i).display })),
  };
}

function menuFn() {
  return {
    headerSocial: [...document.querySelectorAll('[data-elementor-type=header] .elementor-social-icon, header .elementor-social-icon')].map((el) => {
      const icon = el.querySelector('i, svg');
      const b = icon ? getComputedStyle(icon, '::before') : null;
      return {
        cls: el.className.toString().slice(0, 100),
        iconCls: icon?.className?.toString?.() || icon?.tagName,
        content: b?.content,
        font: b?.fontFamily,
        w: el.getBoundingClientRect().width,
        color: getComputedStyle(el).color,
        bg: getComputedStyle(el).backgroundColor,
      };
    }),
    submenuIcons: [...document.querySelectorAll('.elementor-nav-menu .sub-arrow, .fa-caret-down')].slice(0, 4).map((el) => ({
      cls: el.className.toString().slice(0, 80),
      content: getComputedStyle(el, '::before').content,
      w: el.getBoundingClientRect().width,
    })),
  };
}

const results = {};
results.localSmart = await shot('http://127.0.0.1:5112', '/', 'local-smart', smartFn);
results.liveSmart = await shot('https://lladesigners.com', '/', 'live-smart', smartFn);
results.localForm = await shot('http://127.0.0.1:5112', '/importance-of-lighting-in-interior-design/', 'local-form', formFn);
results.liveForm = await shot('https://lladesigners.com', '/importance-of-lighting-in-interior-design/', 'live-form', formFn);
results.localMenu = await shot('http://127.0.0.1:5112', '/', 'local-menu', menuFn);
results.liveMenu = await shot('https://lladesigners.com', '/', 'live-menu', menuFn);

writeFileSync('scripts/_qa-detailed.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
