import * as cheerio from 'cheerio';

const local = cheerio.load(await (await fetch('http://127.0.0.1:5106/')).text());
const live = cheerio.load(await (await fetch('https://emiratisationgateway.com/')).text());

console.log('local services', local('#menu-item-1430 > a').attr('href'));
console.log('live services', live('#menu-item-1430 > a').attr('href'));
console.log('local faq plus', local('.elementor-accordion .fa-plus, .elementor-accordion .fas').length);
console.log('live faq plus', live('.elementor-accordion .fa-plus, .elementor-accordion .fas').length);

function footerFa($) {
  return $('a.fa-facebook, a.fa-linkedin, .fa.fa-facebook, .fa.fa-linkedin')
    .map((_, el) => $(el).attr('class'))
    .get();
}
console.log('local footer', footerFa(local));
console.log('live footer', footerFa(live));

for (const p of [
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-solid-900.woff2',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/webfonts/fa-brands-400.woff2',
  '/wp-content/plugins/elementor/assets/lib/eicons/fonts/eicons.woff2',
]) {
  console.log((await fetch('http://127.0.0.1:5106' + p)).status, p);
}

// Confirm blog load-more still clean after html-only change (no rebuild needed for legacy html)
const blog = await (await fetch('http://127.0.0.1:5106/blog/')).text();
console.log({
  ecsScriptLiveInHtml: /src="[^"]*ecs_ajax_pagination\.js/.test(blog),
  loadMoreScript: /blog-load-more\.js\?v=20260806-3/.test(blog),
  dataCs: /data-cs-blog-load-more/.test(blog),
});
