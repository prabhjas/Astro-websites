const live2 = await (await fetch('https://emiratisationhub.com/blog/page/2/')).text();
const live1 = await (await fetch('https://emiratisationhub.com/blog/')).text();
function titles(html) {
  return [...html.matchAll(/elementor-(?:1975|1985)[\s\S]*?<h2[^>]*>\s*<a[^>]*>([^<]+)/gi)].map((m) =>
    m[1].replace(/&#038;/g, '&').trim(),
  );
}
console.log('LIVE p1', titles(live1));
console.log('LIVE p2', titles(live2));
console.log('LIVE p2 main-post count', (live2.match(/main-post/g) || []).length);
console.log('LIVE p1 main-post count', (live1.match(/main-post/g) || []).length);
