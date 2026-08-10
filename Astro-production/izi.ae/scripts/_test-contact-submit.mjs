#!/usr/bin/env node
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
const posts = [];
page.on('request', (r) => {
  if (r.method() === 'POST') posts.push(r.url().replace(/\?.*/, ''));
});
await page.goto('http://127.0.0.1:5121/contact-us/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.fill('input[name="first-name"]', 'Parity');
await page.fill('input[name="last-name"]', 'Tester');
await page.fill('input[name="your-email"]', 'parity@example.com');
await page.fill('input[name="phonetext-257"]', '501234567');
await page.fill('textarea[name="your-message"]', 'parity form test');
await page.click('.wpcf7-submit');
await page.waitForTimeout(3000);
console.log('POSTs', posts.filter((u) => u.includes('127.0.0.1') || u.includes('/api/')));
const status = await page.evaluate(
  () => document.querySelector('.wpcf7-response-output')?.textContent?.trim() || 'none',
);
console.log('response', status.slice(0, 180));
await browser.close();
