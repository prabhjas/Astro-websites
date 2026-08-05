#!/usr/bin/env node
import { chromium } from 'playwright';

const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto('http://127.0.0.1:5097/blog/employer-of-record-saudi-arabia/', {
  waitUntil: 'networkidle',
});
await p.waitForTimeout(1500);
await p.addStyleTag({
  content: `
  .elementor-element-966b194 > .elementor-widget-wrap {
    display: block !important;
  }
  .elementor-element-f006bfc {
    position: sticky !important;
    top: 100px !important;
  }
`,
});
const track = [];
for (let y = 0; y <= 900; y += 100) {
  await p.evaluate((yy) => window.scrollTo(0, yy), y);
  await p.waitForTimeout(80);
  track.push(
    await p.evaluate((yy) => {
      const el = document.querySelector('.elementor-element-f006bfc');
      return { y: yy, top: Math.round(el.getBoundingClientRect().top) };
    }, y),
  );
}
console.log(JSON.stringify(track, null, 2));
await b.close();
