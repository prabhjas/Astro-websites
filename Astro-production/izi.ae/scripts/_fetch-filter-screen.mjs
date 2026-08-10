#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.join(process.cwd(), 'source/wordpress-exports/filter-screen');
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
const reqs = [];
page.on('request', (r) => {
  const u = r.url();
  if (/ajax|admin-ajax|api\/|filter|wp-json/i.test(u) && !/\.(css|js|png|jpg|woff2?|svg)(\?|$)/i.test(u)) {
    reqs.push(r.method() + ' ' + u.replace('https://izi.ae', '').slice(0, 200));
  }
});

await page.goto('https://izi.ae/filter-screen/?vehicle_type=SUV', {
  waitUntil: 'networkidle',
  timeout: 120000,
});
await page.waitForTimeout(5000);

const html = await page.content();
fs.writeFileSync(path.join(OUT, 'index-https.html'), html);

const m = await page.evaluate(() => {
  const results = [
    ...document.querySelectorAll(
      '.e-loop-item, .elementor-loop-item, article, .ecs-post-loop, [data-elementor-type="loop-item"]',
    ),
  ];
  const cards = results.map((el) => ({
    text: el.innerText.replace(/\s+/g, ' ').trim().slice(0, 100),
    display: getComputedStyle(el).display,
    hidden: el.hidden || el.classList.contains('hidden'),
    data: Object.fromEntries([...el.attributes].filter((a) => a.name.startsWith('data-')).map((a) => [a.name, a.value.slice(0, 80)])),
  }));
  return {
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.trim(),
    vehicleTypeVal: document.querySelector('#vehicleType')?.value,
    vehicleTypeSelected: document.querySelector('#vehicleType option:checked')?.textContent?.trim(),
    resultCount: results.length,
    visibleCount: results.filter((el) => el.getBoundingClientRect().height > 20).length,
    cards: cards.slice(0, 15),
    hasFilterJs: [...document.querySelectorAll('script:not([src])')].some((s) =>
      /vehicle_type|getUrlParameter|vehicleType|filterlocation/.test(s.textContent || ''),
    ),
    filterScriptSrcs: [...document.querySelectorAll('script[src]')]
      .map((s) => s.src)
      .filter((s) => /filter|car|custom|izi/i.test(s))
      .slice(0, 20),
  };
});

fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify({ m, reqs: [...new Set(reqs)] }, null, 2));
console.log(JSON.stringify({ m, reqs: [...new Set(reqs)].slice(0, 40), htmlBytes: html.length }, null, 2));
await browser.close();
