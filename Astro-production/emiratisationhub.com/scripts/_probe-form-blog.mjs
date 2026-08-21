#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';

const L = 'http://127.0.0.1:5107';
const V = '';

const live = await (await fetch(V + '/blog/')).text();
const local = await (await fetch(L + '/blog/')).text();
const home = await (await fetch(L + '/')).text();

console.log('live author in 1975', (live.match(/elementor-1975[\s\S]{0,1500}/) || [''])[0].match(/type-author[\s\S]{0,120}/)?.[0]?.replace(/\s+/g, ' '));
console.log('local author in 1975', (local.match(/elementor-1975[\s\S]{0,1500}/) || [''])[0].match(/type-author[\s\S]{0,120}/)?.[0]?.replace(/\s+/g, ' '));

const jq = [...local.matchAll(/<script[^>]+>/gi)].map((m) => m[0]).filter((t) => /jquery/i.test(t));
console.log('jquery script tags', jq.slice(0, 6));

// Inline filter script still rocket?
const filterScript = local.match(/filter-button[\s\S]{0,80}click[\s\S]{0,400}/);
console.log('filter script sample', filterScript?.[0]?.replace(/\s+/g, ' ')?.slice(0, 350));

const formFix = readFileSync('Astro-production/emiratisationhub.com/public/css/form-fix.css', 'utf8');
console.log('--- form-fix inputs ---');
console.log(formFix.match(/\.contactform input\[type='text'\][\s\S]{0,350}/)?.[0]);

// Find homepage form wrapper classes
const formCtx = home.slice(home.indexOf('wpcf7-form') - 800, home.indexOf('wpcf7-form') + 100);
console.log('form wrapper', formCtx.replace(/\s+/g, ' ').slice(0, 500));

// post-1107 or homepage elementor css for inputs
const cssHrefs = [...home.matchAll(/href="([^"]+\.css[^"]*)"/gi)].map((m) => m[1]);
const interesting = cssHrefs.filter((u) => /post-1|form|custom|theme/i.test(u)).slice(0, 15);
console.log('css', interesting);

for (const href of interesting.slice(0, 8)) {
  try {
    const css = await (await fetch(href.startsWith('http') ? href : L + href)).text();
    const hits = [...css.matchAll(/[^{}]*contact-home[^{]*\{[^}]+\}/gi)].slice(0, 5);
    const hits2 = [...css.matchAll(/[^{}]*\.wpcf7[^{]*input[^{]*\{[^}]+\}/gi)].slice(0, 5);
    if (hits.length || hits2.length) {
      console.log('FILE', href);
      console.log([...hits, ...hits2].map((m) => m[0].replace(/\s+/g, ' ').slice(0, 200)));
    }
  } catch {
    /* */
  }
}
