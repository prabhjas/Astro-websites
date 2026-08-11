import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as cheerio from 'cheerio';

const indexHtml = readFileSync('scripts/author-index-live.html', 'utf8');
const singleHtml = readFileSync('scripts/author-lana-live.html', 'utf8');

function summarize(html, label) {
  const $ = cheerio.load(html);
  const page = $('[data-elementor-type="wp-page"], [data-elementor-type="archive"]').first();
  console.log('\n==', label, '==');
  console.log('type', page.attr('data-elementor-type'), 'id', page.attr('data-elementor-id') || page.attr('class'));
  page.find('> section, > .elementor-section, > .e-con').each((i, el) => {
    const $el = $(el);
    const text = $el.text().replace(/\s+/g, ' ').trim().slice(0, 140);
    console.log(i, $el.attr('data-id'), $el.attr('class')?.slice(0, 90), '|', text);
  });

  // author cards / images
  const imgs = [];
  page.find('img').each((_, img) => {
    const src = $(img).attr('src') || $(img).attr('data-src') || '';
    if (/uploads/.test(src) && !/Logo|logo/.test(src)) imgs.push(src.replace(/https?:\/\/[^/]+/, ''));
  });
  console.log('content imgs', [...new Set(imgs)].slice(0, 12));

  // post cards on single
  const posts = page.find('.elementor-post, .ecs-post, article.elementor-post');
  console.log('post cards', posts.length);
  if (posts.length) {
    console.log('first post html slice', posts.first().html()?.slice(0, 400));
  }
}

summarize(indexHtml, 'INDEX');
summarize(singleHtml, 'SINGLE');

// Extract index page main content for mirror
const $i = cheerio.load(indexHtml);
const indexPage = $i('[data-elementor-type="wp-page"]').first();
console.log('\nINDEX full sections HTML length', indexPage.html()?.length);

// Get author card markup sample
const card = $i('.elementor-element-98e3ff6, .elementor-element-31e3a4a').first();
console.log('\nCARD sample:\n', card.toString().slice(0, 1500));

const $s = cheerio.load(singleHtml);
const profile = $s('.elementor-element-58abf12, .main-auth, [data-id="58abf12"]').first();
console.log('\nPROFILE candidates');
$s('[data-elementor-type="archive"] > section').each((i, el) => {
  console.log(i, $s(el).attr('data-id'), $s(el).text().replace(/\s+/g, ' ').trim().slice(0, 120));
});
const archive = $s('[data-elementor-type="archive"]').first();
const firstSection = archive.children('section').first();
console.log('\nFIRST SECTION:\n', firstSection.toString().slice(0, 2500));
const secondSection = archive.children('section').eq(1);
console.log('\nSECOND SECTION heading + first post:\n', secondSection.find('h2,h1,.elementor-heading-title').first().toString());
console.log(secondSection.find('.elementor-post, .ecs-post, article').first().toString().slice(0, 2000));
