import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

mkdirSync('scripts/_parity-shots', { recursive: true });

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';
const pages = [
  '/',
  '/services/',
  '/about-us/',
  '/portfolio/',
  '/our-blogs/',
  '/contact-us/',
  '/interior-design/',
  '/importance-of-lighting-in-interior-design/',
];

async function shot(base, label, path) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const failed = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && !/wp-json\/contact-form-7/.test(r.url())) {
      failed.push(r.status() + ' ' + r.url().split('?')[0].replace(base, ''));
    }
  });
  await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);
  const safe = path === '/' ? 'home' : path.replace(/\//g, '').slice(0, 40);
  await page.screenshot({ path: `scripts/_parity-shots/final-${label}-${safe}.png` });

  const info = await page.evaluate(() => {
    const header = document.querySelector('.elementor-location-header');
    const logo = header?.querySelector('img');
    const lr = logo?.getBoundingClientRect();
    const social = [...(header?.querySelectorAll('.elementor-social-icon, .fab') || [])].map((el) => ({
      cls: el.className.toString().slice(0, 50),
      w: Math.round(el.getBoundingClientRect().width),
      y: Math.round(el.getBoundingClientRect().y),
    }));
    const form = document.querySelector('form.wpcf7-form');
    const fr = form?.getBoundingClientRect();
    return {
      title: document.title.slice(0, 80),
      headerId: header?.className.match(/elementor-(\d+)/)?.[1],
      logo: logo ? { w: Math.round(lr.width), h: Math.round(lr.height), src: (logo.currentSrc || logo.src).split('/').pop() } : null,
      social: social.slice(0, 8),
      form: form
        ? {
            h: Math.round(fr.height),
            fields: [...form.querySelectorAll('input:not([type=hidden]),textarea')]
              .filter((i) => i.getBoundingClientRect().height > 0)
              .map((i) => i.name || i.type),
          }
        : null,
      swiper: !!document.querySelector('#top-banner .swiper')?.swiper,
      loadMore: !!document.querySelector('#loadMore'),
    };
  });

  if (path === '/our-blogs/') {
    const before = await page.evaluate(
      () => [...document.querySelectorAll('.post-wrap')].filter((el) => getComputedStyle(el).display !== 'none').length,
    );
    await page.locator('#loadMore').click({ force: true });
    await page.waitForTimeout(900);
    const after = await page.evaluate(
      () => [...document.querySelectorAll('.post-wrap')].filter((el) => getComputedStyle(el).display !== 'none').length,
    );
    info.loadMoreResult = `${before}->${after}`;
  }

  await browser.close();
  return { path, info, failed: [...new Set(failed)].slice(0, 15) };
}

const results = [];
for (const path of pages) {
  const local = await shot(LOCAL, 'local', path);
  results.push({ path, local });
}
console.log(JSON.stringify(results, null, 2));
