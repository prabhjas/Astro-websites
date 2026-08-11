#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
async function postIcons(origin) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(origin + '/abu-dhabi-toll-system/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1500);
  const data = await page.evaluate(() => {
    const metaIcons = [...document.querySelectorAll('.elementor-post-info .elementor-icon-list-icon, .elementor-post-info i, .elementor-post-info svg')].map((el) => {
      const r = el.getBoundingClientRect();
      const before = el.tagName === 'I' ? getComputedStyle(el, '::before') : null;
      return {
        tag: el.tagName,
        cls: String(el.className?.baseVal || el.className || '').slice(0, 100),
        w: Math.round(r.width),
        h: Math.round(r.height),
        before: before?.content,
        ff: before?.fontFamily,
        html: el.outerHTML.slice(0, 180),
      };
    });
    return metaIcons;
  });
  console.log(origin.includes('5121') ? 'local' : 'live', JSON.stringify(data, null, 2));
  await page.close();
}
await postIcons('http://127.0.0.1:5121');
await postIcons('https://izi.ae');

// click category nav
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://127.0.0.1:5121/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);
await page.evaluate(() => document.querySelector('.makeslider')?.scrollIntoView({ block: 'center' }));
await page.waitForTimeout(500);
const before = await page.evaluate(() => {
  const stage = document.querySelector('.makeslider .owl-stage');
  return stage ? getComputedStyle(stage).transform : null;
});
await page.click('.makeslider .owl-next, .makeslider .next-slide', { timeout: 5000 }).catch((e) => console.log('click fail', e.message));
await page.waitForTimeout(700);
const after = await page.evaluate(() => {
  const stage = document.querySelector('.makeslider .owl-stage');
  return {
    transform: stage ? getComputedStyle(stage).transform : null,
    navHtml: document.querySelector('.makeslider .owl-nav')?.innerHTML?.slice(0, 300),
  };
});
console.log('slider before', before);
console.log('slider after', after);
await page.screenshot({ path: '.tmp-qa/shots/local-makeslider-after-click.png' });
await browser.close();
