#!/usr/bin/env node
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

async function probe(base) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  const logs = [];
  page.on('response', (r) => {
    if (/smartslider|n2\.|ss-/i.test(r.url()) || r.status() >= 400) {
      failed.push(`${r.status()} ${r.url().split('?')[0]}`);
    }
  });
  page.on('console', (m) => logs.push(`${m.type()}: ${m.text()}`));
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(5000);
  // force scroll to where smart slider should be
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const root = document.querySelector('#n2-ss-6');
    const align = document.querySelector('#n2-ss-6-align');
    const section = document.querySelector('.n2-section-smartslider');
    return {
      exists: !!root,
      classes: root?.className,
      loaded: root?.classList.contains('n2-ss-loaded'),
      rootBox: root?.getBoundingClientRect(),
      alignBox: align?.getBoundingClientRect(),
      sectionBox: section?.getBoundingClientRect(),
      parentDisplay: section ? getComputedStyle(section.parentElement).display : null,
      sectionDisplay: section ? getComputedStyle(section).display : null,
      n2: typeof window._N2,
      n2keys: window._N2 ? Object.keys(window._N2).slice(0, 30) : null,
      hasSmartSliderSimple: !!(window._N2 && window._N2.SmartSliderSimple),
      scripts: [...document.scripts].map((s) => s.src).filter((s) => /smartslider|n2/i.test(s)),
      styles: [...document.querySelectorAll('link[href*=smartslider], style[data-related]')].map((el) => el.getAttribute('href') || el.getAttribute('data-related')),
    };
  });
  await page.screenshot({ path: `scripts/_parity-shots/${base.includes('127') ? 'local' : 'live'}-home-mid.png`, fullPage: false });
  await browser.close();
  return {
    base,
    info,
    failed: [...new Set(failed)].slice(0, 40),
    logs: logs.filter((l) => /error|smart|n2|fail/i.test(l)).slice(0, 20),
  };
}

const out = {
  local: await probe('http://127.0.0.1:5112'),
  live: await probe('https://lladesigners.com'),
};
writeFileSync('scripts/_qa-smart.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
