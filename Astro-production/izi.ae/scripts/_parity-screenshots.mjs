#!/usr/bin/env node
/**
 * Screenshot live vs local for key pages/breakpoints (Playwright).
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa', 'parity-shots');
mkdirSync(OUT, { recursive: true });

const LIVE = 'https://izi.ae';
const LOCAL = 'http://127.0.0.1:5121';
const pages = ['/', '/contact-us/', '/vehicles/', '/car/toyota-yaris-2024/', '/blog/', '/faqs/'];
const viewports = [
  { name: '375', width: 375, height: 812 },
  { name: '768', width: 768, height: 1024 },
  { name: '1440', width: 1440, height: 900 },
];

async function shot(page, url, file) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() =>
    page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }),
  );
  await page.waitForTimeout(1500);
  // Hide cookie/chat overlays that differ
  await page.addStyleTag({
    content: '#cookie-notice,.cky-consent-container,.ca-widget,.chaty-widget,#chaty-widget,.hotjar-survey{display:none!important}',
  }).catch(() => {});
  await page.screenshot({ path: file, fullPage: false });
}

const browser = await chromium.launch({ headless: true });
const summary = [];

for (const vp of viewports) {
  const ctxLive = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const ctxLocal = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
  });
  const livePage = await ctxLive.newPage();
  const localPage = await ctxLocal.newPage();

  for (const path of pages) {
    const slug = path === '/' ? 'home' : path.replace(/^\/|\/$/g, '').replace(/\//g, '_');
    const liveFile = join(OUT, `${slug}_${vp.name}_live.png`);
    const localFile = join(OUT, `${slug}_${vp.name}_local.png`);
    console.log('shot', vp.name, path);
    await shot(livePage, `${LIVE}${path}?nowprocket=1`, liveFile);
    await shot(localPage, `${LOCAL}${path}`, localFile);

    // Quick DOM metrics
    const metrics = async (page) =>
      page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        const header = document.querySelector('header, .elementor-location-header, .site-header');
        const logo = document.querySelector('img[src*="logo"], .custom-logo, .elementor-widget-theme-site-logo img');
        return {
          font: cs.fontFamily.slice(0, 80),
          bg: cs.backgroundColor,
          title: document.title,
          headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
          logoW: logo ? Math.round(logo.getBoundingClientRect().width) : null,
          h1: (document.querySelector('h1')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80),
        };
      });
    const liveM = await metrics(livePage);
    const localM = await metrics(localPage);
    summary.push({ path, viewport: vp.name, live: liveM, local: localM });
    console.log(
      '  headerH',
      liveM.headerH,
      '→',
      localM.headerH,
      'logoW',
      liveM.logoW,
      '→',
      localM.logoW,
      'font',
      localM.font.slice(0, 40),
    );
  }
  await ctxLive.close();
  await ctxLocal.close();
}

await browser.close();
writeFileSync(join(OUT, 'metrics.json'), JSON.stringify(summary, null, 2));
console.log('Wrote', OUT);
