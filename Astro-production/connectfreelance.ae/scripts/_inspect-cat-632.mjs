import fs from 'node:fs';
import { load } from 'cheerio';

const $ = load(fs.readFileSync(process.env.TEMP + '/cf-live-cat-biz.html', 'utf8'));
const archive = $('[data-elementor-id="632"]').first();
console.log('archive', archive.length, archive.attr('data-elementor-type'), archive.attr('class'));

const top = [];
archive.children().each((i, el) => {
  if (i > 20) return;
  const e = $(el);
  top.push({
    i,
    id: e.attr('data-id'),
    type: e.attr('data-element_type'),
    cls: (e.attr('class') || '').split(/\s+/).slice(0, 6).join(' '),
  });
});
console.log('children', JSON.stringify(top, null, 2));

const postsWrap = $('.ecs-posts').first();
console.log('ecs', postsWrap.attr('class'));
console.log('ecs parent widget', postsWrap.closest('.elementor-element').attr('data-id'), postsWrap.closest('[data-widget_type]').attr('data-widget_type'));
console.log('grid cols style?', postsWrap.attr('style'));

// columns settings from data-settings
$('.elementor-632 [data-settings]').each((_, el) => {
  const s = $(el).attr('data-settings') || '';
  if (/columns|posts_per|ecs|grid/i.test(s)) {
    console.log('settings', $(el).attr('data-id'), s.slice(0, 200));
  }
});

$('link[rel="stylesheet"]').each((_, el) => {
  const h = ($(el).attr('href') || '').split('?')[0].replace('https://connectfreelance.ae', '');
  if (/post-632|post-545|post-25|frontend|global|theme|hello/.test(h)) console.log('css', h);
});

// archive title area
console.log('archive titles:');
$('.elementor-632 .elementor-heading-title, .elementor-632 h1').each((i, el) => {
  if (i < 10) console.log(i, $(el).text().trim().slice(0, 100));
});
