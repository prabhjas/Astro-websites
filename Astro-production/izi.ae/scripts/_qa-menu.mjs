#!/usr/bin/env node
import { chromium } from 'playwright';
import fs from 'node:fs';

const browser = await chromium.launch();
async function menuProbe(origin) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const fails = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && /icon|font|svg|eicon|awesome|flag/i.test(r.url()))
      fails.push(r.status() + ' ' + r.url().replace(origin, '').split('?')[0]);
  });
  await page.goto(origin + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2000);
  // hover Location
  const loc = page.locator('nav a, .elementor-nav-menu a').filter({ hasText: /^Location$/i }).first();
  await loc.hover({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(600);
  const data = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.elementor-nav-menu .sub-menu a, .elementor-nav-menu--dropdown a, .elementor-nav-menu .menu-item a')];
    const openMenus = [...document.querySelectorAll('.elementor-nav-menu .sub-menu, .elementor-nav-menu--dropdown')].filter(
      (el) => getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0,
    );
    return {
      openMenus: openMenus.map((el) => ({
        cls: el.className.slice(0, 80),
        h: Math.round(el.getBoundingClientRect().height),
        html: el.innerHTML.slice(0, 500),
        links: [...el.querySelectorAll('a')].map((a) => ({
          text: a.textContent.trim(),
          html: a.innerHTML.slice(0, 200),
          icon: !!a.querySelector('svg,i,img'),
        })),
      })),
      footerIcons: [...document.querySelectorAll('footer .elementor-icon-list-icon, .elementor-location-footer .elementor-icon-list-icon')].slice(0, 10).map((el) => ({
        w: Math.round(el.getBoundingClientRect().width),
        html: el.innerHTML.slice(0, 120),
        visible: el.getBoundingClientRect().height > 0,
      })),
    };
  });
  const label = origin.includes('5121') ? 'local' : 'live';
  await page.screenshot({ path: `.tmp-qa/shots/${label}-menu-hover.png` });
  // mobile menu
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  const toggle = page.locator('.elementor-menu-toggle').first();
  if (await toggle.count()) {
    await toggle.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `.tmp-qa/shots/${label}-mobile-menu.png` });
  }
  console.log(label, JSON.stringify({ fails, data }, null, 2));
  await page.close();
}
await menuProbe('http://127.0.0.1:5121');
await menuProbe('https://izi.ae');
await browser.close();
