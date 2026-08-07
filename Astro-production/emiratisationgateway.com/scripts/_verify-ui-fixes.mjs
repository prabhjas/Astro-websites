const html = await (await fetch('http://127.0.0.1:5106/minimum-wage-in-uae/')).text();
const out = {
  hasDataCs: /data-cs-blog-load-more/.test(html),
  hasJs: /blog-load-more\.js/.test(html),
  perPage: (html.match(/data-per-page="(\d+)"/) || [])[1],
  offset: (html.match(/data-offset="(\d+)"/) || [])[1],
  mirrorV: (html.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
  css1828: /post-1828\.css/.test(html),
  brandSelectCss: /select#cat/.test(html) || /accent-color:var\(--ast-global-color-0/.test(html),
};
console.log(JSON.stringify(out, null, 2));

const api = await (
  await fetch(
    'http://127.0.0.1:5106/api/blog/load-more/?page=2&perPage=3&offset=3&exclude=minimum-wage-in-uae',
  )
).json();
console.log({
  ok: api.ok,
  htmlLen: (api.html || '').length,
  hasMore: api.hasMore,
  cards: (api.html.match(/<article/g) || []).length,
});

const a = await fetch('http://127.0.0.1:5106/wp-content/uploads/elementor/css/post-1828.css');
const css = await a.text();
console.log('post-1828', a.status, css.includes('header-city-emirati'), css.includes('https://emiratisationgateway.com') ? 'still-absolute' : 'localized');

const img = await fetch('http://127.0.0.1:5106/wp-content/uploads/2023/07/header-city-emirati.jpg');
console.log('header img', img.status);

const author = await (await fetch('http://127.0.0.1:5106/author/binju-t-r/')).text();
console.log({
  authorHas1828: /post-1828\.css/.test(author),
  authorMirror: (author.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
  authorHeroBg: /header-city-emirati/.test(author) || /post-1828/.test(author),
});

// category dropdown accent present via mirror css injection (runtime)
const cat = await (await fetch('http://127.0.0.1:5106/category/emiratisation/')).text();
console.log({
  catHasSelect: /id="cat"/.test(cat),
  catPagCurrent: /page-numbers current/.test(cat),
  catMirror: (cat.match(/astro-mirror-fixes\.js\?v=[^"']+/) || [])[0],
});
