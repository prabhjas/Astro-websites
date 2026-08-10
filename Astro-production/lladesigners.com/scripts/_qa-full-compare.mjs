import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';

async function shotCompare() {
  const browser = await chromium.launch({ headless: true });

  for (const [name, base] of [
    ['local', LOCAL],
    ['live', LIVE],
  ]) {
    for (const [vpName, vp] of [
      ['desk', { width: 1440, height: 900 }],
      ['mobile', { width: 390, height: 844 }],
    ]) {
      const page = await browser.newPage({ viewport: vp });
      await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 90000 });
      await page.waitForTimeout(2500);

      // Full first viewport
      await page.screenshot({ path: `scripts/_parity-shots/qa-home-${name}-${vpName}-top.png` });

      // Scroll to WHAT WE DO
      await page.evaluate(() => {
        const h = [...document.querySelectorAll('h2,h3,h4,.elementor-heading-title')].find((el) =>
          /WHAT WE DO/i.test(el.textContent || '')
        );
        h?.scrollIntoView({ block: 'center' });
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: `scripts/_parity-shots/qa-home-${name}-${vpName}-whatwedo.png` });

      // Header/menu icons area
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      const header = page.locator('#stick-header, header, .elementor-location-header').first();
      if (await header.count()) {
        await header.screenshot({ path: `scripts/_parity-shots/qa-header-${name}-${vpName}.png` });
      }

      // Dropdown caret icons
      const caret = await page.evaluate(() => {
        const items = [...document.querySelectorAll('.elementor-nav-menu .menu-item-has-children > a, .dropdown-menu-toggle, .sub-arrow, .fas.fa-caret-down')];
        return items.slice(0, 10).map((el) => {
          const cs = getComputedStyle(el);
          const before = getComputedStyle(el, '::before');
          const after = getComputedStyle(el, '::after');
          const r = el.getBoundingClientRect();
          return {
            tag: el.tagName,
            cls: (el.className || '').toString().slice(0, 80),
            text: (el.textContent || '').trim().slice(0, 40),
            w: Math.round(r.width),
            h: Math.round(r.height),
            before: before.content,
            after: after.content,
            beforeFont: before.fontFamily,
            display: cs.display,
          };
        });
      });
      console.log(name, vpName, 'carets', JSON.stringify(caret, null, 2));

      // Count visible carousels / broken empty boxes
      const widgets = await page.evaluate(() => {
        const sels = [
          '.elementor-widget-slides',
          '.elementor-widget-image-carousel',
          '.elementor-widget-media-carousel',
          '.elementor-widget-loop-carousel',
          '.n2-ss-slider',
          '.swiper',
          '.eael-testimonial-slider',
          '.eael-post-carousel',
        ];
        const out = [];
        for (const s of sels) {
          for (const el of document.querySelectorAll(s)) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 && r.height === 0) continue;
            out.push({
              s,
              id: el.id,
              cls: el.className.toString().slice(0, 80),
              w: Math.round(r.width),
              h: Math.round(r.height),
              y: Math.round(r.top + scrollY),
              slides: el.querySelectorAll('.swiper-slide, .n2-ss-slide, .eael-grid-post').length,
              initialized: el.classList.contains('swiper-initialized') || el.classList.contains('n2-ss-loaded'),
            });
          }
        }
        return out;
      });
      console.log(name, vpName, 'widgets', JSON.stringify(widgets, null, 2));

      await page.close();
    }
  }

  // Insights load more
  for (const [name, base] of [
    ['local', LOCAL],
    ['live', LIVE],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/our-blogs/', { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(1500);
    const before = await page.locator('.post-wrap:visible').count().catch(() => -1);
    const altBefore = await page.evaluate(() => {
      const wraps = [...document.querySelectorAll('.post-wrap, .eael-grid-post, article')];
      return {
        total: wraps.length,
        visible: wraps.filter((el) => getComputedStyle(el).display !== 'none' && el.offsetParent !== null).length,
        btn: !!document.querySelector('#loadMore, .load-more, a.load-more, button.load-more'),
        btnText: document.querySelector('#loadMore, .load-more')?.textContent?.trim(),
        jquery: typeof window.jQuery,
      };
    });
    const btn = page.locator('#loadMore');
    if (await btn.count()) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await page.waitForTimeout(1000);
    }
    const after = await page.evaluate(() => {
      const wraps = [...document.querySelectorAll('.post-wrap')];
      return wraps.filter((el) => getComputedStyle(el).display !== 'none').length;
    });
    console.log(name, 'loadMore', JSON.stringify({ altBefore, after }, null, 2));
    await page.screenshot({ path: `scripts/_parity-shots/qa-blogs-${name}.png`, fullPage: false });
    await page.close();
  }

  // Single post form
  for (const [name, base] of [
    ['local', LOCAL],
    ['live', LIVE],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(base + '/importance-of-lighting-in-interior-design/', { waitUntil: 'networkidle', timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      document.querySelector('.wpcf7, .contact-form, form.wpcf7-form')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(500);
    const form = page.locator('.wpcf7, form.wpcf7-form, .contact-form').first();
    if (await form.count()) {
      await form.screenshot({ path: `scripts/_parity-shots/qa-form-${name}.png` });
    }
    const info = await page.evaluate(() => {
      const form = document.querySelector('form.wpcf7-form, .wpcf7 form, .contact-form');
      if (!form) return null;
      const r = form.getBoundingClientRect();
      const inputs = [...form.querySelectorAll('input, textarea, select')].map((i) => ({
        name: i.name,
        type: i.type,
        w: Math.round(i.getBoundingClientRect().width),
        h: Math.round(i.getBoundingClientRect().height),
        display: getComputedStyle(i).display,
        placeholder: i.placeholder,
      }));
      const missingCss = [...document.querySelectorAll('link[rel=stylesheet], link[as=stylesheet]')].filter((l) => {
        // can't know 404 easily here
        return false;
      });
      const labels = [...form.querySelectorAll('label, .label_form, .wpcf7-form-control-wrap')].length;
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        inputs: inputs.filter((i) => i.display !== 'none'),
        allInputs: inputs.length,
        labels,
        classes: form.className,
        phoneFlag: !!form.querySelector('.selected-flag, .iti__flag, .flag-dropdown'),
        stylesheets: [...document.styleSheets]
          .map((s) => s.href)
          .filter(Boolean)
          .filter((h) => /cf7|intlTel|countrySelect|contact-form|eael/i.test(h)),
      };
    });
    console.log(name, 'form', JSON.stringify(info, null, 2));
    await page.close();
  }

  await browser.close();
}

await shotCompare();
