import { readFileSync, writeFileSync } from 'node:fs';
import * as cheerio from 'cheerio';

const sample = readFileSync('scripts/_shortcode-inner.html', 'utf8');
const $ = cheerio.load(sample, { decodeEntities: false });

const first = $('.post-wrap').first();
console.log('first post-wrap classes', first.attr('class'));
console.log(first.toString().slice(0, 2500));

console.log('\nfilter-post children', $('.filter-post').children().length);
console.log('post-wrap total', $('.post-wrap').length);
console.log('post-wrap display none style in CSS?', /post-wrap\{\s*display:none/.test(sample));

// scripts in shortcode
$('script').each((i, el) => {
  console.log('\nSCRIPT', i, $(el).html()?.slice(0, 800));
});

// Also peek index author card full markup with image
const index = readFileSync('scripts/author-index-live.html', 'utf8');
const $i = cheerio.load(index, { decodeEntities: false });
const section = $i('.elementor-element-2f15033');
writeFileSync('scripts/_author-index-cards.html', section.toString());
console.log('\nindex cards section len', section.toString().length);
console.log(section.toString().slice(0, 3500));
