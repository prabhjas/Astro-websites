#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5121/blog/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(1000);
const meta = await page.evaluate(() => {
  const nav = document.querySelector('[data-cs-blog-load-more], .ecs-load-more-button');
  const btn = nav?.querySelector('a');
  return {
    hasAttr: !!nav?.hasAttribute('data-cs-blog-load-more'),
    next: nav?.getAttribute('data-next-page'),
    offset: nav?.getAttribute('data-offset'),
    href: btn?.getAttribute('href'),
    script: !!document.querySelector('script[src*="blog-load-more"]'),
    before: document.querySelectorAll('.elementor-element-9a2f334 article').length,
  };
});
console.log('meta', meta);
await page.locator('[data-cs-blog-load-more] a, .ecs-load-more-button a').first().click();
await page.waitForTimeout(2500);
const after = await page.evaluate(() => document.querySelectorAll('.elementor-element-9a2f334 article').length);
console.log('after click', after);

const home = await browser.newPage();
await home.goto('http://127.0.0.1:5121/', { waitUntil: 'networkidle' });
await home.waitForTimeout(2000);
const hm = await home.evaluate(() => ({
  eicons: !!document.getElementById('astro-eicons-css') || !!document.querySelector('link[href*="elementor-icons"]'),
  makeLoaded: document.querySelector('.makeslider')?.classList.contains('owl-loaded'),
  logoLoaded: document.querySelector('.logoslider')?.classList.contains('owl-loaded'),
  select2: document.querySelectorAll('.select2-container').length,
  caret: !!document.querySelector('.elementor-nav-menu .e-fas-caret-down, .sub-arrow svg'),
}));
console.log('home', hm);

const post = await browser.newPage();
await post.goto('http://127.0.0.1:5121/abu-dhabi-toll-system/', { waitUntil: 'networkidle' });
await post.waitForTimeout(2000);
const pm = await post.evaluate(() => {
  const phone = document.querySelector('[name^="phonetext"]');
  const dial = document.querySelector('.selected-dial-code, .iti__selected-dial-code');
  const first = document.querySelector('[name="first-name"]');
  const hp = document.querySelector('[name="alt_s"]');
  const submit = document.querySelector('[type=submit]');
  return {
    dial: dial?.textContent?.trim(),
    firstW: first ? Math.round(first.getBoundingClientRect().width) : null,
    honeypotH: hp ? Math.round(hp.getBoundingClientRect().height) : null,
    submitBg: submit ? getComputedStyle(submit).backgroundColor : null,
  };
});
console.log('post', pm);
await browser.close();

if (after <= meta.before) {
  console.error('FAIL: Load More did not append articles');
  process.exit(1);
}
console.log('PASS');
