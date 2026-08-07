import * as cheerio from 'cheerio';
import { writeFileSync } from 'node:fs';

async function dump(url, label) {
  const html = await (await fetch(url)).text();
  const $ = cheerio.load(html);
  const root = $('.elementor-widget-accordion .elementor-accordion').first();
  console.log(label, {
    accordionWidgets: $('.elementor-widget-accordion').length,
    items: root.find('.elementor-accordion-item').length,
    titles: root.find('.elementor-tab-title').length,
    activeTitles: root.find('.elementor-tab-title.elementor-active').length,
    titleTag: root.find('.elementor-tab-title').first().prop('tagName'),
    titleHtml: root.find('.elementor-tab-title').first().toString().slice(0, 350),
    content0: root.find('.elementor-tab-content').first().attr('class'),
    icon: root.find('.elementor-accordion-icon').first().toString().slice(0, 250),
  });
  return html;
}

const live = await dump('https://emiratisationgateway.com/', 'LIVE');
const local = await dump('http://127.0.0.1:5106/', 'LOCAL');

// Extract FAQ widget CSS from elementor post css if present
const liveCss = [...live.matchAll(/href="([^"]*elementor\/css\/post-[^"]+)"/g)].map((m) => m[1]);
const localCss = [...local.matchAll(/href="([^"]*elementor\/css\/post-[^"]+)"/g)].map((m) => m[1]);
console.log('live css', liveCss.slice(0, 5));
console.log('local css', localCss.slice(0, 5));

// Check outline rules in live post CSS
for (const href of liveCss.slice(0, 4)) {
  const url = href.startsWith('http') ? href : 'https://emiratisationgateway.com' + href;
  const css = await (await fetch(url)).text();
  const hits = css.match(/[^{}]*accordion[^{]*\{[^}]*outline[^}]*\}/gi) || [];
  const hits2 = css.match(/[^{}]*tab-title[^{]*\{[^}]{0,200}\}/gi) || [];
  console.log(url.split('/').pop(), 'outline hits', hits.length, 'title rules sample', (hits2[0] || '').slice(0, 180));
}
