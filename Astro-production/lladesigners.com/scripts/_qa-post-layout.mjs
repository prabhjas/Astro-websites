import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';
const PATH = '/importance-of-lighting-in-interior-design/';

async function dig(base, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failed.push(r.status() + ' ' + r.url().split('?')[0].replace(base, ''));
  });
  page.on('pageerror', (e) => failed.push('PAGE:' + e.message.slice(0, 150)));
  await page.goto(base + PATH, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);

  await page.screenshot({ path: `scripts/_parity-shots/post-top-${label}.png` });

  const info = await page.evaluate(() => {
    const header = document.querySelector('#stick-header, header#masthead, .elementor-location-header');
    const hr = header?.getBoundingClientRect();
    const logo = document.querySelector('#stick-header img, header img, .custom-logo, .elementor-widget-theme-site-logo img');
    const socialFloat = [...document.querySelectorAll('.elementor-social-icon, .fab')].map((el) => {
      const r = el.getBoundingClientRect();
      return {
        cls: el.className.toString().slice(0, 60),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        position: getComputedStyle(el).position,
        parent: el.closest('[class*="elementor-element"]')?.className?.toString().slice(0, 80),
      };
    }).filter((x) => x.y > 50 && x.y < 400);

    const form = document.querySelector('form.wpcf7-form');
    const formFields = form
      ? [...form.querySelectorAll('input:not([type=hidden]), textarea, select')]
          .filter((i) => getComputedStyle(i).display !== 'none' && i.getBoundingClientRect().height > 0)
          .map((i) => ({ name: i.name, type: i.type, tag: i.tagName, h: Math.round(i.getBoundingClientRect().height), placeholder: i.placeholder }))
      : [];

    const blackish = [...document.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.width < 80 || r.height < 40 || r.top > 200 || r.left > 200) return false;
      const bg = getComputedStyle(el).backgroundColor;
      return bg === 'rgb(0, 0, 0)' || bg === 'rgb(12, 12, 12)' || bg === 'rgb(26, 26, 26)';
    }).slice(0, 10).map((el) => ({
      tag: el.tagName,
      id: el.id,
      cls: el.className.toString().slice(0, 80),
      bg: getComputedStyle(el).backgroundColor,
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y),
    }));

    const bodyClass = document.body.className;
    const scripts = [...document.scripts].map((s) => s.src).filter(Boolean).map((u) => u.replace(location.origin, '')).filter((u) => /slides|nav-menu|webpack|frontend|swiper|share-link|sticky/.test(u));

    const share = document.querySelector('.elementor-share-buttons, .elementor-widget-share-buttons, .eael-social-share');
    const shareR = share?.getBoundingClientRect();

    return {
      bodyClass: bodyClass.slice(0, 200),
      header: header
        ? {
            id: header.id,
            cls: header.className.toString().slice(0, 120),
            display: getComputedStyle(header).display,
            position: getComputedStyle(header).position,
            bg: getComputedStyle(header).backgroundColor,
            w: Math.round(hr.width),
            h: Math.round(hr.height),
            y: Math.round(hr.y),
            visibility: getComputedStyle(header).visibility,
          }
        : null,
      logo: logo
        ? {
            src: logo.currentSrc || logo.src,
            w: Math.round(logo.getBoundingClientRect().width),
            h: Math.round(logo.getBoundingClientRect().height),
            natural: [logo.naturalWidth, logo.naturalHeight],
            display: getComputedStyle(logo).display,
          }
        : null,
      socialFloat,
      formFields,
      blackish,
      scripts,
      share: share
        ? { cls: share.className.toString().slice(0, 80), w: Math.round(shareR.width), h: Math.round(shareR.height), y: Math.round(shareR.y), x: Math.round(shareR.x), position: getComputedStyle(share).position }
        : null,
      primary: (() => {
        const p = document.querySelector('#primary, .site-content, main');
        const r = p?.getBoundingClientRect();
        return p ? { cls: p.className.toString().slice(0, 60), w: Math.round(r.width), y: Math.round(r.y) } : null;
      })(),
    };
  });

  await browser.close();
  return { label, info, failed: [...new Set(failed)].slice(0, 40) };
}

const [local, live] = await Promise.all([dig(LOCAL, 'local'), dig(LIVE, 'live')]);
console.log(JSON.stringify({ local, live }, null, 2));
