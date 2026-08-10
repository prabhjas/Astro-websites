import { writeFileSync } from 'node:fs';

const paths = [
  '/',
  '/about-us/',
  '/contact-us/',
  '/golden-visa/',
  '/silver-visa/',
  '/freelance-visa/',
  '/family-visa/',
  '/property-visa/',
  '/residence-visa/',
  '/blog/',
  '/advantages-of-the-uae-golden-visa/',
  '/robots.txt',
  '/sitemap_index.xml',
  '/page-sitemap.xml',
  '/post-sitemap.xml',
  '/api/health/',
];

function sig(html) {
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim() || '';
  return {
    title: title.slice(0, 70),
    h1: (html.match(/<h1\b/gi) || []).length,
    imgs: (html.match(/<img\b/gi) || []).length,
    css: (html.match(/rel=["']stylesheet/gi) || []).length,
    cf7: /wpcf7/i.test(html),
    fixes: /astro-mirror-fixes\.js/.test(html),
    ga: /G-WG16DPP9YT|runtime-gtm|googletagmanager/i.test(html),
    len: html.length,
  };
}

const rows = [];
for (const p of paths) {
  const [liveRes, localRes] = await Promise.all([
    fetch(`https://connectbusinesscenter.com${p}`, {
      headers: { 'user-agent': 'Mozilla/5.0' },
      redirect: 'follow',
    }),
    fetch(`http://127.0.0.1:5116${p}`, { redirect: 'follow' }),
  ]);
  const live = await liveRes.text();
  const local = await localRes.text();
  const L = sig(live);
  const C = sig(local);
  const row = {
    path: p,
    liveStatus: liveRes.status,
    localStatus: localRes.status,
    titleMatch: L.title === C.title,
    live: L,
    local: C,
  };
  rows.push(row);
  console.log(p, 'live', liveRes.status, 'local', localRes.status, 'titleMatch', row.titleMatch);
  console.log('  LIVE ', JSON.stringify(L));
  console.log('  LOCAL', JSON.stringify(C));
}

writeFileSync(
  new URL('../.tmp-parity.json', import.meta.url),
  JSON.stringify(rows, null, 2),
);
console.log('Wrote .tmp-parity.json');
