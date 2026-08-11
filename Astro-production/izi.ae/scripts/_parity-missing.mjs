#!/usr/bin/env node
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const report = JSON.parse(readFileSync(join(ROOT, 'docs/parity-audit.json'), 'utf8'));
const home = report.pages.find((p) => p.path === '/');
console.log('httpBroken', home.httpBrokenSample);
console.log('absRemote count', home.absRemoteWp);

const html = await (await fetch('http://127.0.0.1:5121/')).text();
const abs = [...html.matchAll(/https?:\/\/(?:www\.)?izi\.ae\/[^"'\s)<]+/gi)].map((m) => m[0]);
const uniq = [...new Set(abs)];
console.log('\nAbsolute izi.ae URLs remaining:', uniq.length);
uniq.forEach((u) => console.log(u));

const paths = new Set();
for (const m of html.matchAll(/(?:src|href|data-src|data-lazy-src|poster)=["'](\/[^"']+)/gi)) {
  const u = m[1].split('?')[0].split('#')[0];
  if (!/\.(css|js|mjs|map|png|jpe?g|gif|webp|svg|woff2?|ttf|eot|otf|ico|mp4|webm|json)$/i.test(u)) continue;
  paths.add(u);
}
for (const m of html.matchAll(/url\(\s*["']?(\/[^"')\s]+)/gi)) {
  const u = m[1].split('?')[0];
  if (/\.(css|js|png|jpe?g|gif|webp|svg|woff2?|ttf)$/i.test(u)) paths.add(u);
}

const miss = [...paths].filter((u) => !existsSync(join(PUBLIC, ...u.replace(/^\//, '').split('/'))));
console.log('\nTrue local asset disk misses:', miss.length);
miss.forEach((u) => console.log(u));

// Compare stylesheet sets
const live = await (await fetch('https://izi.ae/?nowprocket=1')).text();
function normCss(h) {
  return [...h.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)/gi)].map((x) =>
    x[1]
      .split('?')[0]
      .replace(/^https?:\/\/(?:www\.)?izi\.ae/i, ''),
  );
}
const lCss = normCss(html);
const vCss = normCss(live);
console.log('\nCSS count local/live', lCss.length, vCss.length);
const liveMissingLocally = vCss.filter((c) => {
  const path = c.startsWith('/') ? c : new URL(c, 'https://izi.ae').pathname;
  return !existsSync(join(PUBLIC, ...path.replace(/^\//, '').split('/')));
});
console.log('Live CSS not on disk:', liveMissingLocally.length);
liveMissingLocally.slice(0, 30).forEach((u) => console.log(u));

// JS compare
function normJs(h) {
  return [...h.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map((x) =>
    x[1]
      .split('?')[0]
      .replace(/^https?:\/\/(?:www\.)?izi\.ae/i, ''),
  );
}
const lJs = normJs(html).filter((u) => u.startsWith('/') || u.includes('izi.ae'));
const vJs = normJs(live).filter((u) => u.includes('izi.ae') || u.startsWith('/'));
console.log('\nJS tags local/live', normJs(html).length, normJs(live).length);
const liveJsDiskMiss = vJs
  .map((c) => (c.startsWith('/') ? c : new URL(c, 'https://izi.ae').pathname))
  .filter((path) => path.startsWith('/wp-') && !existsSync(join(PUBLIC, ...path.replace(/^\//, '').split('/'))));
console.log('Live JS not on disk:', [...new Set(liveJsDiskMiss)].length);
[...new Set(liveJsDiskMiss)].slice(0, 40).forEach((u) => console.log(u));

writeFileSync(
  join(ROOT, 'docs/parity-missing-assets.json'),
  JSON.stringify({ abs: uniq, diskMiss: miss, liveCssMiss: liveMissingLocally, liveJsMiss: [...new Set(liveJsDiskMiss)] }, null, 2),
);
console.log('\nWrote docs/parity-missing-assets.json');
