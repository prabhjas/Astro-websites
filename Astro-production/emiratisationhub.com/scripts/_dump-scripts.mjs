#!/usr/bin/env node
const h = await (await fetch('http://127.0.0.1:5107/')).text();

const scripts = [...h.matchAll(/<script\b([^>]*)>/gi)].map((m) => m[1]).filter((a) => /swiper|frontend|mirror|elementor/i.test(a));
console.log('script tags of interest:');
for (const a of scripts.slice(0, 40)) console.log(' -', a.replace(/\s+/g, ' ').slice(0, 220));

console.log('\nrocketlazy script count', (h.match(/rocketlazyloadscript/gi) || []).length);
console.log('mirror fixes attrs', (h.match(/<script[^>]*astro-mirror-fixes[^>]*>/i) || [''])[0]);
console.log('has form-fix', /form-fix\.css/.test(h));
console.log('has caret css inline?', /border-top:\s*5px solid currentColor/.test(h));

// Check if image carousel wrapper has expected classes
const i = h.indexOf('elementor-element-180c51f');
const block = h.slice(i, i + 2500);
console.log('\nlogo wrap class snippet', block.match(/class="[^"]*swiper[^"]*"/)?.[0]);
const j = h.indexOf('elementor-element-443c7c5');
const block2 = h.slice(j, j + 2500);
console.log('loop wrap class snippet', block2.match(/class="[^"]*swiper[^"]*"/)?.[0]);
console.log('loop container', block2.match(/class="[^"]*elementor-loop-container[^"]*"/)?.[0]);
