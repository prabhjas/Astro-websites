import * as cheerio from 'cheerio';

const LOCAL = 'http://127.0.0.1:5106';
const LIVE = 'https://emiratisationgateway.com';

async function status(url) {
  try {
    const r = await fetch(url, { method: 'GET', redirect: 'manual' });
    return r.status;
  } catch (e) {
    return `ERR:${e.message}`;
  }
}

console.log('\n=== Critical assets ===');
for (const path of [
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2',
  '/wp-content/plugins/elementor/assets/lib/dialog/dialog.min.js',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/brands.min.css',
  '/js/blog-load-more.js?v=20260806-3',
  '/js/astro-mirror-fixes.js?v=20260806-qa1',
  '/css/kinza-form-fix.css?v=20260806-qa1',
]) {
  console.log(await status(LOCAL + path), path);
}

console.log('\n=== Load More wiring ===');
{
  const html = await (await fetch(LOCAL + '/blog/')).text();
  const $ = cheerio.load(html);
  console.log({
    ecsAjaxScript: /ecs_ajax_pagination\.js/.test(html),
    ecsAjaxParams: /ecs_ajax_params/.test(html),
    blogLoadMore: /blog-load-more\.js\?v=20260806-3/.test(html),
    dataCs: $('[data-cs-blog-load-more]').length,
    articles: $('article').length,
  });
  const api = await (
    await fetch(LOCAL + '/api/blog/load-more/?page=2&perPage=9&offset=9')
  ).json();
  console.log({
    apiOk: api.ok,
    cards: (api.html.match(/<article/g) || []).length,
    hasMore: api.hasMore,
    nextPage: api.nextPage,
  });
}

console.log('\n=== Homepage carousel / icons ===');
{
  const html = await (await fetch(LOCAL + '/')).text();
  const $ = cheerio.load(html);
  const car = $('.elementor-widget-image-carousel').first();
  const settings = car.attr('data-settings') || '';
  const js = await (await fetch(LOCAL + '/js/astro-mirror-fixes.js?v=20260806-qa1')).text();
  console.log({
    slidesToShow: /slides_to_show":"9"/.test(settings),
    preInit9up: js.includes('11.111%'),
    eiconFontsInJsCss: /eicons/.test(html),
    eiconCount: $('i[class*="eicon-"]').length,
    astArrow: $('.ast-arrow-svg').length,
    popup519: $('[data-elementor-id="519"]').length,
    dialogInHtml: /dialog\.min\.js/.test(html),
    mirrorVer: (html.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
  });
}

console.log('\n=== Single post form ===');
{
  const html = await (await fetch(LOCAL + '/emiratisation-uae/')).text();
  const $ = cheerio.load(html);
  console.log({
    popup519: $('[data-elementor-id="519"]').length,
    wpcf7: $('form.wpcf7-form').length,
    hireOpen: $('a[href*="popup%3Aopen"], a[href*="popup:open"]').length,
    formCss: /kinza-form-fix\.css\?v=20260806-qa1/.test(html),
    loadMore: $('[data-cs-blog-load-more]').length,
    ecsAjaxGone: !/ecs_ajax_pagination\.js/.test(html),
    mirror: (html.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
  });
}

console.log('\n=== Page sweep (status + major assets) ===');
const pages = [
  '/',
  '/blog/',
  '/contact-us/',
  '/emiratisation-services/',
  '/emiratisation-recruitment/',
  '/staff-outsourcing/',
  '/uae-national-jobs/',
  '/career-opportunities/',
  '/nafis-benefits/',
  '/nafis-faqs/',
  '/author/',
  '/author/nakul/',
  '/category/emiratisation/',
  '/emiratisation-uae/',
  '/about-us/',
];

for (const p of pages) {
  const local = await fetch(LOCAL + p);
  const live = await fetch(LIVE + p).catch(() => null);
  const lhtml = await local.text();
  const $ = cheerio.load(lhtml);
  const brokenImgs = [];
  const imgs = $('img[src^="/"]')
    .map((_, el) => $(el).attr('src'))
    .get()
    .slice(0, 40);
  for (const src of imgs) {
    const s = await status(LOCAL + src.split('?')[0]);
    if (s !== 200) brokenImgs.push([s, src]);
  }
  console.log({
    page: p,
    local: local.status,
    live: live?.status ?? 'ERR',
    title: $('title').text().slice(0, 60),
    imgsChecked: imgs.length,
    brokenImgs: brokenImgs.slice(0, 5),
    forms: $('form.wpcf7-form').length,
    mirror: /astro-mirror-fixes/.test(lhtml),
  });
}

console.log('\n=== Key stylesheet 404 probe from homepage ===');
{
  const html = await (await fetch(LOCAL + '/')).text();
  const $ = cheerio.load(html);
  const hrefs = $('link[rel="stylesheet"]')
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter((h) => h && h.startsWith('/'));
  const fails = [];
  for (const h of hrefs) {
    const s = await status(LOCAL + h.split('?')[0]);
    if (s !== 200) fails.push([s, h]);
  }
  console.log({ cssCount: hrefs.length, fails });
}

console.log('\n=== Script 404 probe homepage ===');
{
  const html = await (await fetch(LOCAL + '/')).text();
  const $ = cheerio.load(html);
  const hrefs = $('script[src]')
    .map((_, el) => $(el).attr('src'))
    .get()
    .filter((h) => h && h.startsWith('/'));
  const fails = [];
  for (const h of hrefs) {
    const s = await status(LOCAL + h.split('?')[0]);
    if (s !== 200) fails.push([s, h]);
  }
  console.log({ jsCount: hrefs.length, fails });
}
