import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const logs = [];
page.on('console', (msg) => logs.push(['console', msg.type(), msg.text().slice(0, 300)]));
page.on('pageerror', (err) => logs.push(['pageerror', err.message]));
const api = [];
page.on('request', (req) => {
  if (req.url().includes('/api/contact')) api.push({ method: req.method(), body: req.postData()?.slice(0, 400) });
});
page.on('response', async (res) => {
  if (res.url().includes('/api/contact')) api.push({ status: res.status(), body: (await res.text().catch(() => '')).slice(0, 300) });
});

await page.goto('http://127.0.0.1:5120/contact-us/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(5000);

const scriptOk = await page.evaluate(async () => {
  const src = document.querySelector('script[src*="astro-mirror-fixes"]')?.src;
  try {
    const r = await fetch(src);
    const t = await r.text();
    return { src, status: r.status, hasSubmit: t.includes('submitLegacyContactForm'), hasListener: t.includes("addEventListener(\n      'submit'") || t.includes("addEventListener('submit'") || t.includes('addEventListener(\n  \'submit\''), len: t.length, hasMobile: t.includes('ensureMobileDropdownToggles') };
  } catch (e) {
    return { src, err: String(e) };
  }
});
console.log('script', scriptOk);

const prep = await page.evaluate(() => {
  const form = document.querySelector('form.wpcf7-form');
  form.querySelector('[name="full-name"]').value = 'Tabish QA';
  form.querySelector('[name="your-email"]').value = 'tabish.qa@example.com';
  const phone = form.querySelector('.wpcf7-phonetext');
  phone.value = '501234567';
  phone.dispatchEvent(new Event('input', { bubbles: true }));
  const msg = form.querySelector('[name="your-message"]');
  if (msg) msg.value = 'Browser submit test for Pipedrive';
  // clear honeypots
  form.querySelectorAll('input[name="alt_s"], input[name="ohlfmz2940"]').forEach((el) => {
    el.value = '';
  });
  return {
    honeypot: form.querySelector('[name="ohlfmz2940"]')?.value,
    alt: form.querySelector('[name="alt_s"]')?.value,
    listenersHint: !!form.onsubmit,
  };
});
console.log('prep', prep);

// Use requestSubmit which fires submit event
const submitResult = await page.evaluate(() => {
  return new Promise((resolve) => {
    const form = document.querySelector('form.wpcf7-form');
    let sawSubmit = false;
    const onSubmit = (e) => {
      sawSubmit = true;
      // don't resolve yet; let handlers run
    };
    form.addEventListener('submit', onSubmit, true);
    try {
      if (typeof form.requestSubmit === 'function') form.requestSubmit();
      else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    } catch (e) {
      resolve({ error: String(e) });
      return;
    }
    setTimeout(() => {
      const out = form.querySelector('.wpcf7-response-output');
      resolve({
        sawSubmit,
        defaultPrevented: true,
        formClass: form.className,
        output: out?.textContent?.trim(),
        outputClass: out?.className,
        errors: [...form.querySelectorAll('.astro-field-error')].map((el) => el.name || el.className),
        submitting: form.__astroSubmitting,
        tip: form.querySelector('.astro-experience-tip, .wpcf7-not-valid-tip')?.textContent,
      });
    }, 2500);
  });
});
console.log('submitResult', submitResult);
console.log('api', api);
console.log('logs', logs.slice(-30));
await page.screenshot({ path: 'scripts/_form-debug.png' });
await browser.close();
