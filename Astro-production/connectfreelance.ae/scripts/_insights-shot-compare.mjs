import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const outDir = path.join(process.env.TEMP || '/tmp', 'cf-insights-shots');
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});

async function capture(label, url) {
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  // dismiss cookie if any
  try {
    await page.locator('button:has-text("Accept"), .cookie-accept, #cookie-law-info-bar a').first().click({ timeout: 2000 });
  } catch {}
  await page.waitForTimeout(1500);

  const grid = page.locator('.elementor-element-0215441 .ecs-posts, .ecs-posts.elementor-grid').first();
  await grid.waitFor({ timeout: 15000 });

  const fullPath = path.join(outDir, `${label}-full.png`);
  const gridPath = path.join(outDir, `${label}-grid.png`);
  const cardPath = path.join(outDir, `${label}-card0.png`);

  await page.screenshot({ path: fullPath, fullPage: false });
  await grid.screenshot({ path: gridPath });
  const card = page.locator('.ecs-posts article, .ecs-posts .elementor-post').first();
  await card.screenshot({ path: cardPath });

  // computed styles for first card pieces
  const styles = await page.evaluate(() => {
    const art = document.querySelector('.ecs-posts article, .ecs-posts .elementor-post');
    if (!art) return null;
    const title = art.querySelector('.elementor-element-fbe94b3 .elementor-heading-title, h1, h2, h3');
    const meta = art.querySelector('.elementor-element-46364c0, .elementor-post-info');
    const btn = art.querySelector('.elementor-element-808fe6c .elementor-button, .elementor-button');
    const img = art.querySelector('img');
    const wrap = art.querySelector('.elementor-widget-wrap');
    const gridEl = document.querySelector('.elementor-element-0215441, .ecs-posts')?.closest('.elementor-element') || document.querySelector('.elementor-element-0215441');
    const cs = (el) => {
      if (!el) return null;
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        font: s.fontFamily,
        size: s.fontSize,
        weight: s.fontWeight,
        transform: s.textTransform,
        color: s.color,
        lineHeight: s.lineHeight,
        display: s.display,
        flexDir: s.flexDirection,
        justify: s.justifyContent,
        alignSelf: s.alignSelf,
        width: Math.round(r.width),
        height: Math.round(r.height),
        top: Math.round(r.top),
        left: Math.round(r.left),
        marginTop: s.marginTop,
        padding: s.padding,
      };
    };
    const gcs = gridEl ? getComputedStyle(gridEl) : null;
    return {
      article: cs(art),
      title: { text: title?.textContent?.trim()?.slice(0, 60), ...cs(title) },
      meta: { text: meta?.textContent?.replace(/\s+/g, ' ').trim()?.slice(0, 80), ...cs(meta) },
      btn: { text: btn?.textContent?.trim(), ...cs(btn) },
      img: { src: img?.currentSrc || img?.src, naturalW: img?.naturalWidth, naturalH: img?.naturalHeight, ...cs(img) },
      wrap: cs(wrap),
      gridGaps: gcs
        ? {
            row: gcs.getPropertyValue('--grid-row-gap'),
            col: gcs.getPropertyValue('--grid-column-gap'),
            display: gcs.display,
          }
        : null,
      fontsLoaded: document.fonts ? [...document.fonts].filter((f) => /lexend|kanit|inter/i.test(f.family)).map((f) => `${f.family}:${f.status}`) : [],
    };
  });

  fs.writeFileSync(path.join(outDir, `${label}-styles.json`), JSON.stringify(styles, null, 2));
  console.log(label, 'saved', fullPath);
  console.log(JSON.stringify(styles, null, 2));
  await page.close();
}

await capture('live', 'https://connectfreelance.ae/insights/');
await capture('local', 'http://127.0.0.1:5094/insights/');
await browser.close();
console.log('OUT', outDir);
