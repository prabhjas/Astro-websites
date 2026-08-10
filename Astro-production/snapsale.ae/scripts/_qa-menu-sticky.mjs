#!/usr/bin/env node
import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });

async function detail(url, label) {
  const p = await b.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(3500);
  const info = await p.evaluate(() => {
    const a = document.querySelector(
      '.elementor-nav-menu--main .menu-item-has-children > a',
    );
    if (!a) return { missing: true };
    const cs = getComputedStyle(a, '::after');
    const csBefore = getComputedStyle(a, '::before');
    const li = a.parentElement;
    return {
      linkHtml: a.innerHTML,
      text: a.textContent,
      afterContent: cs.content,
      afterDisplay: cs.display,
      afterWidth: cs.width,
      afterHeight: cs.height,
      afterBorder: cs.borderBottomWidth + ' ' + cs.borderLeftWidth,
      beforeContent: csBefore.content,
      hasSubArrow: !!a.querySelector('.sub-arrow'),
      subArrowCount: a.querySelectorAll('.sub-arrow').length,
      liClasses: li?.className,
      hasHasSubmenu: li?.classList.contains('has-submenu') || a.classList.contains('has-submenu'),
      // any svg in the li
      svgCount: li?.querySelectorAll('svg').length,
      // smartmenus indicator
      smIndicator: !!a.querySelector('.sub-arrow, .smartmenus-subindicator'),
    };
  });
  console.log(label, JSON.stringify(info, null, 2));
  await p.close();
}

await detail('https://snapsale.ae/', 'LIVE');
await detail('http://127.0.0.1:5097/', 'LOCAL');

// Also check sticky form on live post
const p = await b.newPage();
await p.goto('https://snapsale.ae/blog/employer-of-record-saudi-arabia/', {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await p.waitForTimeout(2000);
await p.evaluate(() => window.scrollTo(0, 800));
await p.waitForTimeout(1000);
const stickyLive = await p.evaluate(() => {
  const el = document.querySelector('.elementor-element-f006bfc');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    position: cs.position,
    top: cs.top,
    classes: el.className,
    stickyActive: el.classList.contains('elementor-sticky--active'),
    settings: el.getAttribute('data-settings')?.slice(0, 200),
  };
});
console.log('LIVE sticky', stickyLive);

await p.goto('http://127.0.0.1:5097/blog/employer-of-record-saudi-arabia/', {
  waitUntil: 'networkidle',
  timeout: 90000,
});
await p.waitForTimeout(2000);
await p.evaluate(() => window.scrollTo(0, 800));
await p.waitForTimeout(1500);
const stickyLocal = await p.evaluate(() => {
  const el = document.querySelector('.elementor-element-f006bfc');
  if (!el) return null;
  const cs = getComputedStyle(el);
  return {
    position: cs.position,
    top: cs.top,
    classes: el.className.slice(0, 180),
    stickyActive: el.classList.contains('elementor-sticky--active'),
    hasStickyJs: typeof jQuery !== 'undefined' && !!jQuery.fn.sticky,
    eStickyCss: !!document.querySelector('link[href*="sticky"]'),
  };
});
console.log('LOCAL sticky', stickyLocal);
await p.close();
await b.close();
