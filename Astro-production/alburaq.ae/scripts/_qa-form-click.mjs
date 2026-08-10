import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const api = [];
page.on('request', (r) => {
  if (r.url().includes('/api/contact')) api.push({ method: r.method(), body: r.postData()?.slice(0, 250) });
});
page.on('response', async (r) => {
  if (r.url().includes('/api/contact')) {
    api.push({ status: r.status(), body: (await r.text().catch(() => '')).slice(0, 200) });
  }
});
page.on('console', (m) => {
  if (m.type() === 'error' || /wpa|honeypot|submit|contact/i.test(m.text())) {
    console.log('console', m.type(), m.text().slice(0, 200));
  }
});

await page.goto('http://127.0.0.1:5120/contact-us/', { waitUntil: 'domcontentloaded', timeout: 90000 });
await page.waitForTimeout(4500);

const wpa = await page.evaluate(() => ({
  wpaExists: typeof window.wpa_field_info !== 'undefined' || !!document.querySelector('#wpa, .wpa, input[name="wpa_field"], #alt_s'),
  alt: document.querySelector('#alt_s')?.outerHTML?.slice(0, 150),
  ohl: document.querySelector('[name="ohlfmz2940"]')?.outerHTML?.slice(0, 200),
  gclidVisible: (() => {
    const el = document.querySelector('#testgclid');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height, top: r.top, display: getComputedStyle(el).display };
  })(),
  countryVisible: (() => {
    const el = document.querySelector('[name="countrytext-787"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: r.width, h: r.height, top: Math.round(r.top), display: getComputedStyle(el).display };
  })(),
}));
console.log('wpa/meta', wpa);

await page.locator('input[name="full-name"]').fill('Tabish QA');
await page.locator('input[name="your-email"]').fill('tabish.click@example.com');
await page.locator('input.wpcf7-phonetext').fill('501234567');
await page.locator('textarea[name="your-message"]').fill('Button click Pipedrive test');

await page.locator('button#submit').click();
await page.waitForTimeout(3500);

const out = await page.evaluate(() => ({
  cls: document.querySelector('form.wpcf7-form')?.className,
  msg: document.querySelector('.wpcf7-response-output')?.textContent?.trim(),
  errors: [...document.querySelectorAll('.astro-field-error')].map((e) => e.name || e.className),
}));
console.log('result', out);
console.log('api', api);

// Check pipedrive
if (api.some((x) => x.status === 200)) {
  await page.waitForTimeout(1000);
  const leads = await (
    await page.request.get('http://127.0.0.1:5120/api/internal/leads/', {
      headers: { Authorization: 'Bearer local-fleet-test-secret' },
    })
  ).json();
  const n = leads.leads?.[0];
  console.log('pipedrive', {
    delivery: n?.deliveryStatus,
    person: n?.pipedrivePersonId,
    lead: n?.pipedriveLeadId,
    email: n?.payload?.email,
    error: n?.lastErrorMessage,
  });
}

await page.screenshot({ path: 'scripts/_form-click.png' });
await browser.close();
