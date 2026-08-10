#!/usr/bin/env node
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage();

page.on('pageerror', (err) => {
  console.log('=== PAGEERROR ===');
  console.log(err.message);
  console.log(err.stack);
});

page.on('console', (msg) => {
  if (msg.type() === 'error' && /Rent|Unexpected/.test(msg.text())) {
    console.log('CONSOLE', msg.text());
    console.log(' at', msg.location());
  }
});

// Capture failed / responses that are HTML-as-JS
const badJs = [];
page.on('response', async (res) => {
  const url = res.url();
  if (!/\.js(\?|$)/i.test(url) && !/bundle/i.test(url)) return;
  if (!url.includes('127.0.0.1:5121')) return;
  try {
    const ct = res.headers()['content-type'] || '';
    const text = await res.text();
    if (/Unexpected|Rent a Car/.test(text.slice(0, 200)) && /<html/i.test(text)) {
      badJs.push({ url, status: res.status(), head: text.slice(0, 100) });
    }
    // Try parse as module syntax check for Rent identifier
    if (text.includes('IZI Rent') && !text.includes('"IZI Rent') && !text.includes("'IZI Rent")) {
      badJs.push({ url: url.slice(0, 120), note: 'unquoted IZI Rent?', head: text.slice(0, 160) });
    }
  } catch {
    /* */
  }
});

await page.goto('http://127.0.0.1:5121/', { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
await page.waitForTimeout(3000);
console.log('badJs samples', badJs.slice(0, 10));
await browser.close();
