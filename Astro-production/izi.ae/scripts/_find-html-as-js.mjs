#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();
const htmlAsJs = [];

page.on('response', async (res) => {
  const url = res.url();
  if (!url.includes('127.0.0.1:5121')) return;
  const isScript =
    /\.js(\?|$)/i.test(url) ||
    (res.request().resourceType() === 'script');
  if (!isScript) return;
  try {
    const buf = await res.body();
    const text = buf.toString('utf8');
    if (/^\s*</.test(text) || /<html/i.test(text) || /<title>/i.test(text)) {
      htmlAsJs.push({ status: res.status(), url: url.replace('http://127.0.0.1:5121', ''), head: text.slice(0, 120).replace(/\s+/g, ' ') });
    }
  } catch {
    /* */
  }
});

page.on('pageerror', (e) => console.log('PAGEERROR', e.message));

await page.goto('http://127.0.0.1:5121/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
await page.waitForTimeout(2000);
console.log('html-as-js count', htmlAsJs.length);
htmlAsJs.forEach((x) => console.log(x.status, x.url, x.head));
await browser.close();
