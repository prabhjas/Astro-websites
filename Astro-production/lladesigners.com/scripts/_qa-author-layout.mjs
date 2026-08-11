import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const LOCAL = 'http://127.0.0.1:5112';
const LIVE = 'https://lladesigners.com';

async function probe(base, path, label) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const res = await page.goto(base + path, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(2500);
  const info = await page.evaluate(() => {
    const main = document.querySelector('#content, main, .site-content, .elementor') || document.body;
    const sections = [...document.querySelectorAll('.elementor-section, .e-con, [data-elementor-type]')]
      .slice(0, 20)
      .map((el) => ({
        id: el.getAttribute('data-id') || el.getAttribute('data-elementor-type') || '',
        cls: (el.className || '').toString().slice(0, 120),
        h: Math.round(el.getBoundingClientRect().height),
        text: el.innerText?.trim().slice(0, 100).replace(/\s+/g, ' '),
      }));
    const cards = document.querySelectorAll(
      '.elementor-post, .ecs-post, .post-wrap, article, .elementor-portfolio-item, .e-loop-item',
    ).length;
    const heroes = [...document.querySelectorAll('h1,h2,.elementor-heading-title')]
      .slice(0, 8)
      .map((el) => el.textContent.trim().slice(0, 90));
    const imgs = [...document.querySelectorAll('img')]
      .filter((i) => i.getBoundingClientRect().height > 40)
      .slice(0, 8)
      .map((i) => ({ src: (i.currentSrc || i.src || '').split('?')[0].replace(location.origin, ''), w: Math.round(i.getBoundingClientRect().width), h: Math.round(i.getBoundingClientRect().height) }));
    return {
      title: document.title.slice(0, 100),
      bodyClass: document.body.className.slice(0, 160),
      heroes,
      cards,
      imgs,
      sections: sections.filter((s) => s.h > 20).slice(0, 12),
      hasProfile: !!document.querySelector('.main-auth, .astro-author-profile, .astro-author-hero, .elementor-author-box'),
      htmlSnippet: document.querySelector('[data-elementor-type="archive"], [data-elementor-type="wp-page"], .elementor')?.innerHTML?.slice(0, 500),
    };
  });
  await page.screenshot({
    path: `D:/Astro-websites/Astro-production/lladesigners.com/scripts/_author-${label}.png`,
    fullPage: false,
  });
  // scroll mid
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(300);
  await page.screenshot({
    path: `D:/Astro-websites/Astro-production/lladesigners.com/scripts/_author-${label}-mid.png`,
    fullPage: false,
  });
  await browser.close();
  return { path, status: res?.status(), info };
}

const out = {
  liveIndex: await probe(LIVE, '/author/', 'live-index'),
  localIndex: await probe(LOCAL, '/author/', 'local-index'),
  liveSingle: await probe(LIVE, '/author/lana-vasiljeva/', 'live-single'),
  localSingle: await probe(LOCAL, '/author/lana-vasiljeva/', 'local-single'),
};
writeFileSync(
  'D:/Astro-websites/Astro-production/lladesigners.com/scripts/_author-compare.json',
  JSON.stringify(out, null, 2),
);
console.log(JSON.stringify(out, null, 2));
