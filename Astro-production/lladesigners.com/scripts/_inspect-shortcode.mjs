import { readFileSync, writeFileSync } from 'node:fs';
import * as cheerio from 'cheerio';

const html = readFileSync('scripts/_posts-section.html', 'utf8');
const $ = cheerio.load(html);
const short = $('[data-widget_type="shortcode.default"]').first();
console.log('shortcode len', short.toString().length);

const candidates = [
  '.post-wrap',
  '.blog-post',
  '.filter-box',
  '.filter-wrap',
  '.posts-grid',
  '.grid',
  '.row',
  'article',
  '.elementor-post',
  '.ecs-post',
  '.card',
  '.item',
  '.col-md-4',
  '.col-lg-4',
  'a',
];
for (const sel of candidates) {
  const n = short.find(sel).length;
  if (n) console.log(sel, n);
}

const sample = short.find('.elementor-widget-container').html() || short.html() || '';
writeFileSync('scripts/_shortcode-inner.html', sample);
console.log('wrote shortcode inner', sample.length);
console.log(sample.slice(0, 3000));
