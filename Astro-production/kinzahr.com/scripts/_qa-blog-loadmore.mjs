import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

mkdirSync('.tmp-qa', { recursive: true });
const browser = await chromium.launch({ headless: true });

async function dig(origin, label) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const fails = [];
  page.on('response', (r) => {
    if (r.status() >= 400 && /load-more|wp-content|ecs|blog/i.test(r.url()) && !/gtm|google|facebook/i.test(r.url())) {
      fails.push(`${r.status()} ${r.url().replace(origin, '').slice(0, 120)}`);
    }
  });

  await page.goto(origin + '/blog/', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(3000);

  const before = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('article.elementor-post, .ecs-post-loop, article.ecs-post-loop')];
    const grid = document.querySelector('.ecs-posts.elementor-posts-container, .elementor-posts-container');
    const loadMore = document.querySelector('.ecs-load-more-button, [data-cs-blog-load-more], .elementor-pagination');
    const sample = cards.slice(0, 3).map((c) => {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return {
        w: Math.round(r.width),
        h: Math.round(r.height),
        display: cs.display,
        classes: [...c.classList].filter((x) => /elementor|ecs|post|grid|col/i.test(x)).slice(0, 8),
        title: (c.querySelector('h1,h2,h3,a')?.textContent || '').trim().slice(0, 50),
        hasImg: !!c.querySelector('img'),
        imgW: c.querySelector('img')?.naturalWidth || 0,
      };
    });
    const gridCs = grid ? getComputedStyle(grid) : null;
    return {
      cardCount: cards.length,
      gridDisplay: gridCs?.display,
      gridCols: gridCs?.gridTemplateColumns,
      gridGap: gridCs?.gap || gridCs?.columnGap,
      loadMoreText: loadMore?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 40),
      loadMoreVisible: !!(loadMore && loadMore.getBoundingClientRect().height > 10),
      sample,
      heading: document.querySelector('h1, .elementor-heading-title')?.textContent?.trim()?.slice(0, 60),
    };
  });

  await page.screenshot({ path: join('.tmp-qa', `${label}-blog-before.png`), fullPage: false });

  // Scroll to load more and click
  const btn = page.locator('.ecs-load-more-button a, [data-cs-blog-load-more] a, .ecs-load-more-button button').first();
  let after = null;
  let clickOk = false;
  if (await btn.count()) {
    await btn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await btn.click({ force: true });
    await page.waitForTimeout(2500);
    clickOk = true;
    after = await page.evaluate(() => {
      const cards = [...document.querySelectorAll('article.elementor-post, .ecs-post-loop, article.ecs-post-loop')];
      const grid = document.querySelector('.ecs-posts.elementor-posts-container, .elementor-posts-container');
      const gridCs = grid ? getComputedStyle(grid) : null;
      const newlyAdded = cards.slice(-6).map((c) => {
        const r = c.getBoundingClientRect();
        const cs = getComputedStyle(c);
        const img = c.querySelector('img');
        return {
          w: Math.round(r.width),
          h: Math.round(r.height),
          display: cs.display,
          classes: [...c.classList].slice(0, 10),
          title: (c.querySelector('.elementor-post__title, h2, h3, a')?.textContent || '').trim().slice(0, 55),
          hasImg: !!img,
          imgBroken: !!(img && img.naturalWidth === 0 && img.getBoundingClientRect().width > 10),
          imgSrc: (img?.currentSrc || img?.src || '').replace(location.origin, '').slice(0, 90),
          htmlPreview: c.outerHTML.slice(0, 280),
        };
      });
      // layout consistency: widths of first row vs last row
      const widths = cards.map((c) => Math.round(c.getBoundingClientRect().width));
      const uniqueW = [...new Set(widths)];
      return {
        cardCount: cards.length,
        gridDisplay: gridCs?.display,
        gridCols: gridCs?.gridTemplateColumns,
        uniqueWidths: uniqueW,
        newlyAdded,
        loadMoreHidden: (() => {
          const nav = document.querySelector('.ecs-load-more-button, [data-cs-blog-load-more]');
          if (!nav) return true;
          return nav.hidden || getComputedStyle(nav).display === 'none';
        })(),
      };
    });
    await page.locator('.ecs-posts, .elementor-posts-container').first().scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: join('.tmp-qa', `${label}-blog-after-loadmore.png`), fullPage: false });
    // also screenshot near bottom cards
    if (await page.locator('article.elementor-post, .ecs-post-loop').nth(-1).count()) {
      await page.locator('article.elementor-post, .ecs-post-loop').nth(-1).scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: join('.tmp-qa', `${label}-blog-after-bottom.png`), fullPage: false });
    }
  }

  // Compare HTML structure of initial vs injected card if local
  const structure = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('article.elementor-post, .ecs-post-loop')];
    if (cards.length < 2) return null;
    function skeleton(el) {
      const walk = (node, depth) => {
        if (depth > 4 || !node || node.nodeType !== 1) return [];
        const kids = [...node.children].slice(0, 8).map((c) => ({
          tag: c.tagName.toLowerCase(),
          cls: String(c.className || '')
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 4)
            .join('.'),
          kids: walk(c, depth + 1),
        }));
        return kids;
      };
      return {
        rootCls: String(el.className || '').slice(0, 120),
        tree: walk(el, 0),
      };
    }
    return {
      first: skeleton(cards[0]),
      last: skeleton(cards[cards.length - 1]),
    };
  });

  await page.close();
  return { before, after, clickOk, fails: [...new Set(fails)].slice(0, 15), structure };
}

const local = await dig('http://127.0.0.1:5085', 'local');
const live = await dig('https://kinzahr.com', 'live');

const summary = {
  localBefore: local.before,
  liveBefore: live.before,
  localAfter: local.after,
  liveAfter: live.after,
  localFails: local.fails,
  liveFails: live.fails,
  structureCompare: {
    firstRoot: local.structure?.first?.rootCls,
    lastRoot: local.structure?.last?.rootCls,
    firstTree: local.structure?.first?.tree,
    lastTree: local.structure?.last?.tree,
  },
};

writeFileSync('.tmp-qa/blog-loadmore-compare.json', JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
