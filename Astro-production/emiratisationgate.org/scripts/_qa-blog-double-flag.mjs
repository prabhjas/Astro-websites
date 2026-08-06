/**
 * QA: single blog post sidebar — flag present, no orphan between name/email after scroll.
 */
const url = process.argv[2] || 'http://127.0.0.1:5105/types-of-leaves-in-the-uae/';

const { chromium } = await import('playwright');
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(2500);

async function probe(label) {
  const data = await page.evaluate(() => {
    const form =
      document.querySelector('.blog-form form.wpcf7-form') ||
      document.querySelector('.elementor-element-f006bfc form') ||
      document.querySelector('form.wpcf7-form');
    if (!form) return { form: false };
    const wraps = [...form.querySelectorAll('.intl-tel-input')];
    const orphans = wraps.filter(
      (w) => !w.querySelector('.wpcf7-phonetext, input.cg-phone-input, input[type="tel"]'),
    );
    const phones = [...form.querySelectorAll('.wpcf7-phonetext')];
    const good = phones.map((p) => {
      const wrap = p.closest('.intl-tel-input');
      const flag = wrap && wrap.querySelector('.iti-flag');
      const dial = wrap && wrap.querySelector('.selected-dial-code');
      const fr = flag && flag.getBoundingClientRect();
      return {
        hasWrap: !!wrap,
        dial: dial ? dial.textContent.trim() : '',
        flagW: fr ? Math.round(fr.width) : 0,
        flagVisible: !!(fr && fr.width > 0 && fr.height > 0),
      };
    });
    // Standalone selected-dial-code nodes not beside a phone
    const strayFlags = [...form.querySelectorAll('.flag-container, .selected-dial-code')].filter(
      (el) => {
        const wrap = el.closest('.intl-tel-input');
        return !wrap || !wrap.querySelector('.wpcf7-phonetext, input.cg-phone-input');
      },
    );
    const mirror = (document.querySelector('script[src*="astro-mirror-fixes"]') || {}).src || '';
    return {
      form: true,
      mirror,
      wrapCount: wraps.length,
      orphanWraps: orphans.length,
      strayFlags: strayFlags.length,
      phoneCount: phones.length,
      phones: good,
      fieldOrder: [...form.querySelectorAll('input,textarea,.intl-tel-input')].map((el) => {
        if (el.classList.contains('intl-tel-input')) {
          const hasPhone = !!el.querySelector('.wpcf7-phonetext');
          return hasPhone ? 'iti+phone' : 'iti-ORPHAN';
        }
        return el.name || el.placeholder || el.type;
      }),
    };
  });
  console.log(label, JSON.stringify(data, null, 2));
  return data;
}

const before = await probe('before-scroll');
await page.evaluate(async () => {
  for (let y = 0; y <= 2400; y += 200) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 800);
});
await page.waitForTimeout(2000);
const after = await probe('after-scroll');

await browser.close();

const ok =
  after.form &&
  after.orphanWraps === 0 &&
  after.strayFlags === 0 &&
  after.phones.every((p) => p.hasWrap && p.flagVisible && p.dial) &&
  !after.fieldOrder.includes('iti-ORPHAN');

console.log(ok ? 'PASS' : 'FAIL');
process.exit(ok ? 0 : 2);
