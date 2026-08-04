/**
 * Compare key pages: HTTP status local vs expected, and sample missing assets.
 */
import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp-qa');
mkdirSync(OUT, { recursive: true });

const PAGES = [
  '/',
  '/about-us/',
  '/contact-us/',
  '/platform/',
  '/services/',
  '/services/permanent-hiring/uae/',
  '/industries/',
  '/blog/',
  '/privacy-policy/',
];

const browser = await chromium.launch({ headless: true });
const results = [];

for (const path of PAGES) {
  const liveUrl = `https://kinzahr.com${path}`;
  const localUrl = `http://127.0.0.1:5085${path}`;
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (/google|facebook|hotjar|doubleclick|mouseflow|analytics/i.test(u)) return;
    if (!u.includes('127.0.0.1') && !u.includes('kinzahr')) return;
    failed.push(u.replace('http://127.0.0.1:5085', '').replace('https://kinzahr.com', ''));
  });
  let localStatus = 0;
  let liveStatus = 0;
  let localTitle = '';
  let liveTitle = '';
  try {
    const lr = await page.goto(liveUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    liveStatus = lr?.status() || 0;
    liveTitle = await page.title();
  } catch (e) {
    liveTitle = String(e.message || e);
  }
  try {
    const r = await page.goto(localUrl, { waitUntil: 'networkidle', timeout: 60000 });
    localStatus = r?.status() || 0;
    localTitle = await page.title();
    await page.waitForTimeout(1500);
    const file = join(OUT, `local${path === '/' ? '-home' : path.replace(/\//g, '-')}.png`.replace(/-+/g, '-'));
    await page.screenshot({ path: file, fullPage: false });
  } catch (e) {
    localTitle = String(e.message || e);
  }
  await page.close();
  results.push({
    path,
    liveStatus,
    localStatus,
    titleMatch: liveTitle === localTitle,
    liveTitle,
    localTitle,
    failedLocalAssets: [...new Set(failed)].slice(0, 15),
  });
  console.log(
    `${path} live=${liveStatus} local=${localStatus} titleMatch=${liveTitle === localTitle} fails=${failed.length}`,
  );
}

await browser.close();
writeFileSync(join(OUT, 'pages-report.json'), JSON.stringify(results, null, 2));
console.log('wrote pages-report.json');
