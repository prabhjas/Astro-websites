import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.tmp-qa');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function shot(origin, path, label) {
  await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(2000);
  const info = await page.evaluate(() => {
    const f = document.querySelector('.elementor-location-footer');
    const section = f?.querySelector('.elementor-section');
    const names = [...document.querySelectorAll('.kzform .kzf1 input')].map((el) => {
      const r = el.getBoundingClientRect();
      return { name: el.name, top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width) };
    });
    const kzf1 = document.querySelector('.kzform .kzf1');
    return {
      footerId: f?.getAttribute('data-elementor-id'),
      footerBg: section ? getComputedStyle(section).backgroundColor : null,
      kzf1Display: kzf1 ? getComputedStyle(kzf1).display : null,
      names,
      nameAligned: names.length >= 2 && names[0].top === names[1].top,
    };
  });
  await page.evaluate(() =>
    document.querySelector('.elementor-location-footer')?.scrollIntoView({ block: 'end' }),
  );
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, `${label}-footer-bottom.png`), fullPage: false });
  const form = await page.$('.kzform');
  if (form) {
    await form.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, `${label}-form-full.png`), fullPage: false });
  }
  return info;
}

const report = {
  live: await shot('https://kinzahr.com', '/industries/audit-accounting/', 'v2-live'),
  local: await shot('http://127.0.0.1:5085', '/industries/audit-accounting/', 'v2-local'),
  localContact: await shot('http://127.0.0.1:5085', '/contact-us/', 'v2-local-contact'),
};
writeFileSync(join(OUT, 'v2-verify.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
