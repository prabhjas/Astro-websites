import { writeFileSync } from 'node:fs';

const local = await (await fetch('http://127.0.0.1:5107/blog/')).text();
const live = await (await fetch('/blog/')).text();

function extractBetween(html, startRe, endRe) {
  const sm = html.match(startRe);
  if (!sm) return null;
  const start = sm.index;
  const rest = html.slice(start);
  const em = rest.match(endRe);
  const end = em ? start + em.index : start + 15000;
  return html.slice(start, end);
}

// Live parent section around first ecs
const liveFirstEcs = live.indexOf('ecs-posts');
const liveCtx = live.slice(Math.max(0, liveFirstEcs - 2500), liveFirstEcs + 500);
writeFileSync('Astro-production/emiratisationhub.com/scripts/_tmp-live-blog-ctx.txt', liveCtx);

const localFirstEcs = local.indexOf('class="ecs-posts') >= 0 ? local.indexOf('class="ecs-posts') : local.search(/ecs-posts/);
// find actual ecs div
const lm = local.match(/<div[^>]*class="[^"]*ecs-posts[^"]*"[^>]*>/);
const liveM = live.match(/<div[^>]*class="[^"]*ecs-posts[^"]*"[^>]*>/);
console.log('LOCAL ecs attrs', lm?.[0]);
console.log('LIVE ecs attrs', liveM?.[0]);

// data-settings / columns
function gridSettings(html, label) {
  const all = [...html.matchAll(/ecs-posts[^>]*>/g)].slice(0, 2);
  for (const m of all) {
    const chunk = html.slice(Math.max(0, m.index - 800), m.index + 200);
    const cols = chunk.match(/elementor-grid-(\d+)/);
    const settings = chunk.match(/data-settings="([^"]{0,400})"/);
    console.log(label, 'grid', cols?.[1], 'settings', settings?.[1]?.slice(0, 200));
  }
}
gridSettings(local, 'LOCAL');
gridSettings(live, 'LIVE');

// Featured card: does it include image widget?
function cardHasImage(html, loopId) {
  const i = html.search(new RegExp(`elementor-${loopId}[\\s\\S]{0,4000}theme-post-featured-image|elementor-${loopId}[\\s\\S]{0,4000}<img`));
  const article = html.match(new RegExp(`<article[^>]*>[\\s\\S]*?elementor-${loopId}[\\s\\S]*?</article>`));
  if (!article) {
    // try non-greedy shorter
    const idx = html.indexOf(`elementor-${loopId}`);
    if (idx < 0) return { found: false };
    const slice = html.slice(idx - 200, idx + 3500);
    return {
      found: true,
      hasImg: /<img\b/i.test(slice),
      hasFeaturedWidget: /theme-post-featured-image|elementor-widget-image/i.test(slice),
      title: (slice.match(/elementor-heading-title[\s\S]*?<a[^>]*>([^<]+)/) || [])[1],
      snippet: slice.replace(/\s+/g, ' ').slice(0, 400),
    };
  }
  return {
    found: true,
    hasImg: /<img\b/i.test(article[0]),
    hasFeaturedWidget: /theme-post-featured-image/i.test(article[0]),
  };
}
console.log('LOCAL featured', cardHasImage(local, 1975));
console.log('LIVE featured', cardHasImage(live, 1975));
console.log('LOCAL grid', cardHasImage(local, 1985));
console.log('LIVE grid', cardHasImage(live, 1985));

// Parent column widths around ecs widgets
function columnContext(html, label) {
  const idxs = [];
  const re = /<div[^>]*class="[^"]*ecs-posts[^"]*"[^>]*>/gi;
  let m;
  while ((m = re.exec(html))) idxs.push(m.index);
  for (let i = 0; i < idxs.length; i++) {
    const before = html.slice(Math.max(0, idxs[i] - 1200), idxs[i]);
    const col = before.match(/elementor-col-(\d+)[^"]*"[^>]*data-id="([^"]+)"[^>]*>[^]*$/);
    const col2 = [...before.matchAll(/elementor-column[^"]*elementor-col-(\d+)/g)].pop();
    console.log(label, 'ecs', i, 'col', col2?.[1], 'near', before.replace(/\s+/g, ' ').slice(-300));
  }
}
columnContext(local, 'LOCAL');
columnContext(live, 'LIVE');
