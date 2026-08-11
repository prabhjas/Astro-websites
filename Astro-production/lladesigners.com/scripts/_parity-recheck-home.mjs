#!/usr/bin/env node
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

mkdirSync('scripts/_parity-shots', { recursive: true });
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ deviceScaleFactor: 1, reducedMotion: 'reduce' });

for (const [label, base] of [
  ['live', 'https://lladesigners.com'],
  ['local', 'http://127.0.0.1:5112'],
]) {
  for (const w of [375, 1440]) {
    const page = await ctx.newPage();
    await page.setViewportSize({ width: w, height: 900 });
    const failed = [];
    page.on('response', (r) => {
      if (r.status() >= 400 && r.url().includes('wp-content')) {
        failed.push(`${r.status()} ${r.url().split('?')[0]}`);
      }
    });
    await page.goto(`${base}/`, { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2500);
    const h = await page.evaluate(() => {
      const header = document.querySelector('[data-elementor-type="header"]');
      const sticky = document.querySelector('.elementor-sticky--active');
      return {
        headerH: header?.getBoundingClientRect().height,
        sticky: !!sticky,
        stickyTop: sticky?.getBoundingClientRect().top,
        bodyPad: getComputedStyle(document.body).paddingTop,
      };
    });
    const path = `scripts/_parity-shots/${label}-home-recheck-${w}.png`;
    await page.screenshot({ path, fullPage: false });
    const uniq = [...new Set(failed)].slice(0, 15);
    console.log(JSON.stringify({ label, w, h, fails: uniq }));
    await page.close();
  }
}
await browser.close();
