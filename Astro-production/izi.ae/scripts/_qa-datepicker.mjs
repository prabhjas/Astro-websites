import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

for (const base of ['http://127.0.0.1:5121', 'https://izi.ae']) {
  const errors = [];
  page.removeAllListeners('console');
  page.removeAllListeners('pageerror');
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 180));
  });
  page.on('pageerror', (e) => errors.push('PAGE: ' + e.message.slice(0, 180)));

  await page.goto(base + '/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4500);

  const info = await page.evaluate(() => {
    const start = document.querySelector('#start_date');
    const end = document.querySelector('#end_date');
    const times = [...document.querySelectorAll('input[name=from_time], input[name=to_time], #timePicker')];
    return {
      jq: typeof window.jQuery,
      datepickerFn: !!(window.jQuery && window.jQuery.fn && window.jQuery.fn.datepicker),
      datetimepickerFn: !!(window.jQuery && window.jQuery.fn && window.jQuery.fn.datetimepicker),
      ui: !!(window.jQuery && window.jQuery.ui),
      start: start && {
        type: start.type,
        value: start.value,
        className: start.className,
        hasDp: !!(window.jQuery && window.jQuery(start).data('datepicker')),
        hasXdsoft: !!(window.jQuery && window.jQuery(start).data('xdsoft_datetimepicker')),
      },
      end: end && {
        type: end.type,
        value: end.value,
        className: end.className,
        hasDp: !!(window.jQuery && window.jQuery(end).data('datepicker')),
      },
      times: times.map((t) => ({ name: t.name, id: t.id, type: t.type, value: t.value })),
      scripts: [...document.scripts]
        .map((s) => s.src)
        .filter(Boolean)
        .filter((s) => /date|picker|jquery-ui|ui\.core|ui\.date|moment/i.test(s)),
      css: [...document.querySelectorAll('link[rel=stylesheet]')]
        .map((l) => l.href)
        .filter((h) => /date|picker|jquery-ui/i.test(h)),
    };
  });

  console.log('\n====', base, '====');
  console.log(JSON.stringify(info, null, 2));
  console.log('errors', errors.slice(0, 15));

  try {
    await page.locator('#start_date').first().click({ timeout: 4000 });
    await page.waitForTimeout(600);
    const popup = await page.evaluate(() => ({
      uiDp: !!document.querySelector('#ui-datepicker-div'),
      uiVisible: (() => {
        const el = document.querySelector('#ui-datepicker-div');
        return el ? getComputedStyle(el).display !== 'none' : false;
      })(),
      xdsoft: document.querySelectorAll('.xdsoft_datetimepicker').length,
      active: document.activeElement && {
        id: document.activeElement.id,
        type: document.activeElement.type,
      },
    }));
    console.log('after click', popup);
  } catch (e) {
    console.log('click fail', e.message.slice(0, 120));
  }
}

await browser.close();
