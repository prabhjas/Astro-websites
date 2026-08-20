import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const urls = [
  ['http://127.0.0.1:5120/', 'home'],
  ['http://127.0.0.1:5120/contact-us/', 'contact'],
  ['http://127.0.0.1:5120/accounting-finance-outsourcing-guide-uae/', 'post'],
  ['http://127.0.0.1:5120/payroll-outsourcing/', 'payroll'],
];

for (const [url, label] of urls) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const api = [];
  page.on('response', async (r) => {
    if (r.url().includes('/api/contact/')) {
      api.push({ status: r.status(), body: (await r.text().catch(() => '')).slice(0, 180) });
    }
  });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(4000);

  const meta = await page.evaluate(() => {
    const forms = [...document.querySelectorAll('form.wpcf7-form')];
    return forms.map((f, i) => {
      const r = f.getBoundingClientRect();
      return {
        i,
        visible: r.height > 40 && r.width > 40,
        top: Math.round(r.top),
        fields: [...f.querySelectorAll('input:not([type=hidden]),textarea,button')].map((el) => ({
          name: el.name,
          type: el.type,
          ph: (el.getAttribute('placeholder') || '').slice(0, 30),
          required: el.getAttribute('aria-required'),
        })),
      };
    });
  });
  console.log('\n====', label, '====');
  console.log(JSON.stringify(meta, null, 2));

  const form = page.locator('form.wpcf7-form').filter({ has: page.locator('button#submit, button.inside_button, [type=submit]') }).first();
  if ((await form.count()) === 0) {
    console.log('no form');
    await page.close();
    continue;
  }

  // Fill whatever exists
  const name = form.locator('input[name="full-name"], input[name="your-name"]').first();
  if (await name.count()) await name.fill('Tabish QA');
  const company = form.locator('input[name="company-name"], input[placeholder*="Company" i]').first();
  if (await company.count()) await company.fill('QA Company LLC');
  const email = form.locator('input[type=email], input[name="your-email"]').first();
  if (await email.count()) await email.fill(`tabish.${label}@example.com`);
  const phone = form.locator('input.wpcf7-phonetext, input[name^="phonetext"]').first();
  if (await phone.count()) await phone.fill('501234567');
  const msg = form.locator('textarea[name="your-message"], textarea[name="message"]').first();
  if (await msg.count()) await msg.fill('Multi-page form Pipedrive test');

  await form.locator('button#submit, button.inside_button').first().click();
  await page.waitForTimeout(3500);

  const out = await page.evaluate(() => {
    const f = document.querySelector('form.wpcf7-form.sent, form.wpcf7-form');
    return {
      cls: f?.className,
      msg: f?.querySelector('.wpcf7-response-output')?.textContent?.trim(),
      errors: [...document.querySelectorAll('.astro-field-error')].map((e) => e.name || e.getAttribute('placeholder')),
      tips: [...document.querySelectorAll('.wpcf7-not-valid-tip, .astro-experience-tip')].map((t) => t.textContent?.trim()),
    };
  });
  console.log('out', out);
  console.log('api', api);
  await page.screenshot({ path: `scripts/_form-${label}-submit.png` });
  await page.close();
}

// Latest pipedrive
const leads = await (
  await fetch('http://127.0.0.1:5120/api/internal/leads/', {
    headers: { Authorization: 'Bearer local-fleet-test-secret' },
  })
).json();
const n = leads.leads?.[0];
console.log('\nlatest lead', {
  delivery: n?.deliveryStatus,
  person: n?.pipedrivePersonId,
  lead: n?.pipedriveLeadId,
  email: n?.payload?.email,
  error: n?.lastErrorMessage,
});

await browser.close();
