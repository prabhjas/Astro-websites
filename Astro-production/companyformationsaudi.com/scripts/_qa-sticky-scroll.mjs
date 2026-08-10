#!/usr/bin/env node
import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });

async function stickyProbe(url, label) {
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(2500);
  const samples = [];
  for (const y of [0, 400, 800, 1200, 1800, 2500]) {
    await p.evaluate((yy) => window.scrollTo(0, yy), y);
    await p.waitForTimeout(400);
    const s = await p.evaluate((yy) => {
      const el = document.querySelector('.elementor-element-f006bfc');
      if (!el) return { y: yy, missing: true };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        y: yy,
        position: cs.position,
        top: cs.top,
        stickyActive: el.classList.contains('elementor-sticky--active'),
        rectTop: Math.round(r.top),
        rectHeight: Math.round(r.height),
        visible: r.bottom > 0 && r.top < innerHeight && r.height > 50,
        inlineTop: el.style.top,
      };
    }, y);
    samples.push(s);
  }
  console.log(label, JSON.stringify(samples, null, 2));
}

await stickyProbe(
  'https://companyformationsaudi.com/blog/employer-of-record-saudi-arabia/',
  'LIVE',
);
await stickyProbe(
  'http://127.0.0.1:5114/blog/employer-of-record-saudi-arabia/',
  'LOCAL',
);

// Menu: check Elementor custom CSS for caret on live homepage
await p.goto('https://companyformationsaudi.com/', { waitUntil: 'networkidle' });
const menuCss = await p.evaluate(() => {
  const styles = [...document.querySelectorAll('style')]
    .map((s) => s.textContent)
    .filter((t) => /sub-arrow|menu-item-has-children|caret|Service/i.test(t));
  return styles.map((t) => t.slice(0, 800));
});
console.log('LIVE menu custom css blocks', menuCss.length);
menuCss.forEach((t, i) => console.log('---', i, t));

// Check if underline pointer ::after is mistaken - look for any triangle in computed
const caretSearch = await p.evaluate(() => {
  const a = document.querySelector(
    '.elementor-nav-menu--main .menu-item-has-children > a',
  );
  // Check all children including text nodes
  const nodes = [...a.childNodes].map((n) => ({
    type: n.nodeType,
    text: n.textContent,
    html: n.outerHTML?.slice(0, 100),
  }));
  // Look in dropdown mobile nav too
  const mobile = document.querySelector(
    '.elementor-nav-menu--dropdown .menu-item-has-children > a',
  );
  return {
    desktop: nodes,
    mobileHtml: mobile?.innerHTML?.slice(0, 300),
    mobileArrow: mobile?.querySelectorAll('.sub-arrow').length,
  };
});
console.log('caretSearch', JSON.stringify(caretSearch, null, 2));

await b.close();
