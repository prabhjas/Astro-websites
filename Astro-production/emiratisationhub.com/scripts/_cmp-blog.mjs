#!/usr/bin/env node
const L = 'http://127.0.0.1:5107';
const V = '';

async function titles(base) {
  const h = await (await fetch(base + '/blog/')).text();
  const arts = [...h.matchAll(/<article[\s\S]*?<\/article>/gi)].slice(0, 5);
  return arts.map((a) => {
    const t = (a[0].match(/elementor-heading-title[^>]*>\s*<a[^>]*>([^<]+)/i) || [])[1];
    const img = (a[0].match(/<img[^>]+src="([^"]+)"/i) || [])[1];
    const date = (a[0].match(/<time[^>]*>([^<]+)/i) || [])[1];
    return { t, img, date };
  });
}

console.log('LOCAL', await titles(L));
console.log('LIVE', await titles(V));

// Check blog CSS files
for (const p of [
  '/wp-content/uploads/elementor/css/post-1975.css',
  '/wp-content/uploads/elementor/css/post-1985.css',
  '/wp-content/uploads/elementor/css/post-1199.css',
]) {
  const r = await fetch(L + p);
  console.log(r.status, p, (await r.text()).length);
}
