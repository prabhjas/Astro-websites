#!/usr/bin/env node
import { chromium } from 'playwright';

async function deep(base) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3000);
  const data = await page.evaluate(() => {
    const header = document.querySelector('[data-elementor-type="header"]');
    const section = document.querySelector('.elementor-element-f4cfbad');
    const sticky = document.querySelector('.elementor-sticky--active');
    const spacer = document.querySelector('.elementor-sticky__spacer');
    function box(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        tag: el.tagName,
        class: el.className.toString().slice(0, 180),
        h: r.height,
        top: r.top,
        pos: cs.position,
        display: cs.display,
        vis: cs.visibility,
        transform: cs.transform,
        bg: cs.backgroundColor,
        z: cs.zIndex,
        dataSettings: el.getAttribute('data-settings')?.slice(0, 200),
      };
    }
    return {
      header: box(header),
      section: box(section),
      sticky: box(sticky),
      spacer: box(spacer),
      firstSectionTop: document.querySelector('.elementor-location-header + *, .elementor-2780 + *')?.getBoundingClientRect?.()?.top,
      heroTop: document.querySelector('.elementor-location-single .elementor-section, main .elementor-section, .elementor-2152 .elementor-section')?.getBoundingClientRect?.()?.top,
    };
  });
  await page.screenshot({
    path: `scripts/_parity-shots/deep-${base.includes('127') ? 'local' : 'live'}-1440.png`,
    fullPage: false,
  });
  await browser.close();
  return data;
}

console.log('LIVE', JSON.stringify(await deep('https://lladesigners.com'), null, 2));
console.log('LOCAL', JSON.stringify(await deep('http://127.0.0.1:5112'), null, 2));
