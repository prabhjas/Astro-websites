const url = 'http://127.0.0.1:5105/types-of-leaves-in-the-uae/';
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);

for (const y of [400, 900, 1400, 2000, 2600, 1200]) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(350);
}
await page.waitForTimeout(1000);

const result = await page.evaluate(() => {
  const wraps = [...document.querySelectorAll('.intl-tel-input')];
  const visibleFlags = wraps
    .map((w) => {
      const flag = w.querySelector('.iti-flag, .selected-dial-code');
      if (!flag) return null;
      const cs = getComputedStyle(flag);
      const r = flag.getBoundingClientRect();
      const visible =
        cs.visibility !== 'hidden' &&
        cs.opacity !== '0' &&
        r.width > 0 &&
        r.height > 0 &&
        r.bottom > 0 &&
        r.top < window.innerHeight;
      return {
        visible,
        inSpacer: !!w.closest('.elementor-sticky__spacer'),
        dial: (w.querySelector('.selected-dial-code') || {}).textContent || '',
        top: Math.round(r.top),
      };
    })
    .filter(Boolean);

  const stickyActive = [...document.querySelectorAll('.elementor-sticky--active')].map((el) =>
    el.getAttribute('data-id'),
  );
  const spacers = document.querySelectorAll('.elementor-sticky__spacer').length;
  const mirror = (document.querySelector('script[src*="astro-mirror-fixes"]') || {}).src || '';
  const formSticky = document.querySelector('.elementor-element-10f1ddc');
  return {
    mirror,
    wrapCount: wraps.length,
    visibleFlagCount: visibleFlags.filter((f) => f.visible).length,
    visibleFlags,
    stickyActive,
    spacers,
    formPosition: formSticky ? getComputedStyle(formSticky).position : null,
    phoneOk: (() => {
      const p = document.querySelector('.wpcf7-phonetext');
      const w = p && p.closest('.intl-tel-input');
      const f = w && w.querySelector('.iti-flag');
      const r = f && f.getBoundingClientRect();
      return !!(r && r.width >= 15 && getComputedStyle(f).visibility !== 'hidden');
    })(),
  };
});

console.log(JSON.stringify(result, null, 2));
await browser.close();
const ok = result.visibleFlagCount === 1 && result.phoneOk && !result.stickyActive.includes('10f1ddc');
console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 2);
