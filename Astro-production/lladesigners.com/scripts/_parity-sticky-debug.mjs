#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const failed = [];
page.on('pageerror', (e) => errors.push(String(e.message)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
page.on('response', (r) => {
  if (r.status() >= 400) failed.push(`${r.status()} ${r.url().split('?')[0]}`);
});
await page.goto('http://127.0.0.1:5112/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(4000);
const info = await page.evaluate(() => {
  const cfg = window.elementorFrontendConfig || null;
  const fe = window.elementorFrontend;
  return {
    hasJQuery: typeof window.jQuery,
    hasStickyFn: !!(window.jQuery && window.jQuery.fn && window.jQuery.fn.sticky),
    hasFE: !!fe,
    modules: fe?.modules ? Object.keys(fe.modules) : null,
    handlers: fe?.hooks ? 'hooks-yes' : null,
    stickyActiveClass: document.querySelector('.elementor-sticky--active')?.className,
    stickyStyle: (() => {
      const el = document.querySelector('.elementor-element-f4cfbad');
      if (!el) return null;
      return {
        pos: getComputedStyle(el).position,
        classList: [...el.classList],
      };
    })(),
    configExperimental: cfg?.experimentalFeatures || null,
    urls: cfg?.urls || null,
  };
});
console.log(JSON.stringify({ info, errors: [...new Set(errors)].slice(0, 30), failed: [...new Set(failed)].slice(0, 20) }, null, 2));
await browser.close();
