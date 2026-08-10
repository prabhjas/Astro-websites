#!/usr/bin/env node
import { existsSync, copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const L = 'http://127.0.0.1:5107';
const V = 'https://emiratisationhub.com';
const home = await (await fetch(L + '/')).text();
const live = await (await fetch(V + '/')).text();

function info(html, id) {
  const i = html.indexOf('elementor-element-' + id);
  const block = i < 0 ? '' : html.slice(i, i + 40000);
  return {
    found: i >= 0,
    slides: (block.match(/swiper-slide/g) || []).length,
    wrapper: /swiper-wrapper/i.test(block),
    container: /elementor-loop-container/i.test(block),
    imgs: (block.match(/<img\b/g) || []).length,
    eLoop: (block.match(/e-loop-item/g) || []).length,
    emptyDataSrc: (block.match(/data-src="/g) || []).length,
    sample: block.slice(0, 600).replace(/\s+/g, ' '),
  };
}

console.log('loop local', info(home, '443c7c5'));
console.log('loop live', info(live, '443c7c5'));
console.log('logo local', info(home, '180c51f'));
console.log('logo live', info(live, '180c51f'));

const utilsLocal =
  'Astro-production/emiratisationhub.com/public/wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js';
const utilsPeer =
  'Astro-production/pittant.com/public/wp-content/plugins/country-phone-field-contact-form-7/assets/js/utils.js';
console.log('utils local', existsSync(utilsLocal));
console.log('utils peer', existsSync(utilsPeer));

const swiper = await fetch(L + '/wp-content/plugins/elementor/assets/lib/swiper/v8/swiper.min.js?ver=8.4.5');
console.log('swiper', swiper.status, (await swiper.text()).length);

const post = await (await fetch(L + '/emiratisation-meaning/')).text();
const fi = post.indexOf('id="contact-formnew"');
console.log('form ctx', post.slice(Math.max(0, fi - 900), fi + 80).replace(/\s+/g, ' ').slice(0, 800));

// Check parent overflow CSS rules affecting sticky
const overflowParents = [...post.matchAll(/\.elementor-element-[a-f0-9]+[^{]*\{[^}]*overflow\s*:\s*hidden[^}]*\}/gi)].slice(0, 5);
console.log('overflow rules sample', overflowParents.map((m) => m[0].slice(0, 120)));
