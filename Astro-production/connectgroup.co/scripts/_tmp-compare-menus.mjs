import { readFileSync, writeFileSync } from 'node:fs';
import * as cheerio from 'cheerio';
import http from 'node:http';

function get(path) {
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:4321' + path, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    }).on('error', reject);
  });
}

const home = await get('/');
const insights = await get('/insights/');

writeFileSync('source/wordpress-exports/_tmp-home-snip.html', home.slice(0, 500));
console.log('HOME services id present 31469', home.includes('id="mega-menu-item-31469"'));
console.log('HOME 35463', home.includes('id="mega-menu-item-35463"'));

// Extract brands title colors from insights inline/header
const $ = cheerio.load(insights);
const brandTitles = [];
$('#mega-menu-item-31582 .elementor-image-box-title a, #mega-menu-item-31582 .elementor-image-box-title').each((_, el) => {
  brandTitles.push($(el).text().trim().slice(0, 40));
});
console.log('brand titles sample', brandTitles.slice(0, 5));

// Check if nested tabs CSS link exists
const links = [];
$('link[href]').each((_, el) => links.push($(el).attr('href')));
console.log(
  'nested css',
  links.filter((h) => /nested|n-tabs|tabs/i.test(h || '')).slice(0, 20),
);

// Look for conflicting .e-n-tabs-heading rules in page styles
const styles = $('style')
  .map((_, el) => $(el).html() || '')
  .get()
  .join('\n');
const hits = styles.match(/\.e-n-tabs-heading[^{]*\{[^}]+\}/g) || [];
console.log('page e-n-tabs-heading rules', hits.length);
hits.slice(0, 5).forEach((h) => console.log(h.slice(0, 250)));

const flexHits = styles.match(/\.e-n-tabs[^{]*\{[^}]{0,200}\}/g) || [];
console.log('e-n-tabs rules', flexHits.length);
flexHits.slice(0, 5).forEach((h) => console.log(h.slice(0, 250)));
