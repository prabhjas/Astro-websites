const html = await (await fetch('http://127.0.0.1:5106/category/emiratisation/')).text();
const scripts = [...html.matchAll(/src="([^"]*\/js\/[^"]+)"/g)].map((m) => m[1]);
console.log({ scripts, hasMirror: /astro-mirror-fixes/.test(html), hasSelect: /id="cat"/.test(html) });

// Also confirm single-post Load More API from page attrs
const post = await (await fetch('http://127.0.0.1:5106/minimum-wage-in-uae/')).text();
const per = (post.match(/data-per-page="(\d+)"/) || [])[1];
const off = (post.match(/data-offset="(\d+)"/) || [])[1];
const api = await (
  await fetch(`http://127.0.0.1:5106/api/blog/load-more/?page=2&perPage=${per}&offset=${off}&exclude=minimum-wage-in-uae`)
).json();
console.log({ loadMoreWired: /data-cs-blog-load-more/.test(post), per, off, apiCards: (api.html.match(/<article/g) || []).length });
