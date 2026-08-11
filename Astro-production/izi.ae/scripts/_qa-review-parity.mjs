import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = 'D:/Astro-websites/Astro-production/izi.ae/.tmp-qa/review-parity';
mkdirSync(OUT, { recursive: true });

const PATH =
  '/review-form/?Model=Hyundai+Accent+2024&post-id=1507&rentlenght=&finalprice=2400&filterlocation=Dubai&from_date=2026-08-27&from_time=09%3A16&to_date=2027-02-27&to_time=10%3A18';

async function capture(origin, label) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message.slice(0, 180)));
  page.on('console', (m) => {
    if (m.type() === 'error') errs.push(m.text().slice(0, 180));
  });
  const ajax = [];
  page.on('response', async (r) => {
    const u = r.url();
    if (/admin-ajax|wp-json|api\/|get_custom/i.test(u)) {
      ajax.push({ status: r.status(), url: u.slice(0, 160) });
    }
  });

  await page.goto(origin + PATH, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(4500);

  const meta = await page.evaluate(() => {
    const get = (n) => document.querySelector(`[name="${n}"]`)?.value || '';
    const cols = [...document.querySelectorAll('.elementor-top-column')].map((c) => {
      const r = c.getBoundingClientRect();
      return {
        id: c.getAttribute('data-id'),
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: getComputedStyle(c).display,
        text: (c.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
      };
    });
    const carPanel = [...document.querySelectorAll('h2,h3,h4,.elementor-heading-title')].map((el) =>
      el.textContent.trim(),
    );
    return {
      title: document.title,
      cols,
      headings: carPanel.slice(0, 20),
      fields: {
        Model: get('Model'),
        filterlocation: get('filterlocation'),
        rentlenght: get('rentlenght'),
        from_date: get('from_date'),
        from_time: get('from_time'),
        to_date: get('to_date'),
        to_time: get('to_time'),
        Price: get('Price'),
        postid: get('postid'),
        location: get('location'),
      },
      total: document.querySelector('#car-price')?.textContent?.trim(),
      hasMessage: !!document.querySelector('[name="your-message"], .astro-message-row'),
      kinza: !!document.getElementById('kinza-form-fix-css'),
      formW: Math.round(document.querySelector('form.wpcf7-form')?.getBoundingClientRect().width || 0),
      formH: Math.round(document.querySelector('form.wpcf7-form')?.getBoundingClientRect().height || 0),
      bodyTextHasSeats: /4 Seats|Suitcases|Automatic/i.test(document.body.innerText),
      carImage: !!document.querySelector('.elementor-col-50 img, .fetch-block img, .car-infolist img, .blue img'),
      imgSrcs: [...document.querySelectorAll('.elementor-element-bac0293 img, .elementor-col-50 img, main img')]
        .slice(0, 8)
        .map((i) => (i.currentSrc || i.src || '').split('/').slice(-1)[0]),
      shortcodes: document.querySelectorAll('.elementor-widget-shortcode').length,
      rightColHtmlLen: document.querySelector('.elementor-element-bac0293 ~ .elementor-column, .elementor-col-50:last-child')?.innerHTML?.length || 0,
    };
  });

  await page.screenshot({ path: join(OUT, `${label}-full.png`), fullPage: true });
  await page.screenshot({ path: join(OUT, `${label}-top.png`), fullPage: false });
  writeFileSync(join(OUT, `${label}.json`), JSON.stringify({ meta, ajax, errs }, null, 2));
  console.log(label, JSON.stringify({ meta, ajax: ajax.slice(0, 10), errs: errs.slice(0, 8) }, null, 2));
  await browser.close();
}

await capture('https://izi.ae', 'live');
await capture('http://127.0.0.1:5121', 'local');
