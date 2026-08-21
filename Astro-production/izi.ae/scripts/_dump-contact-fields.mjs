#!/usr/bin/env node
import { chromium } from 'playwright';
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5121/contact-us/', { waitUntil: 'networkidle' });
const fields = await page.evaluate(() =>
  [...document.querySelectorAll('.wpcf7-form input, .wpcf7-form textarea, .wpcf7-form select')].map((el) => ({
    name: el.getAttribute('name'),
    type: el.getAttribute('type') || el.tagName,
    ph: el.getAttribute('placeholder'),
  })),
);
console.log(fields);
await browser.close();
