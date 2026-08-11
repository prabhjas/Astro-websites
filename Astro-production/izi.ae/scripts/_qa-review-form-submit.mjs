import { chromium } from 'playwright';

const PATH =
  '/review-form/?Model=Hyundai+Accent+2024&post-id=1507&rentlenght=6-months&finalprice=2400&filterlocation=United-Arab-Emirates&from_date=2026-08-28&from_time=09:26&to_date=2027-02-28&to_time=06:26';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
await page.goto('http://127.0.0.1:5121' + PATH, { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(3000);

const layout = await page.evaluate(() => ({
  kinza: !!document.getElementById('kinza-form-fix-css'),
  message: !!document.querySelector('[name="your-message"], .astro-message-row'),
  formH: Math.round(document.querySelector('form.wpcf7-form').getBoundingClientRect().height),
  rent: document.querySelector('[name="rentlenght"]')?.value,
  Model: document.querySelector('[name="Model"]')?.value,
}));

await page.fill('[name="text-453"]', 'Test');
await page.fill('[name="text-454"]', 'User');
await page.fill('[name="your-email"]', `review-${Date.now()}@example.com`);
await page.fill('[name="phonetext-558"]', '501234567');

const wait = page.waitForResponse(
  (r) => r.url().includes('/api/contact') && r.request().method() === 'POST',
  { timeout: 20000 },
);
await page.click('input.wpcf7-submit');
const resp = await wait;
const body = resp.request().postDataJSON();
const json = await resp.json().catch(async () => ({ raw: await resp.text() }));
const ui = await page.locator('.wpcf7-response-output').textContent();

console.log(
  JSON.stringify(
    {
      layout,
      status: resp.status(),
      success: json.success,
      submissionId: json.submissionId,
      errors: json.errors || json.message,
      payloadKeys: Object.keys(body || {}),
      name: body?.name,
      email: body?.email,
      phone: body?.phone || body?.['phonetext-558'] || body?.full_number,
      ui: (ui || '').trim(),
    },
    null,
    2,
  ),
);

await browser.close();
process.exitCode = resp.status() === 200 && json.success ? 0 : 1;
