#!/usr/bin/env node
import { chromium } from 'playwright';

async function inspect(base) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const header =
      document.querySelector('[data-elementor-type="header"]') ||
      document.querySelector('header') ||
      document.querySelector('#masthead');
    const body = document.body;
    const logo = document.querySelector('.site-logo-img img, .custom-logo, .elementor-widget-theme-site-logo img, header img');
    const cs = header ? getComputedStyle(header) : null;
    const sticky = document.querySelector('.elementor-sticky--active, .ast-sticky-active, .elementor-sticky');
    return {
      bodyClass: body.className.slice(0, 300),
      htmlScheme: document.documentElement.getAttribute('data-ecs-scheme'),
      headerTag: header?.tagName,
      headerClass: header?.className?.toString()?.slice(0, 250),
      headerBg: cs?.backgroundColor,
      headerPos: cs?.position,
      headerZ: cs?.zIndex,
      headerH: header?.getBoundingClientRect()?.height,
      logoSrc: logo?.getAttribute('src') || logo?.currentSrc,
      logoDisplay: logo ? getComputedStyle(logo).display : null,
      logoOpacity: logo ? getComputedStyle(logo).opacity : null,
      logoW: logo?.getBoundingClientRect()?.width,
      stickyFound: !!sticky,
      stickyClass: sticky?.className?.toString()?.slice(0, 120),
      errors: window.__errs || [],
    };
  });
  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(e.message));
  // collect failed requests
  const failed = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(r.status() + ' ' + r.url());
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const info2 = await page.evaluate(() => {
    const header =
      document.querySelector('[data-elementor-type="header"]') ||
      document.querySelector('header');
    const logo = document.querySelector(
      '.site-logo-img img, .custom-logo, .elementor-widget-theme-site-logo img, header img, .elementor-widget-image img',
    );
    const imgs = [...document.querySelectorAll('header img, [data-elementor-type="header"] img')].map((i) => ({
      src: i.currentSrc || i.src,
      w: i.getBoundingClientRect().width,
      h: i.getBoundingClientRect().height,
      op: getComputedStyle(i).opacity,
      vis: getComputedStyle(i).visibility,
      disp: getComputedStyle(i).display,
    }));
    return {
      headerBg: header ? getComputedStyle(header).backgroundColor : null,
      headerPos: header ? getComputedStyle(header).position : null,
      imgs,
      logoParentHTML: logo?.parentElement?.outerHTML?.slice(0, 300),
    };
  });
  await browser.close();
  return { base, info, info2, failed: failed.slice(0, 20), consoleErrors };
}

for (const base of ['https://lladesigners.com', 'http://127.0.0.1:5112']) {
  console.log(JSON.stringify(await inspect(base), null, 2));
}
