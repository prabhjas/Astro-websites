const pages = ['/', '/blog/', '/author/', '/what-is-emiratisation/', '/emiratisation/', '/blog/page/2/'];
for (const p of pages) {
  const html = await (await fetch('http://127.0.0.1:5107' + p)).text();
  const nav = [...html.matchAll(/\bhref=(["'])(https:\/\/(?:www\.)?emiratisationhub\.com[^"']*)\1/gi)].map(
    (m) => m[2],
  );
  const uniq = [...new Set(nav)];
  console.log('\n' + p + ' nav abs hrefs:', uniq.length);
  for (const u of uniq) console.log(' ', u);
}

// Compare blog card count local vs live
const localBlog = await (await fetch('http://127.0.0.1:5107/blog/')).text();
const liveBlog = await (await fetch('https://emiratisationhub.com/blog/')).text();
console.log('\nblog cards local', (localBlog.match(/e-loop-item|elementor-post\b/g) || []).length);
console.log('blog cards live', (liveBlog.match(/e-loop-item|elementor-post\b/g) || []).length);
console.log('local pagination', [...localBlog.matchAll(/\/blog\/page\/(\d+)\//g)].map((m) => m[1]));
console.log('live pagination', [...liveBlog.matchAll(/\/blog\/page\/(\d+)\//g)].map((m) => m[1]));

// Service pages menu presence
const home = await (await fetch('http://127.0.0.1:5107/')).text();
for (const s of ['/emiratisation/', '/recruitment/', '/staff-outsourcing/']) {
  console.log('menu has', s, home.includes(`href="${s}"`) || home.includes(`href='${s}'`));
}
