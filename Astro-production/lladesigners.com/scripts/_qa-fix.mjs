import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('scripts/_parity-shots', { recursive: true });

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';

async function probe(base, label) {
  const browser = await chromium.launch({ headless: true });
  const out = { label };

  // HOME desktop
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const failed = [];
    page.on('response', (r) => {
      if (r.status() >= 400 && !r.url().includes('wp-json/contact-form')) failed.push(r.status() + ' ' + r.url().split('?')[0]);
    });
    page.on('pageerror', (e) => failed.push('PAGE: ' + e.message.slice(0, 120)));
    await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);
    await page.screenshot({ path: `scripts/_parity-shots/fix-home-${label}-desk.png` });

    out.home = await page.evaluate(() => {
      const caret = document.querySelector('.elementor-nav-menu .menu-item-has-children > a .sub-arrow, .elementor-nav-menu .menu-item-has-children .fas, .elementor-item .fa-caret-down, .elementor-nav-menu .sub-arrow');
      const arrow = document.querySelector('.ast-header-navigation-arrow, .dropdown-menu-toggle');
      const arrowCs = arrow ? getComputedStyle(arrow) : null;
      const arrowBefore = arrow ? getComputedStyle(arrow, '::before') : null;
      const arrowAfter = arrow ? getComputedStyle(arrow, '::after') : null;
      const servicesLink = document.querySelector('.elementor-nav-menu .menu-item-has-children > a');
      return {
        submenuIconHTML: servicesLink?.innerHTML?.slice(0, 200),
        caretExists: !!caret,
        caretHTML: caret?.outerHTML?.slice(0, 150),
        arrow: arrow
          ? {
              w: Math.round(arrow.getBoundingClientRect().width),
              h: Math.round(arrow.getBoundingClientRect().height),
              before: arrowBefore.content,
              after: arrowAfter.content,
              beforeFont: arrowBefore.fontFamily,
              color: arrowCs.color,
              display: arrowCs.display,
            }
          : null,
        socialFab: [...document.querySelectorAll('header .fab, #stick-header .fab')].map((i) => ({
          cls: i.className,
          content: getComputedStyle(i, '::before').content,
          w: Math.round(i.getBoundingClientRect().width),
        })),
        swiperInit: !!document.querySelector('#top-banner .swiper')?.swiper,
        slidesBundleLoaded: [...document.scripts].some((s) => (s.src || '').includes('slides.')),
        navMenuBundle: [...document.scripts].some((s) => (s.src || '').includes('nav-menu')),
        elementorFrontend: typeof elementorFrontend !== 'undefined',
      };
    });
    out.homeFailed = [...new Set(failed)].slice(0, 30);
    await page.close();
  }

  // HOME mobile smart slider
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);
    await page.evaluate(() => {
      const h = [...document.querySelectorAll('h2,h3,h4')].find((el) => /WHAT WE DO/i.test(el.textContent || ''));
      h?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: `scripts/_parity-shots/fix-home-${label}-mobile-what.png` });
    out.mobileSmart = await page.evaluate(() => {
      const ss = document.querySelector('#n2-ss-6');
      const r = ss?.getBoundingClientRect();
      const bullets = [...document.querySelectorAll('#n2-ss-6 .n2-bullet')].map((b) => ({
        vis: getComputedStyle(b).visibility,
        w: Math.round(b.getBoundingClientRect().width),
      }));
      return {
        loaded: ss?.classList.contains('n2-ss-loaded'),
        w: Math.round(r?.width || 0),
        h: Math.round(r?.height || 0),
        bullets,
        activeSlide: document.querySelector('#n2-ss-6 .n2-ss-slide-active, #n2-ss-6 .n2-ss-slide[data-first]')?.dataset?.title,
      };
    });
    // try click bullet / wait for autoplay
    await page.waitForTimeout(3500);
    out.mobileSmartAfter = await page.evaluate(() => {
      const active = document.querySelector('#n2-ss-6 .n2-ss-slide.n2-ss-slide-active, #n2-ss-6 .n2-ss-slide[aria-hidden="false"]');
      return {
        activeId: active?.dataset?.id || active?.className,
        loaded: document.querySelector('#n2-ss-6')?.classList.contains('n2-ss-loaded'),
      };
    });
    await page.close();
  }

  // BLOGS load more
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/our-blogs/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(2500);
    out.blogs = await page.evaluate(() => {
      const wraps = [...document.querySelectorAll('.post-wrap')];
      const hidden = wraps.filter((el) => getComputedStyle(el).display === 'none' || el.style.display === 'none');
      const visible = wraps.filter((el) => getComputedStyle(el).display !== 'none');
      return {
        jquery: typeof window.jQuery,
        total: wraps.length,
        visible: visible.length,
        hidden: hidden.length,
        hasBtn: !!document.querySelector('#loadMore'),
        btnDisplay: document.querySelector('#loadMore') ? getComputedStyle(document.querySelector('#loadMore')).display : null,
        inlineScripts: [...document.scripts]
          .filter((s) => !s.src && /loadMore|post-wrap/.test(s.textContent || ''))
          .map((s) => s.textContent.slice(0, 300)),
      };
    });
    const btn = page.locator('#loadMore');
    if (await btn.count()) {
      await btn.evaluate((el) => el.scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(300);
      await btn.click({ force: true });
      await page.waitForTimeout(1200);
    }
    out.blogsAfter = await page.evaluate(() => {
      const wraps = [...document.querySelectorAll('.post-wrap')];
      return {
        visible: wraps.filter((el) => getComputedStyle(el).display !== 'none').length,
        btnText: document.querySelector('#loadMore')?.textContent?.trim(),
      };
    });
    await page.screenshot({ path: `scripts/_parity-shots/fix-blogs-${label}.png` });
    await page.close();
  }

  // POST form
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/importance-of-lighting-in-interior-design/', { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => {
      document.querySelector('form.wpcf7-form, .wpcf7')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `scripts/_parity-shots/fix-form-${label}.png` });
    out.form = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form');
      if (!form) return { missing: true };
      const r = form.getBoundingClientRect();
      const cs = getComputedStyle(form);
      const fields = [...form.querySelectorAll('.wpcf7-form-control-wrap, p, .inside_form, .label_form')].slice(0, 20).map((el) => ({
        cls: el.className.toString().slice(0, 60),
        w: Math.round(el.getBoundingClientRect().width),
        h: Math.round(el.getBoundingClientRect().height),
        display: getComputedStyle(el).display,
      }));
      const inputs = [...form.querySelectorAll('input:not([type=hidden]), textarea, select')].map((i) => ({
        name: i.name,
        type: i.type,
        w: Math.round(i.getBoundingClientRect().width),
        h: Math.round(i.getBoundingClientRect().height),
      }));
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        padding: cs.padding,
        background: cs.backgroundColor,
        inputs,
        phoneUI: {
          flag: !!form.querySelector('.selected-flag'),
          flagW: form.querySelector('.selected-flag')?.getBoundingClientRect().width,
          iti: !!form.querySelector('.iti, .intl-tel-input'),
        },
        cssOk: {
          cf7: [...document.styleSheets].some((s) => (s.href || '').includes('contact-form-7')),
          intl: [...document.styleSheets].some((s) => (s.href || '').includes('intlTelInput')),
          country: [...document.styleSheets].some((s) => (s.href || '').includes('countrySelect')),
          astra: [...document.styleSheets].some((s) => (s.href || '').includes('contact-form-7-main')),
          eael: [...document.styleSheets].some((s) => (s.href || '').includes('eael-2612')),
        },
        fields,
      };
    });
    await page.close();
  }

  await browser.close();
  return out;
}

const local = await probe(LOCAL, 'local');
const live = await probe(LIVE, 'live');
console.log(JSON.stringify({ local, live }, null, 2));
