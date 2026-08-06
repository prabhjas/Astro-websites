const local = await (await fetch('http://127.0.0.1:5106/blog/')).text();
const live = await (await fetch('https://emiratisationgateway.com/blog/')).text();

function cssHits(html, re) {
  return [...html.matchAll(re)].map((m) => m[0]).slice(0, 8);
}

for (const [label, html] of [
  ['LOCAL', local],
  ['LIVE', live],
]) {
  console.log('\n', label);
  console.log('cuscat rules', cssHits(html, /\.cuscat[^{]*\{[^}]+\}/gi));
  console.log('postform/select rules', cssHits(html, /(?:#cat|select\.postform|\.widget_categories)[^{,]{0,40}\{[^}]+\}/gi));
  console.log('mirror', (html.match(/astro-mirror-fixes\.js[^"']*/) || [])[0]);
}

// Check if Elementor post CSS has select styling
import { existsSync, readFileSync } from 'fs';
for (const id of ['285', '276', '5']) {
  const p = `public/wp-content/uploads/elementor/css/post-${id}.css`;
  if (!existsSync(p)) continue;
  const css = readFileSync(p, 'utf8');
  const hits = [...css.matchAll(/cuscat|postform|#cat|select/gi)].slice(0, 20).map((m) => m[0]);
  const snippets = [...css.matchAll(/[^{}]*cuscat[^{]*\{[^}]+\}/gi)].map((m) => m[0]);
  console.log('post', id, { hits: hits.length, snippets });
}
