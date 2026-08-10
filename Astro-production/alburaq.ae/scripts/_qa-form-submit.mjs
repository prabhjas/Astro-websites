import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const pages = [
  ['http://127.0.0.1:5120/contact-us/', 'contact'],
  ['http://127.0.0.1:5120/', 'home'],
];

for (const [url, label] of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const apiCalls = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/contact')) {
      apiCalls.push({ method: req.method(), url: req.url(), post: req.postData()?.slice(0, 200) });
    }
  });
  page.on('response', async (res) => {
    if (res.url().includes('/api/contact')) {
      const text = await res.text().catch(() => '');
      apiCalls.push({ status: res.status(), body: text.slice(0, 300) });
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);

  const meta = await page.evaluate(() => {
    const forms = [...document.querySelectorAll('form.wpcf7-form, form.astro-contact-form, .wpcf7 form')];
    return {
      script: document.querySelector('script[src*="astro-mirror-fixes"]')?.src || null,
      formCount: forms.length,
      forms: forms.map((f) => ({
        action: f.getAttribute('action'),
        class: f.className.slice(0, 80),
        method: f.method,
        inputs: [...f.querySelectorAll('input,textarea,button,select')].map((el) => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          cls: (el.className || '').toString().slice(0, 40),
        })),
        hasSubmit:
          !!f.querySelector('[type=submit], button.inside_button, button#submit, input.wpcf7-submit'),
      })),
      mirrorFn: typeof window.__astroMirrorFixesLoaded,
      bound: !!document.querySelector('form[data-astro-contact-bound], form.wpcf7-form[data-astro-bound]'),
    };
  });
  console.log('\n====', label, '====');
  console.log(JSON.stringify(meta, null, 2));

  if (!meta.formCount) {
    await page.close();
    continue;
  }

  // Fill first form
  const filled = await page.evaluate(() => {
    const form = document.querySelector('form.wpcf7-form') || document.querySelector('form');
    const set = (sel, val) => {
      const el = form.querySelector(sel);
      if (!el) return false;
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    };
    const nameOk =
      set('input[name="your-name"], input[name="fullname"], input.wpcf7-text:not([type=email]):not([type=tel]):not(.wpcf7-phonetext)', 'Tabish QA') ||
      set('input[type=text]:not(.wpcf7-phonetext):not([name*=email])', 'Tabish QA');
    const emailOk = set('input[type=email], input[name*=email], input.wpcf7-email', 'tabish.qa@example.com');
    const phoneOk =
      set('input.wpcf7-phonetext, input[name*=phone], input.cg-phone-input', '501234567') ||
      set('input[type=tel]', '501234567');
    const msgOk =
      set('textarea', 'Please connect Pipedrive from browser form test') ||
      set('input[name*=message]', 'Please connect Pipedrive from browser form test');
    return {
      nameOk,
      emailOk,
      phoneOk,
      msgOk,
      values: [...form.querySelectorAll('input,textarea')].map((el) => ({
        name: el.name,
        type: el.type,
        value: (el.value || '').slice(0, 40),
      })),
    };
  });
  console.log('filled', JSON.stringify(filled, null, 2));

  // Click submit
  const submit = page.locator('form.wpcf7-form button.inside_button, form.wpcf7-form [type=submit], form.wpcf7-form button#submit').first();
  await submit.click({ force: true });
  await page.waitForTimeout(2500);

  const result = await page.evaluate(() => {
    const form = document.querySelector('form.wpcf7-form') || document.querySelector('form');
    const out = form?.querySelector('.wpcf7-response-output');
    return {
      formClass: form?.className,
      output: out?.textContent?.trim(),
      outputClass: out?.className,
      errors: [...document.querySelectorAll('.astro-field-error, .wpcf7-not-valid-tip, .astro-experience-tip')].map(
        (el) => el.textContent?.trim(),
      ),
    };
  });
  console.log('result', result);
  console.log('apiCalls', apiCalls);
  await page.screenshot({ path: `scripts/_form-${label}.png`, fullPage: false });
  await page.close();
}

await browser.close();
