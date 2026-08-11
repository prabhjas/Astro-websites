#!/usr/bin/env node
const html = await (await fetch('http://127.0.0.1:5121/contact-us/')).text();
console.log('kinza links', [...html.matchAll(/<link[^>]+>/gi)].map((m) => m[0]).filter((x) => /kinza/i.test(x)));
console.log('cdn-cgi', (html.match(/cdn-cgi/gi) || []).length);
// find 404s via playwright
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage();
const fails = [];
p.on('response', (r) => {
  if (r.status() >= 400 && r.url().includes('127.0.0.1:5121')) {
    fails.push(r.status() + ' ' + r.url().replace('http://127.0.0.1:5121', ''));
  }
});
await p.goto('http://127.0.0.1:5121/contact-us/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
console.log('fails', [...new Set(fails)]);
// phone widget
const phone = await p.evaluate(() => {
  const input = document.querySelector('.wpcf7-form input[type="tel"], .wpcf7-form .wpcf7-tel, input.wpcf7-validates-as-tel, .iti input');
  const iti = document.querySelector('.iti, .intl-tel-input, .country-select');
  return {
    input: !!input,
    iti: !!iti,
    itiHtml: iti ? iti.className : null,
    flagBg: iti
      ? getComputedStyle(iti.querySelector('.iti__flag, .flag') || iti).backgroundImage.slice(0, 120)
      : null,
  };
});
console.log('phone', phone);
await b.close();
