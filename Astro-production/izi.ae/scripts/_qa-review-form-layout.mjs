import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'D:/Astro-websites/Astro-production/izi.ae/.tmp-qa/review-form';
mkdirSync(OUT, { recursive: true });

const PATH =
  '/review-form/?Model=Hyundai+Accent+2024&post-id=1507&rentlenght=&finalprice=2400&filterlocation=United-Arab-Emirates&from_date=2026-08-28&from_time=09%3A26&to_date=2027-02-28&to_time=06%3A26';

async function capture(origin, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push('PAGE:' + e.message.slice(0, 200)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push('CON:' + m.text().slice(0, 200));
  });
  await page.goto(origin + PATH, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4000);

  const meta = await page.evaluate(() => {
    const form = document.querySelector('form.wpcf7-form, form');
    const main =
      document.querySelector('.elementor-shortcode, .wpcf7, .elementor-widget-shortcode') ||
      document.querySelector('main') ||
      document.body;
    const r = main.getBoundingClientRect();
    const styles = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const cs = getComputedStyle(el);
      const br = el.getBoundingClientRect();
      return {
        w: Math.round(br.width),
        h: Math.round(br.height),
        display: cs.display,
        grid: cs.gridTemplateColumns,
        gap: cs.gap,
        pad: cs.padding,
        bg: cs.backgroundColor,
        maxW: cs.maxWidth,
      };
    };
    return {
      title: document.title,
      h1: document.querySelector('h1,h2')?.textContent?.trim(),
      formW: form ? Math.round(form.getBoundingClientRect().width) : 0,
      formH: form ? Math.round(form.getBoundingClientRect().height) : 0,
      section: styles('.elementor-section.elementor-top-section'),
      shortcode: styles('.elementor-widget-shortcode'),
      wpcf7: styles('.wpcf7'),
      fields: [...document.querySelectorAll('form input:not([type=hidden]), form textarea, form select')].map(
        (el) => ({
          name: el.name,
          type: el.type,
          val: (el.value || '').slice(0, 40),
          w: Math.round(el.getBoundingClientRect().width),
          h: Math.round(el.getBoundingClientRect().height),
          display: getComputedStyle(el).display,
          pe: getComputedStyle(el).pointerEvents,
        }),
      ),
      phoneFlag: !!document.querySelector('.iti, .intl-tel-input, .nbcpf-flag'),
      submit: !!document.querySelector('input.wpcf7-submit, input[type=submit]'),
      total: document.querySelector('#car-price')?.textContent?.trim(),
      bodyClasses: document.body.className.slice(0, 200),
      brokenImgs: [...document.images].filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src).slice(0, 10),
      cssLinks: [...document.querySelectorAll('link[rel=stylesheet]')].map((l) => l.href).filter((h) => /review|form|cf7|contact/i.test(h)).slice(0, 20),
    };
  });

  await page.screenshot({ path: join(OUT, `${label}-top.png`), fullPage: false });
  await page.screenshot({ path: join(OUT, `${label}-full.png`), fullPage: true });

  // try fill+submit smoke (don't actually if rate limited — just check validation UI)
  await page.fill('input[name="text-453"], input[name="first-name"]', 'Test').catch(() => {});
  const firstName =
    (await page.locator('input[name="text-453"]').count()) > 0
      ? 'input[name="text-453"]'
      : 'input[name*="first"], input[name="text-453"]';

  const names = await page.evaluate(() =>
    [...document.querySelectorAll('form input, form textarea')].map((el) => el.name).filter(Boolean),
  );

  writeFileSync(join(OUT, `${label}.json`), JSON.stringify({ meta, names, errs }, null, 2));
  console.log(label, JSON.stringify({ meta, names: names.slice(0, 30), errs: errs.slice(0, 8) }, null, 2));
  await browser.close();
}

await capture('http://127.0.0.1:5121', 'local');
await capture('https://izi.ae', 'live');
