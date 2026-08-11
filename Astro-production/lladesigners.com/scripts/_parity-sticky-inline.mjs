#!/usr/bin/env node
import { chromium } from 'playwright';

async function dump(base) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3500);
  const out = await page.evaluate(() => {
    const el = document.querySelector('.elementor-element-f4cfbad');
    const spacer = document.querySelector('.elementor-sticky__spacer');
    return {
      elStyle: el?.getAttribute('style'),
      elClass: el?.className,
      spacerStyle: spacer?.getAttribute('style'),
      spacerIsClone: spacer !== el,
      stickyInstances: window.jQuery?.data?.(el) ? Object.keys(window.jQuery.data(el)) : null,
    };
  });
  await browser.close();
  return out;
}

console.log('LIVE', await dump('https://lladesigners.com'));
console.log('LOCAL', await dump('http://127.0.0.1:5112'));
