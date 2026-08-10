#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

async function check(base) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/our-blogs/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const before = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll('.post-wrap')];
    const btn = document.querySelector('#loadMore');
    let handlers = null;
    try {
      handlers = window.jQuery && btn ? Object.keys(window.jQuery._data(btn, 'events') || {}) : null;
    } catch {
      handlers = 'err';
    }
    return {
      total: wraps.length,
      visible: wraps.filter((el) => getComputedStyle(el).display !== 'none').length,
      hidden: wraps.filter((el) => getComputedStyle(el).display === 'none').length,
      hasBtn: !!btn,
      btnText: btn?.textContent,
      hasJq: typeof window.jQuery,
      handlers,
      firstDisplay: wraps[0] ? getComputedStyle(wraps[0]).display : null,
      tenthDisplay: wraps[9] ? getComputedStyle(wraps[9]).display : null,
    };
  });
  const btn = page.locator('#loadMore');
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(1200);
  }
  const after = await page.evaluate(() => {
    const wraps = [...document.querySelectorAll('.post-wrap')];
    return {
      visible: wraps.filter((el) => getComputedStyle(el).display !== 'none').length,
      hidden: wraps.filter((el) => getComputedStyle(el).display === 'none').length,
      btnText: document.querySelector('#loadMore')?.textContent,
    };
  });
  const label = base.includes('127') ? 'local' : 'live';
  await page.screenshot({ path: `scripts/_parity-shots/${label}-blogs-loadmore.png`, fullPage: false });
  await browser.close();
  return { base, before, after };
}

const out = {
  local: await check('http://127.0.0.1:5112'),
  live: await check('https://lladesigners.com'),
};
writeFileSync('scripts/_qa-loadmore.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
