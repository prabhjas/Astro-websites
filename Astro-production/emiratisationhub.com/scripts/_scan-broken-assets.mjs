/**
 * Scan key pages for broken local assets.
 */
const pages = [
  '/',
  '/blog/',
  '/emiratisation/',
  '/recruitment/',
  '/staff-outsourcing/',
  '/author/',
  '/author/nakul/',
  '/what-is-emiratisation/',
  '/nafis-benefits/',
];

const missing = new Map();
for (const p of pages) {
  const html = await (await fetch('http://127.0.0.1:5107' + p)).text();
  const assets = new Set();
  for (const m of html.matchAll(/(?:src|href)=["'](\/[^"']+\.(?:png|jpe?g|webp|gif|svg|css|woff2?))(?:\?[^"']*)?["']/gi)) {
    assets.add(m[1].split('?')[0]);
  }
  for (const m of html.matchAll(/url\((['"]?)(\/[^'")]+)\1\)/gi)) {
    const u = m[2].split('?')[0];
    if (/\.(png|jpe?g|webp|gif|svg|css|woff2?)$/i.test(u)) assets.add(u);
  }
  let pageMiss = 0;
  for (const u of assets) {
    const res = await fetch('http://127.0.0.1:5107' + u, { method: 'HEAD' });
    if (!res.ok) {
      pageMiss++;
      missing.set(u, (missing.get(u) || 0) + 1);
    }
  }
  console.log(p, 'assets', assets.size, 'missing', pageMiss);
}

console.log('\nTop missing:');
[...missing.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 40)
  .forEach(([u, n]) => console.log(n, u));
