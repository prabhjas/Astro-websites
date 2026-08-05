import fs from 'node:fs';
import { load } from 'cheerio';
import { chromium } from 'playwright';
import path from 'node:path';

const live = load(fs.readFileSync(process.env.TEMP + '/cf-live-cat-biz.html', 'utf8'));
const loc = load(fs.readFileSync(process.env.TEMP + '/cf-loc-cat-biz.html', 'utf8'));

function summarize($, label) {
  const title = $('h1, .elementor-page-title, .elementor-heading-title').first().text().trim().slice(0, 80);
  const articles = $('.ecs-posts article, article.elementor-post, .elementor-posts-article, main article').length;
  const loops = $('[data-elementor-id]').map((_, el) => $(el).attr('data-elementor-id')).get().slice(0, 20);
  const loopIds = [...new Set($('.elementor[data-elementor-id], [data-elementor-type="loop"]').map((_, el) => $(el).attr('data-elementor-id') || $(el).attr('data-elementor-type')).get())];
  const widgets = $('.elementor-widget').map((_, el) => $(el).attr('data-widget_type')).get().slice(0, 30);
  const postWidgets = $('.ecs-posts .elementor-widget, article .elementor-widget').map((_, el) => $(el).attr('data-widget_type')).get().slice(0, 20);
  const firstCard = $('.ecs-posts article, article.elementor-post').first();
  const cardWidgets = firstCard.find('[data-widget_type]').map((_, el) => $(el).attr('data-widget_type')).get();
  const cardHtmlLen = (firstCard.html() || '').length;
  const hasImg = firstCard.find('img').length > 0;
  const pagination = $('.elementor-pagination, .page-numbers, nav.pagination').text().replace(/\s+/g, ' ').trim().slice(0, 60);
  const bodyClass = $('body').attr('class') || '';
  const template = $('[data-elementor-type="archive"], [data-elementor-type="cpt-archive"]').attr('data-elementor-id')
    || $('.elementor[data-elementor-type]').first().attr('data-elementor-id');
  console.log('\n===', label, '===');
  console.log({ title, articles, loopIds, cardWidgets, hasImg, cardHtmlLen, pagination, template, bodyClass: bodyClass.slice(0, 120) });
  if (firstCard.length) {
    console.log('first title:', firstCard.find('.elementor-heading-title, h2, h3').first().text().trim().slice(0, 70));
    console.log('first meta:', firstCard.find('.elementor-post-info, .elementor-icon-list-items').first().text().replace(/\s+/g, ' ').trim().slice(0, 100));
  }
  // section ids in main content
  const sections = $('main .elementor-element[data-element_type="section"], .elementor-location-archive .elementor-element[data-element_type="section"], .elementor-493 .elementor-element[data-element_type="section"]').map((_, el) => $(el).attr('data-id')).get();
  console.log('section ids sample', sections.slice(0, 12));
}

summarize(live, 'LIVE');
summarize(loc, 'LOCAL');

// Diff key structural markers
for (const sel of [
  '.elementor-element-0215441',
  '.elementor-element-eb26798',
  '.elementor-element-b877973',
  '.ecs-posts',
  '.elementor-545',
  '.elementor-244',
  '[data-elementor-id="545"]',
  '.elementor-posts-container',
  '.elementor-pagination',
]) {
  console.log(sel, 'live', live(sel).length, 'local', loc(sel).length);
}

const outDir = path.join(process.env.TEMP || '/tmp', 'cf-cat-shots');
fs.mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });

async function shot(url, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, `${label}-full.png`), fullPage: false });
  const grid = page.locator('.ecs-posts, .elementor-posts-container, main .elementor-loop-container').first();
  if (await grid.count()) await grid.screenshot({ path: path.join(outDir, `${label}-grid.png`) });
  const styles = await page.evaluate(() => {
    const art = document.querySelector('.ecs-posts article, article.elementor-post, .elementor-post');
    if (!art) return { error: 'no article' };
    const wrap = art.querySelector('.elementor-widget-wrap');
    const img = art.querySelector('img');
    const title = art.querySelector('.elementor-heading-title, h2, h3');
    const btn = art.querySelector('.elementor-button');
    const meta = art.querySelector('.elementor-post-info, .elementor-icon-list-items');
    const r = (el) => el ? { t: Math.round(el.getBoundingClientRect().top), l: Math.round(el.getBoundingClientRect().left), w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
    return {
      cardCount: document.querySelectorAll('.ecs-posts article, article.elementor-post').length,
      wrapFlex: wrap ? getComputedStyle(wrap).flexDirection : null,
      hasImg: !!img,
      img: r(img),
      title: { text: title?.textContent?.trim()?.slice(0, 50), ...r(title), align: title ? getComputedStyle(title).textAlign : null, size: title ? getComputedStyle(title).fontSize : null },
      meta: { text: meta?.textContent?.replace(/\s+/g, ' ').trim()?.slice(0, 80), ...r(meta) },
      btn: { text: btn?.textContent?.trim(), ...r(btn) },
      pageH1: document.querySelector('h1, .elementor-page-title')?.textContent?.trim()?.slice(0, 80),
    };
  });
  fs.writeFileSync(path.join(outDir, `${label}.json`), JSON.stringify(styles, null, 2));
  console.log('\nSHOT', label, JSON.stringify(styles, null, 2));
  await page.close();
}

await shot('https://connectfreelance.ae/category/business/', 'live');
await shot('http://127.0.0.1:5094/category/business/', 'local');
await browser.close();
console.log('OUT', outDir);
