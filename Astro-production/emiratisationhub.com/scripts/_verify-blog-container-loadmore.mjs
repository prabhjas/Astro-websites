const html = await (await fetch('http://127.0.0.1:4332/blog/')).text();

console.log({
  has1280: html.includes('max-width:1280px'),
  hasArchiveFix: html.includes('astro-archive-fix-css'),
  hasLoadMoreBtn: html.includes('data-astro-blog-load-more'),
  hasLoadMoreWrap: html.includes('astro-blog-load-more-wrap'),
  totalPosts: (html.match(/main-post post-wrap/g) || []).length,
  scriptVersion: (html.match(/astro-mirror-fixes\.js\?v=([^"']+)/) || [])[1],
});
