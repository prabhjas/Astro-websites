const url = 'http://127.0.0.1:5108/types-of-leaves-in-the-uae/';
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);
for (const y of [600, 1200, 1800, 2400]) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(500);
}
const info = await page.evaluate(() => {
  const wraps = [...document.querySelectorAll('.intl-tel-input')];
  return {
    count: wraps.length,
    items: wraps.map((w, i) => {
      const stickyParent = w.closest('[class*="sticky"]');
      const section = w.closest('.elementor-element');
      return {
        i,
        hasPhone: !!w.querySelector('.wpcf7-phonetext'),
        display: getComputedStyle(w).display,
        visibility: getComputedStyle(w).visibility,
        rect: (() => {
          const r = w.getBoundingClientRect();
          return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) };
        })(),
        sectionId: section && section.getAttribute('data-id'),
        stickyClasses: stickyParent && stickyParent.className,
        formId: w.closest('form') && w.closest('.wpcf7') && w.closest('.wpcf7').id,
        parentChain: (function () {
          const parts = [];
          let el = w;
          for (let n = 0; n < 8 && el; n++) {
            parts.push(
              (el.className && String(el.className).slice(0, 60)) || el.tagName,
            );
            el = el.parentElement;
          }
          return parts;
        })(),
      };
    }),
    stickySections: [...document.querySelectorAll('.elementor-sticky--active, .elementor-sticky')].map(
      (el) => ({
        id: el.getAttribute('data-id'),
        className: el.className.slice(0, 120),
        position: getComputedStyle(el).position,
      }),
    ),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
