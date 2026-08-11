#!/usr/bin/env node
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const L = 'http://127.0.0.1:5107';
const V = '';

const home = await (await fetch(L + '/')).text();
const live = await (await fetch(V + '/')).text();

function block(html, id) {
  const i = html.indexOf('elementor-element-' + id);
  if (i < 0) return null;
  return html.slice(i, i + 4500).replace(/\s+/g, ' ');
}

console.log('LOCAL loop', (block(home, '443c7c5') || '').slice(0, 900));
console.log('LIVE loop', (block(live, '443c7c5') || '').slice(0, 900));
const settings = (block(home, '180c51f') || '').match(/data-settings="([^"]+)"/);
console.log('carousel settings', settings ? settings[1].slice(0, 400) : null);
console.log(
  'swiper scripts',
  [...home.matchAll(/src="([^"]*swiper[^"]*)"/gi)].map((m) => m[1]),
);
console.log(
  'frontend js',
  [...home.matchAll(/src="([^"]*frontend[^"]*\.js[^"]*)"/gi)].map((m) => m[1]).slice(0, 10),
);

const flagRoot =
  'Astro-production/emiratisationhub.com/public/wp-content/plugins/country-phone-field-contact-form-7';
console.log('flag plugin exists', existsSync(flagRoot));
function walk(d, acc = [], n = 0) {
  if (!existsSync(d) || n > 40) return acc;
  for (const name of readdirSync(d)) {
    const p = join(d, name);
    try {
      if (statSync(p).isDirectory()) walk(p, acc, n);
      else acc.push(p.replace(/\\/g, '/'));
    } catch {
      /* */
    }
    if (acc.length > 40) break;
  }
  return acc;
}
console.log('flag plugin files', walk(flagRoot).slice(0, 25));

for (const p of [
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/img/flags.png',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/css/intlTelInput.min.css',
  '/wp-content/plugins/country-phone-field-contact-form-7/assets/js/intlTelInput.min.js',
]) {
  const r = await fetch(L + p);
  console.log(r.status, p);
}

const blogL = await (await fetch(L + '/blog/')).text();
const blogV = await (await fetch(V + '/blog/')).text();
function firstArticle(html) {
  const m = html.match(/<article[\s\S]*?<\/article>/i);
  return m ? m[0].replace(/\s+/g, ' ').slice(0, 1400) : null;
}
console.log('LOCAL ARTICLE\n', firstArticle(blogL));
console.log('LIVE ARTICLE\n', firstArticle(blogV));

// sticky form widget on single
const postL = await (await fetch(L + '/emiratisation-meaning/')).text();
const postV = await (await fetch(V + '/emiratisation-meaning/')).text();
function formBlock(html) {
  const i = html.indexOf('wpcf7-form');
  if (i < 0) return null;
  return html.slice(Math.max(0, i - 600), i + 200).replace(/\s+/g, ' ');
}
console.log('LOCAL FORM CTX\n', formBlock(postL));
console.log('LIVE FORM CTX\n', formBlock(postV));

// Check overflow on parents that break sticky
console.log('overflow hidden local', (postL.match(/overflow:\s*hidden/gi) || []).length);
console.log('has sticky css local', /position:\s*sticky|3595752/i.test(postL));
