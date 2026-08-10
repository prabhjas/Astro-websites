import * as cheerio from 'cheerio';
import { writeFileSync } from 'fs';

const live = await (await fetch('https://emiratisationgateway.com/blog/')).text();
const local = await (await fetch('http://127.0.0.1:5106/blog/')).text();
const loadMore = await (await fetch('http://127.0.0.1:5106/api/blog/load-more/?page=2&perPage=3&offset=10')).json();

for (const [name, html] of [['LIVE', live], ['LOCAL', local]]) {
  const $ = cheerio.load(html);
  const arts = $('.ecs-posts article');
  console.log(name, 'articles', arts.length);
  const first = arts.first();
  console.log('  classes', first.attr('class'));
  console.log('  loop id', first.find('[data-elementor-id]').first().attr('data-elementor-id'));
  console.log('  has img', first.find('img').length);
  console.log('  h3', first.find('h3').text().trim().slice(0,80));
  console.log('  snippet', first.html()?.slice(0,500).replace(/\s+/g,' '));
  console.log('---');
}
console.log('LOADMORE html snippet:', (loadMore.html||'').slice(0,600).replace(/\s+/g,' '));
console.log('LOADMORE has elementor-276', (loadMore.html||'').includes('elementor-276'));
console.log('LOADMORE has elementor-987', (loadMore.html||'').includes('elementor-987'));

// Count initial cards and load more settings on local
const $l = cheerio.load(local);
const nav = $l('[data-cs-blog-load-more], .ecs-load-more-button').first();
console.log('nav attrs', {
  next: nav.attr('data-next-page'),
  per: nav.attr('data-per-page'),
  offset: nav.attr('data-offset'),
  text: nav.text().trim().slice(0,40)
});
console.log('initial articles', $l('.ecs-posts article').length);

// Save first live card for template
const $live = cheerio.load(live);
const card = $live('.ecs-posts article').first().toString();
writeFileSync('d:/Astro-websites/Astro-production/emiratisationgateway.com/.tmp-live-card.html', card);
console.log('saved live card len', card.length);

// Author content check
import { existsSync, readdirSync } from 'fs';
const ad = 'd:/Astro-websites/Astro-production/emiratisationgateway.com/src/content/authors';
console.log('authors dir', existsSync(ad), existsSync(ad) ? readdirSync(ad).slice(0,20) : []);
const shell = 'd:/Astro-websites/Astro-production/emiratisationgateway.com/src/legacy/author-shell/template.html';
console.log('author shell', existsSync(shell));
const arch = 'd:/Astro-websites/Astro-production/emiratisationgateway.com/src/lib/archives.ts';
console.log('archives.ts', existsSync(arch));
for (const u of ['/author/','/author/binju-t-r/','/category/emiratisation/','/category/outsourcing/']) {
  const r = await fetch('http://127.0.0.1:5106'+u);
  console.log(r.status, u, 'len', (await r.text()).length);
}
