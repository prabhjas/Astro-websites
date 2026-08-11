#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

async function run(base, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(6000);
  const info = await page.evaluate(() => {
    const root = document.querySelector('#n2-ss-6');
    const section = document.querySelector('.n2-section-smartslider');
    const chain = [];
    let el = section;
    while (el && chain.length < 10) {
      const cs = getComputedStyle(el);
      chain.push({
        tag: el.tagName,
        id: el.id,
        cls: (el.className || '').toString().slice(0, 100),
        display: cs.display,
        visibility: cs.visibility,
        height: cs.height,
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
        y: Math.round(el.getBoundingClientRect().top + window.scrollY),
      });
      el = el.parentElement;
    }
    // WHAT WE DO / snapshot section
    const headings = [...document.querySelectorAll('h2,h3,.elementor-heading-title')].map((h) => h.textContent.trim()).filter(Boolean).slice(0, 25);
    return {
      loaded: root?.classList.contains('n2-ss-loaded'),
      ssSimpleReady: !!(window._N2 && (window._N2['ss-simple'] || window._N2.ssSimple)),
      bulletReady: !!(window._N2 && window._N2.SmartSliderWidgetBulletTransition),
      rPending: window._N2 && window._N2._r ? Object.keys(window._N2._r || {}).slice(0, 20) : null,
      chain,
      headings,
    };
  });
  await page.screenshot({ path: `scripts/_parity-shots/${label}-home-y0.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 1800));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `scripts/_parity-shots/${label}-home-y1800.png`, fullPage: false });
  await page.evaluate(() => window.scrollTo(0, 2800));
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `scripts/_parity-shots/${label}-home-y2800.png`, fullPage: false });

  // form page
  await page.goto(base + '/importance-of-lighting-in-interior-design/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3000);
  const formInfo = await page.evaluate(() => {
    const wrap = document.querySelector('.eael-contact-form-7-wrapper') || document.querySelector('.wpcf7');
    const box = wrap?.getBoundingClientRect();
    const phoneExtras = [...document.querySelectorAll('.iti, .country-select, .flag-dropdown, .selected-flag, .country-list')].map((el) => ({
      cls: el.className.toString().slice(0, 80),
      display: getComputedStyle(el).display,
      w: el.getBoundingClientRect().width,
      h: el.getBoundingClientRect().height,
    }));
    const visibleInputs = [...document.querySelectorAll('.wpcf7 input, .wpcf7 textarea, .wpcf7 select')].filter((i) => getComputedStyle(i).display !== 'none' && i.type !== 'hidden');
    return {
      wrap: box ? { w: box.width, h: box.height, y: box.top } : null,
      visibleInputCount: visibleInputs.length,
      visibleInputs: visibleInputs.map((i) => ({ name: i.name, type: i.type, w: i.getBoundingClientRect().width, h: i.getBoundingClientRect().height })),
      phoneExtras,
      contactFormClass: document.querySelector('.contact-form')?.className,
      stylesheetsMissing: [...document.querySelectorAll('link[rel=stylesheet], link[as=style]')].filter((l) => /contact|intlTel|country|eael/i.test(l.href)).map((l) => l.href),
    };
  });
  const formEl = await page.$('.eael-contact-form-7-wrapper, .wpcf7');
  if (formEl) {
    await formEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    const box = await formEl.boundingBox();
    if (box) await page.screenshot({ path: `scripts/_parity-shots/${label}-form.png`, clip: { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 40), width: Math.min(500, box.width + 40), height: Math.min(800, box.height + 80) } });
  }

  await browser.close();
  return { info, formInfo };
}

const out = {
  local: await run('http://127.0.0.1:5112', 'local'),
  live: await run('https://lladesigners.com', 'live'),
};
writeFileSync('scripts/_qa-chain-form.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
