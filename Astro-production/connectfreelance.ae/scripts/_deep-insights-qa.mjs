import fs from 'node:fs';
import { load } from 'cheerio';

const live = load(fs.readFileSync(process.env.TEMP + '/cf-live-ins.html', 'utf8'));
const local = load(fs.readFileSync(process.env.TEMP + '/cf-loc-ins.html', 'utf8'));

function stripAbs(s) {
  return String(s || '')
    .replace(/https?:\/\/(www\.)?connectfreelance\.ae/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sectionOutline($) {
  const sections = [];
  $('.elementor-top-section').each((i, el) => {
    const $s = $(el);
    const id = $s.attr('data-id') || $s.attr('data-elementor-id') || '';
    const widgets = $s
      .find('[data-widget_type]')
      .map((_, w) => $(w).attr('data-widget_type'))
      .get();
    const headings = $s
      .find('.elementor-heading-title')
      .map((_, h) => $(h).text().replace(/\s+/g, ' ').trim().slice(0, 60))
      .get()
      .filter(Boolean)
      .slice(0, 3);
    const bg = ($s.attr('data-settings') || '').includes('background');
    sections.push({
      i,
      id,
      widgets: [...new Set(widgets)],
      headings,
      posts: $s.find('.ecs-posts article').length,
      classes: ($s.attr('class') || '').split(/\s+/).filter((c) => /elementor-element-|boxed|full/.test(c)).slice(0, 6),
    });
  });
  return sections;
}

function cardDetail($, idx) {
  const art = $('.ecs-posts article').eq(idx);
  if (!art.length) return null;
  const img = art.find('img').first();
  return {
    title: art.find('.elementor-heading-title').first().text().replace(/\s+/g, ' ').trim(),
    date: art.find('[itemprop=datePublished]').text().replace(/\s+/g, ' ').trim(),
    author: art.find('[itemprop=author]').text().replace(/\s+/g, ' ').trim(),
    btn: art.find('.elementor-button-text').first().text().trim(),
    imgSrc: stripAbs(img.attr('src') || img.attr('data-lazy-src') || '').slice(0, 90),
    imgW: img.attr('width'),
    imgH: img.attr('height'),
    loopId: art.find('[data-elementor-id]').attr('data-elementor-id'),
    hasLinkOnTitle: art.find('.elementor-element-fbe94b3 a').length > 0,
    hasLinkOnImg: art.find('.elementor-element-d937dc0 a').length > 0,
    widgetOrder: art
      .find('[data-widget_type]')
      .map((_, w) => ($(w).attr('data-id') || '') + ':' + $(w).attr('data-widget_type'))
      .get(),
  };
}

const liveSec = sectionOutline(live);
const locSec = sectionOutline(local);

console.log('=== SECTION COUNT ===', 'live', liveSec.length, 'local', locSec.length);
for (let i = 0; i < Math.max(liveSec.length, locSec.length); i++) {
  const L = liveSec[i];
  const A = locSec[i];
  const same =
    L &&
    A &&
    L.id === A.id &&
    JSON.stringify(L.widgets) === JSON.stringify(A.widgets) &&
    L.posts === A.posts;
  if (!same) {
    console.log(`\nDIFF section[${i}]`);
    console.log(' LIVE', L);
    console.log(' LOCAL', A);
  }
}

console.log('\n=== FIRST 3 CARDS ===');
for (let i = 0; i < 3; i++) {
  const L = cardDetail(live, i);
  const A = cardDetail(local, i);
  console.log(`\n#${i} LIVE`, L);
  console.log(`#${i} LOCAL`, A);
  if (L && A) {
    if (L.title !== A.title) console.log('  TITLE MISMATCH');
    if (L.widgetOrder.join('|') !== A.widgetOrder.join('|')) console.log('  WIDGET ORDER MISMATCH', L.widgetOrder, A.widgetOrder);
  }
}

// Extra CSS only on local
const liveCss = new Set();
const locCss = new Set();
live('link[rel=stylesheet]').each((_, el) => liveCss.add(stripAbs($(el).attr('href') || '').split('?')[0]));
local('link[rel=stylesheet]').each((_, el) => locCss.add(stripAbs($(el).attr('href') || '').split('?')[0]));
console.log('\nCSS only LOCAL', [...locCss].filter((c) => !liveCss.has(c)));
console.log('CSS only LIVE', [...liveCss].filter((c) => !locCss.has(c) && c.startsWith('/')));

// Inline styles / injected style tags
console.log('\nLOCAL style tags', local('style[id], style[data-]').map((_, el) => $(el).attr('id') || $(el).attr('data-cf-insights-layout') || 'anon').get());
console.log('insights layout link', local('link[href*=cf-insights]').attr('href'));
console.log('site polish link', local('link[href*=cf-site-polish]').attr('href'));

// Posts widget outer classes
console.log('\nLIVE posts widget class', live('.elementor-element-0215441').attr('class'));
console.log('LOCAL posts widget class', local('.elementor-element-0215441').attr('class'));
console.log('LIVE grid class', live('.ecs-posts').attr('class'));
console.log('LOCAL grid class', local('.ecs-posts').attr('class'));

// Parent column structure around posts
function postsContext($) {
  const w = $('.elementor-element-0215441');
  const col = w.closest('.elementor-column');
  const sec = w.closest('.elementor-top-section');
  return {
    sectionId: sec.attr('data-id'),
    sectionClass: (sec.attr('class') || '').slice(0, 120),
    colClass: (col.attr('class') || '').slice(0, 120),
    colWidth: (col.attr('class') || '').match(/elementor-col-\d+/)?.[0],
    beforeWidgets: sec
      .find('[data-widget_type]')
      .map((_, el) => $(el).attr('data-id') + ':' + $(el).attr('data-widget_type'))
      .get()
      .slice(0, 8),
  };
}
console.log('\nLIVE posts context', postsContext(live));
console.log('LOCAL posts context', postsContext(local));
