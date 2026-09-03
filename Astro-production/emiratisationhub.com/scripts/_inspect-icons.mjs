const pages = ['http://127.0.0.1:4332/', 'http://127.0.0.1:4332/blog/'];
for (const url of pages) {
  const html = await (await fetch(url)).text();
  const iconCss = [...html.matchAll(/href="([^"]*(?:fontawesome|font-awesome|eicons|elementor-icons)[^"]*)"/gi)].map((m) => m[1]);
  console.log('\n', url);
  console.log('icon css links:', [...new Set(iconCss)].slice(0, 12));
  console.log('has astro-fa-core-css in html', html.includes('astro-fa-core-css'));
}

const cssUrls = [
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/fontawesome.min.css',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/solid.min.css',
  '/wp-content/plugins/elementor/assets/lib/font-awesome/css/brands.min.css',
  '/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css',
  '/wp-content/cache/min/1/wp-content/plugins/elementor/assets/lib/eicons/css/elementor-icons.min.css',
];

for (const u of cssUrls) {
  const r = await fetch('http://127.0.0.1:4332' + u);
  const text = await r.text();
  const woff = [...text.matchAll(/url\(['"]?([^'")]+(?:woff2?|ttf|eot|svg)[^'")]*)/gi)].slice(0, 2).map((m) => m[1]);
  console.log('\n', u, 'status', r.status);
  console.log('  font refs:', woff);
  if (woff[0]) {
    const fontUrl = woff[0].startsWith('http') ? woff[0] : 'http://127.0.0.1:4332' + (woff[0].startsWith('/') ? '' : '/wp-content/plugins/elementor/assets/lib/font-awesome/css/') + woff[0].replace(/^\.\.\//, '../').replace(/^\.\//, '');
    const resolved = woff[0].startsWith('http') ? woff[0] : new URL(woff[0], 'http://127.0.0.1:4332' + u).href;
    const fr = await fetch(resolved);
    console.log('  font', resolved, '->', fr.status);
  }
}
