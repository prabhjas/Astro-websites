/**
 * Harder QA: trigger Elementor sticky if present; count orphans in sidebar + page.
 */
const url = process.argv[2] || 'http://127.0.0.1:5105/types-of-leaves-in-the-uae/';
const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);

async function snap(label) {
  const data = await page.evaluate(() => {
    const allWraps = [...document.querySelectorAll('.intl-tel-input')];
    const orphans = allWraps.filter(
      (w) => !w.querySelector('.wpcf7-phonetext, input.cg-phone-input, input[type="tel"]'),
    );
    const sidebar =
      document.querySelector('.elementor-element-f006bfc') ||
      document.querySelector('.blog-form') ||
      document.querySelector('.elementor-element-0933e6e');
    const stickyActive = !!(
      sidebar &&
      (sidebar.classList.contains('elementor-sticky--active') ||
        getComputedStyle(sidebar).position === 'fixed' ||
        getComputedStyle(sidebar).position === 'sticky')
    );
    return {
      mirror: (document.querySelector('script[src*="astro-mirror-fixes"]') || {}).src || '',
      wrapCount: allWraps.length,
      orphanCount: orphans.length,
      orphanHTML: orphans.map((o) => o.outerHTML.slice(0, 180)),
      stickyActive,
      dialCodes: [...document.querySelectorAll('.selected-dial-code')].map((d) => ({
        text: d.textContent.trim(),
        orphan: !d.closest('.intl-tel-input')?.querySelector('.wpcf7-phonetext'),
      })),
    };
  });
  console.log(label, JSON.stringify(data, null, 2));
  return data;
}

await snap('initial');

// Scroll to engage sticky sidebar
for (const y of [400, 800, 1200, 1600, 2000, 2400, 2800, 1200]) {
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(400);
}
await page.waitForTimeout(1500);
const after = await snap('after-sticky-scroll');

// Force sticky classes if Elementor would
await page.evaluate(() => {
  const el =
    document.querySelector('.elementor-element-f006bfc') ||
    document.querySelector('.blog-form');
  if (el) {
    el.classList.add('elementor-sticky', 'elementor-sticky--active');
    // Simulate sticky clone pattern Elementor sometimes uses
    const form = el.querySelector('form');
    if (form && !document.querySelector('[data-astro-qa-fake-orphan]')) {
      const fake = document.createElement('div');
      fake.className = 'intl-tel-input allow-dropdown separate-dial-code';
      fake.setAttribute('data-astro-qa-fake-orphan', '1');
      fake.innerHTML =
        '<div class="flag-container"><div class="selected-flag"><div class="iti-flag pk"></div><div class="selected-dial-code">+92</div></div></div>';
      const name = form.querySelector('[name="your-name"]');
      if (name && name.parentElement) {
        name.parentElement.insertAdjacentElement('afterend', fake);
      }
    }
  }
});
await page.waitForTimeout(1200);
const cleaned = await snap('after-injected-orphan');

await browser.close();
const ok = after.orphanCount === 0 && cleaned.orphanCount === 0;
console.log(ok ? 'PASS' : 'FAIL', { afterOrphans: after.orphanCount, cleanedOrphans: cleaned.orphanCount });
process.exit(ok ? 0 : 2);
