import { chromium } from 'playwright';

const url = process.argv[2] || 'http://127.0.0.1:5121/car/hyundai-accent-2024/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3500);

const pre = await page.evaluate(() => ({
  checked: document.querySelector('input[name=finalprice]:checked')?.getAttribute('data-rent'),
  start: document.querySelector('#start_date')?.value,
  end: document.querySelector('#end_date')?.value,
  endPE: getComputedStyle(document.querySelector('#end_date')).pointerEvents,
  parity: [...document.scripts].some((s) => /parity9/.test(s.src)),
}));

await page.evaluate(() => {
  if (window.jQuery && jQuery('#start_date').hasClass('hasDatepicker')) {
    jQuery('#start_date').datepicker('setDate', '2026-08-27');
    const onSelect = jQuery('#start_date').datepicker('option', 'onSelect');
    if (typeof onSelect === 'function') onSelect('2026-08-27');
  }
});
await page.waitForTimeout(300);

const after6 = await page.evaluate(() => ({
  start: document.querySelector('#start_date')?.value,
  end: document.querySelector('#end_date')?.value,
  rent: document.querySelector('input[name=finalprice]:checked')?.getAttribute('data-rent'),
}));

await page.evaluate(() => {
  const r = document.querySelector('input[name=finalprice][data-rent="1-year"]');
  if (r) {
    r.checked = true;
    r.dispatchEvent(new Event('change', { bubbles: true }));
    if (window.jQuery) jQuery(r).trigger('change');
  }
});
await page.waitForTimeout(300);

const after1y = await page.evaluate(() => ({
  end: document.querySelector('#end_date')?.value,
  rent: document.querySelector('input[name=finalprice]:checked')?.getAttribute('data-rent'),
}));

console.log(JSON.stringify({ pre, after6, after1y }, null, 2));
await browser.close();

const ok = after6.end === '2027-02-27' && after1y.end === '2027-08-27';
process.exitCode = ok ? 0 : 1;
