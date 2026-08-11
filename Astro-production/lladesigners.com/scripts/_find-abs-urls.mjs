#!/usr/bin/env node
const html = await (await fetch('http://127.0.0.1:5112/')).text();
const hits = [];
for (const m of html.matchAll(/https?:\/\/(?:www\.)?lladesigners\.com[^"'\\\s)<]{0,200}/gi)) {
  hits.push({ i: m.index, s: m[0] });
}
for (const h of hits) {
  console.log('---');
  console.log(h.s);
  console.log('CTX:', JSON.stringify(html.slice(Math.max(0, h.i - 40), h.i + h.s.length + 40)));
}

// Also find truncated upload paths
const trunc = [...html.matchAll(/wp-content\/upload[^s]/gi)];
console.log('truncated upload count', trunc.length);
if (trunc[0]) console.log('trunc ctx', JSON.stringify(html.slice(trunc[0].index - 20, trunc[0].index + 60)));
