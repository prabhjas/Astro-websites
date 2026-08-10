async function check(url, label) {
  const html = await (await fetch(url)).text();
  const select = (html.match(/<select[\s\S]*?<\/select>/i) || [''])[0].slice(0, 500);
  const pag = (html.match(/<div class="ast-pagination"[\s\S]*?<\/div>\s*<\/div>/) || html.match(/page-numbers[\s\S]{0,400}/) || ['none'])[0].slice(0, 600);
  const catCss = (html.match(/data-astro-cat-ui-css[\s\S]*?<\/style>/) || ['none'])[0].slice(0, 800);
  const color0 = (html.match(/--ast-global-color-0:\s*([^;]+)/) || [])[1];
  const pagRules = [...html.matchAll(/\.ast-pagination[^{]*\{[^}]+\}/g)].slice(0, 8).map((m) => m[0]);
  console.log('\n===', label, '===');
  console.log({ color0, hasInlineCatCss: /data-astro-cat-ui-css/.test(html) });
  console.log('pag snippet', pag.replace(/\s+/g, ' '));
  console.log('pag rules', pagRules);
  console.log('select open?', /selected="selected"/.test(select));
}

await check('http://127.0.0.1:5106/category/emiratisation/', 'LOCAL cat');
await check('https://emiratisationgateway.com/category/emiratisation/', 'LIVE cat');
await check('http://127.0.0.1:5106/minimum-wage-in-uae/', 'LOCAL post');
await check('https://emiratisationgateway.com/minimum-wage-in-uae/', 'LIVE post');

// Find post pagination / nav links on single post
const post = await (await fetch('http://127.0.0.1:5106/minimum-wage-in-uae/')).text();
for (const re of [
  /post-navigation[\s\S]{0,500}/i,
  /nav-links[\s\S]{0,500}/i,
  /ast-single-post-navigation|ast-page-pagination|pagination[\s\S]{0,400}/i,
  /page-links[\s\S]{0,300}/i,
]) {
  const m = post.match(re);
  if (m) console.log('post match', re.source.slice(0, 40), m[0].replace(/\s+/g, ' ').slice(0, 250));
}
