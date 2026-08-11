import { readFileSync, writeFileSync } from 'fs';
const raw = readFileSync('src/legacy/homepage.cleaned.html','utf8');
const matches = [...raw.matchAll(/https?:\/\/(?:www\.)?izi\.ae[^"'\\\s)<]*/gi)].map(m=>m[0]);
console.log('cleaned abs', matches.length);
[...new Set(matches)].forEach(u=>console.log(u));
const next = raw
  .replace(/https?:\/\/(?:www\.)?izi\.ae(\/wp-content\/[^"'\\\s)<]+)/gi,'$1')
  .replace(/https?:\/\/(?:www\.)?izi\.ae(\/wp-includes\/[^"'\\\s)<]+)/gi,'$1');
if(next!==raw){ writeFileSync('src/legacy/homepage.cleaned.html', next); console.log('homepage rewritten'); }
else console.log('no change to homepage');
