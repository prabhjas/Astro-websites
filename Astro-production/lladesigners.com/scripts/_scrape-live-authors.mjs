import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });
const slugs = ['lana-vasiljeva', 'jermaine-odtujan', 'kate', 'nakul', 'timothy-patridge', 'alexander-m'];
const out = {};
for (const slug of slugs) {
  const page = await browser.newPage();
  const res = await page.goto(`https://lladesigners.com/author/${slug}/`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  if (!res || res.status() >= 400) {
    out[slug] = { status: res?.status() };
    await page.close();
    continue;
  }
  await page.waitForTimeout(1500);
  out[slug] = await page.evaluate(() => {
    const name =
      document.querySelector('.elementor-element-137e113 .elementor-heading-title')?.textContent?.trim() || '';
    const title =
      document.querySelector('.elementor-element-0c8b2f8 .elementor-heading-title')?.textContent?.trim() || '';
    const bio =
      document.querySelector('.elementor-element-3e80f9d .elementor-heading-title')?.textContent?.trim() || '';
    const linkedin =
      document.querySelector('.elementor-element-df5b09c a')?.href ||
      document.querySelector('a[href*="linkedin.com/in"]')?.href ||
      '';
    const avatar =
      document.querySelector('.elementor-element-b0b15c5 img')?.currentSrc ||
      document.querySelector('.elementor-element-b0b15c5 img')?.src ||
      '';
    return { name, title, bio, linkedin, avatar };
  });
  await page.close();
}
writeFileSync('scripts/_live-author-profiles.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
