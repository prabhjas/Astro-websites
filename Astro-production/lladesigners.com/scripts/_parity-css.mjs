#!/usr/bin/env node
const live = await (await fetch('https://lladesigners.com/')).text();
const local = await (await fetch('http://127.0.0.1:5112/')).text();

function cssHrefs(html) {
  return [...html.matchAll(/<link[^>]+href=["']([^"']+\.css[^"']*)/gi)].map((m) => m[1].split('?')[0]);
}
function scriptSrcs(html) {
  return [...html.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map((m) => m[1].split('?')[0]);
}

const liveCss = new Set(cssHrefs(live).map((u) => u.replace(/^https?:\/\/(?:www\.)?lladesigners\.com/, '')));
const localCss = new Set(cssHrefs(local).map((u) => u.replace(/^https?:\/\/(?:www\.)?lladesigners\.com/, '').replace(/^http:\/\/127\.0\.0\.1:\d+/, '')));

const missingOnLocal = [...liveCss].filter((u) => u.startsWith('/') && !localCss.has(u));
const extraOnLocal = [...localCss].filter((u) => u.startsWith('/') && !liveCss.has(u));
console.log('live css', liveCss.size, 'local css', localCss.size);
console.log('missing on local', missingOnLocal.slice(0, 40));
console.log('extra on local', extraOnLocal.slice(0, 20));

// Header presence
for (const [name, html] of [['live', live], ['local', local]]) {
  const hasHeader = /data-elementor-type="header"/i.test(html);
  const transparent = /ast-theme-transparent-header|transparent-header|elementor-sticky/i.test(html);
  const logo = (html.match(/Logo-(?:new|white)[^"']*/i) || [])[0];
  const bodyClass = (html.match(/<body[^>]*class=["']([^"']+)/i) || [])[1]?.slice(0, 200);
  console.log(name, { hasHeader, transparent, logo, bodyClass });
}

// Check local header CSS 404s among live list
let fail = 0;
for (const u of [...liveCss].filter((x) => x.startsWith('/')).slice(0, 80)) {
  const r = await fetch('http://127.0.0.1:5112' + u, { method: 'HEAD' });
  if (!r.ok) {
    fail++;
    console.log('404 css', r.status, u);
  }
}
console.log('css 404 count', fail);
