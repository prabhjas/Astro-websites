import { chromium } from 'playwright';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';

async function shot(base, path, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const res = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => ({
    title: document.title,
    heroes: [...document.querySelectorAll('h1,h2')].slice(0, 6).map((el) => el.textContent.trim().slice(0, 80)),
    authorCards: document.querySelectorAll('.elementor-element-2f15033 .elementor-column, .astro-author-card').length,
    profileName: document.querySelector('.elementor-element-137e113 .elementor-heading-title, .elementor-element-a78c16e h2')?.textContent?.trim(),
    profileTitle: document.querySelector('.elementor-element-0c8b2f8 .elementor-heading-title')?.textContent?.trim(),
    profileImg: document.querySelector('.elementor-element-b0b15c5 img')?.currentSrc || document.querySelector('.elementor-element-b0b15c5 img')?.src,
    visiblePosts: [...document.querySelectorAll('.post-wrap')].filter((el) => getComputedStyle(el).display !== 'none').length,
    totalPosts: document.querySelectorAll('.post-wrap').length,
    indexImgs: [...document.querySelectorAll('.elementor-element-2f15033 img')].map((i) => (i.currentSrc || i.src || '').split('/').pop()),
  }));
  await page.screenshot({
    path: `D:/Astro-websites/Astro-production/lladesigners.com/scripts/_fix-${label}.png`,
    fullPage: false,
  });
  await browser.close();
  return { status: res?.status(), info };
}

const out = {
  localIndex: await shot(LOCAL, '/author/', 'local-index'),
  liveIndex: await shot(LIVE, '/author/', 'live-index'),
  localSingle: await shot(LOCAL, '/author/lana-vasiljeva/', 'local-single'),
  liveSingle: await shot(LIVE, '/author/lana-vasiljeva/', 'live-single'),
};
console.log(JSON.stringify(out, null, 2));
