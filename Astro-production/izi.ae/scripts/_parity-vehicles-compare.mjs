#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
for (const origin of ['http://127.0.0.1:5121', 'https://izi.ae']) {
  const page = await browser.newPage();
  await page.goto(`${origin}/vehicles/`, { waitUntil: 'networkidle', timeout: 90000 });
  const m = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => i.offsetParent !== null).length;
    const loops = document.querySelectorAll(
      '.e-loop-item, .elementor-post, .vehicles_box, .car_box, .elementor-widget-image-box',
    ).length;
    const carLinks = [...document.querySelectorAll('a[href*="/car/"]')].length;
    return {
      imgs,
      loops,
      carLinks,
      bodyLen: document.body.innerText.length,
      h1: document.querySelector('h1')?.textContent?.trim(),
    };
  });
  console.log(origin, m);
  await page.close();
}
await browser.close();
