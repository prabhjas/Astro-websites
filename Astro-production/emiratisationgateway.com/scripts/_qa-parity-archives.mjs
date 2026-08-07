import * as cheerio from 'cheerio';

async function page(url) {
  const html = await (await fetch(url)).text();
  const $ = cheerio.load(html);
  return { html, $ };
}

const liveCat = await page('https://emiratisationgateway.com/category/emiratisation/');
const localCat = await page('http://127.0.0.1:5106/category/emiratisation/');
const liveAuth = await page('https://emiratisationgateway.com/author/');
const localAuth = await page('http://127.0.0.1:5106/author/');
const liveAuthOne = await page('https://emiratisationgateway.com/author/binju-t-r/');
const localAuthOne = await page('http://127.0.0.1:5106/author/binju-t-r/');

function summarize(label, $) {
  const arts = $('article').length;
  const imgs = $('article img').length;
  const h2 = $('article h2, article h3').length;
  const firstTitle = $('article h2 a, article h3 a, article .elementor-post__title a')
    .first()
    .text()
    .trim()
    .slice(0, 70);
  const firstImg = $('article img').first().attr('src') || '';
  console.log(label, { arts, imgs, h2, firstTitle, firstImg: firstImg.slice(0, 90) });
}

summarize('LIVE cat', liveCat.$);
summarize('LOCAL cat', localCat.$);
summarize('LIVE author dir', liveAuth.$);
summarize('LOCAL author dir', localAuth.$);
summarize('LIVE author one', liveAuthOne.$);
summarize('LOCAL author one', localAuthOne.$);

// Live category first article structure
const liveFirst = liveCat.$('article').first();
console.log('LIVE cat card classes', liveFirst.attr('class'));
console.log('LIVE cat card has ecs', liveFirst.find('.ecs-post-loop, .elementor-276').length);
console.log(
  'LIVE cat card snippet',
  liveFirst.html()?.slice(0, 400).replace(/\s+/g, ' '),
);

const localFirst = localCat.$('article').first();
console.log('LOCAL cat card classes', localFirst.attr('class'));
console.log(
  'LOCAL cat card snippet',
  localFirst.html()?.slice(0, 400).replace(/\s+/g, ' '),
);

// Author dir cards
console.log(
  'LIVE author cards',
  liveAuth.$('.astro-author-card, .elementor-post, article').length,
  'names',
  liveAuth
    .$('h3 a, .elementor-heading-title a, h2 a')
    .map((_, el) => liveAuth.$(el).text().trim())
    .get()
    .filter(Boolean)
    .slice(0, 12),
);
console.log(
  'LOCAL author cards',
  localAuth.$('.astro-author-card, article').length,
  'names',
  localAuth
    .$('.astro-author-card__name a, h3 a')
    .map((_, el) => localAuth.$(el).text().trim())
    .get()
    .slice(0, 12),
);

// Check author/category links on single post
const post = await page('http://127.0.0.1:5106/emiratisation-uae/');
const authorHref = post.$('a[href*="/author/"]').first().attr('href');
const catHref = post.$('a[href*="/category/"]').first().attr('href');
console.log('single post links', { authorHref, catHref });
if (authorHref) {
  const r = await fetch('http://127.0.0.1:5106' + authorHref.replace(/^https?:\/\/[^/]+/, ''));
  console.log('author link status', r.status, authorHref);
}
if (catHref) {
  const r = await fetch('http://127.0.0.1:5106' + catHref.replace(/^https?:\/\/[^/]+/, ''));
  console.log('cat link status', r.status, catHref);
}
