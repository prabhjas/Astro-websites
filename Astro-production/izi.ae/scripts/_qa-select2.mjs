#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
async function probe(origin) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160));
  });
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 160)));
  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const data = await page.evaluate(() => {
    const selects = [...document.querySelectorAll('select.select2, .select2-hidden-accessible')];
    const containers = [...document.querySelectorAll('.select2-container')];
    return {
      jq: typeof window.jQuery,
      select2fn: typeof window.jQuery !== 'undefined' && typeof window.jQuery.fn?.select2,
      selects: selects.length,
      containers: containers.length,
      rendered: containers.slice(0, 4).map((c) => ({
        w: Math.round(c.getBoundingClientRect().width),
        h: Math.round(c.getBoundingClientRect().height),
        text: c.querySelector('.select2-selection__rendered')?.textContent?.trim(),
        arrow: !!c.querySelector('.select2-selection__arrow'),
        arrowDisplay: c.querySelector('.select2-selection__arrow')
          ? getComputedStyle(c.querySelector('.select2-selection__arrow')).display
          : null,
      })),
      nativeVisible: selects.filter((s) => s.offsetParent !== null && !s.classList.contains('select2-hidden-accessible')).length,
    };
  });
  console.log(origin.includes('5121') ? 'local' : 'live', JSON.stringify({ data, errors: errors.slice(0, 8) }, null, 2));
  await page.screenshot({ path: `.tmp-qa/shots/${origin.includes('5121') ? 'local' : 'live'}-select2.png`, clip: { x: 80, y: 280, width: 1280, height: 220 } });
  await page.close();
}
await probe('http://127.0.0.1:5121');
await probe('https://izi.ae');
await browser.close();
