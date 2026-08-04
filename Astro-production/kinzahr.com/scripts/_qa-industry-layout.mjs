import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.tmp-qa');
mkdirSync(OUT, { recursive: true });
const paths = [
  '/industries/construction-and-engineering/',
  '/industries/logistics-transport-and-warehousing/',
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

async function dig(origin, path, label) {
  const errors = [];
  const fails = [];
  page.removeAllListeners('pageerror');
  page.removeAllListeners('console');
  page.removeAllListeners('requestfailed');
  page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 160)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text().slice(0, 160));
  });
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (/google|facebook|hotjar|mouseflow|analytics/i.test(u)) return;
    fails.push(u.replace(origin, '').slice(0, 120));
  });

  const res = await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 120000 }).catch(() => null);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: join(OUT, `${label}-hero.png`), fullPage: false });

  const data = await page.evaluate(() => {
    const hero =
      document.querySelector('.elementor-location-header + *') ||
      document.querySelector('[data-elementor-type="wp-page"] .e-con.e-parent, .elementor-section.elementor-top-section');
    // Find the construction heading
    const h = [...document.querySelectorAll('h1,h2,h3,.elementor-heading-title')].find((el) =>
      /construction|logistics|warehousing|recruitment agency/i.test(el.textContent || ''),
    );
    const section = h?.closest('.e-con.e-parent, .elementor-section, .elementor-top-section, .e-con');
    const cols = section
      ? [...section.querySelectorAll(':scope > .e-con, :scope > .elementor-container > .elementor-column, :scope > .e-con-inner > .e-con')].map(
          (c) => {
            const r = c.getBoundingClientRect();
            const bg = getComputedStyle(c).backgroundImage;
            const imgs = [...c.querySelectorAll('img')].map((img) => ({
              src: (img.currentSrc || img.src || '').split('/').pop(),
              w: Math.round(img.getBoundingClientRect().width),
              h: Math.round(img.getBoundingClientRect().height),
              natural: img.naturalWidth,
              display: getComputedStyle(img).display,
              complete: img.complete,
            }));
            return {
              id: c.getAttribute('data-id'),
              w: Math.round(r.width),
              h: Math.round(r.height),
              left: Math.round(r.left),
              bg: bg?.slice(0, 100),
              bgColor: getComputedStyle(c).backgroundColor,
              imgs,
              text: c.textContent.trim().slice(0, 80),
            };
          },
        )
      : [];

    // Also check first page parent containers
    const parents = [...document.querySelectorAll('[data-elementor-type="wp-page"] > .elementor > .e-con.e-parent, .elementor-22167 > .e-con.e-parent, [data-elementor-type="wp-page"] .e-con.e-parent')]
      .slice(0, 4)
      .map((c) => {
        const r = c.getBoundingClientRect();
        return {
          id: c.getAttribute('data-id'),
          w: Math.round(r.width),
          h: Math.round(r.height),
          left: Math.round(r.left),
          bg: getComputedStyle(c).backgroundImage?.slice(0, 140),
          bgColor: getComputedStyle(c).backgroundColor,
          classes: c.className.slice(0, 100),
        };
      });

    const brokenImgs = [...document.querySelectorAll('img')].filter((img) => !img.complete || img.naturalWidth === 0).slice(0, 10).map((img) => (img.src || '').replace(location.origin, '').slice(0, 100));

    return {
      title: document.title,
      heading: h?.textContent?.trim()?.slice(0, 80),
      headingRect: h && (() => { const r = h.getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left), w: Math.round(r.width) }; })(),
      cols,
      parents,
      brokenImgs,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      pageId: document.querySelector('[data-elementor-type="wp-page"]')?.getAttribute('data-elementor-id'),
    };
  });

  return {
    status: res?.status() || 0,
    data,
    errors: [...new Set(errors)].slice(0, 12),
    fails: [...new Set(fails)].slice(0, 15),
  };
}

const report = {};
for (const path of paths) {
  const slug = path.replace(/\//g, '_');
  report[`live${slug}`] = await dig('https://kinzahr.com', path, `live${slug}`);
  report[`local${slug}`] = await dig('http://127.0.0.1:5085', path, `local${slug}`);
}
writeFileSync(join(OUT, 'industry-layout-qa.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
