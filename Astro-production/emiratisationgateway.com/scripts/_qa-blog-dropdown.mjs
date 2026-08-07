async function inspect(url, label) {
  const html = await (await fetch(url)).text();
  const select = (html.match(/<select[\s\S]*?<\/select>/i) || [''])[0].slice(0, 700);
  const hasCustomCss = /astro-cat-select/.test(html);
  const mirror = (html.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0];
  // elementor filter dropdowns
  const filters = [...html.matchAll(/class="[^"]*(?:elementor-portfolio|elementor-filter|e-filter|posts-filter)[^"]*"/gi)].slice(0, 5).map((m) => m[0]);
  const catWidget = (html.match(/Categories[\s\S]{0,400}?<select[\s\S]*?<\/select>/i) || [''])[0].slice(0, 500);
  console.log('\n===', label, '===');
  console.log({ hasCustomCss, mirror, filters, selectLen: select.length });
  console.log('select', select.replace(/\s+/g, ' ').slice(0, 400));
  console.log('near Categories', catWidget.replace(/\s+/g, ' ').slice(0, 350));
}
await inspect('http://127.0.0.1:5106/blog/', 'LOCAL blog');
await inspect('https://emiratisationgateway.com/blog/', 'LIVE blog');
await inspect('http://127.0.0.1:5106/category/emiratisation/', 'LOCAL cat');
