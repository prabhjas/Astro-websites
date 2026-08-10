#!/usr/bin/env node
const L = 'http://127.0.0.1:5107';
const V = '';

async function dump(base, path, label) {
  const h = await (await fetch(base + path)).text();
  const filterIdx = h.search(/filter-button|Latest Blogs/i);
  console.log('\n====', label, path, '====');
  if (filterIdx >= 0) {
    console.log(h.slice(filterIdx - 200, filterIdx + 1200).replace(/\s+/g, ' ').slice(0, 1000));
  } else {
    console.log('no filter section');
  }
  // Author by field
  const by = h.match(/post-info__item--type-author[\s\S]{0,250}/);
  console.log('author sample', by ? by[0].replace(/\s+/g, ' ').slice(0, 220) : null);
  // ecs containers
  const ecs = [...h.matchAll(/class="([^"]*ecs-posts[^"]*)"/g)].map((m) => m[1]);
  console.log('ecs classes', ecs);
}

await dump(L, '/blog/', 'LOCAL blog');
await dump(V, '/blog/', 'LIVE blog');
await dump(L, '/', 'LOCAL home');
await dump(V, '/', 'LIVE home');

// Form CSS suspects - width on inputs
const css = await (await fetch(L + '/css/form-fix.css')).text();
console.log('\nform-fix has contactform width', /contactform input\[type='text'\][\s\S]{0,120}/.test(css));
const homeCss = await (await fetch(L + '/')).text();
const widthRules = [...homeCss.matchAll(/\.contact-home[\s\S]{0,80}input[\s\S]{0,120}/gi)].slice(0, 3);
console.log('contact-home rules', widthRules.map((m) => m[0].replace(/\s+/g, ' ').slice(0, 150)));
