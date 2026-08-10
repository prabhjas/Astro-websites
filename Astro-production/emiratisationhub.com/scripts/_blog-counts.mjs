const html = await (await fetch('/blog/')).text();
console.log({
  articles: (html.match(/<article\b/g) || []).length,
  t1975: (html.match(/elementor-1975/g) || []).length,
  t1985: (html.match(/elementor-1985/g) || []).length,
  pagination: [...html.matchAll(/page-numbers[^>]*>\s*(?:<span[^>]*>)?(\d+)/g)].map((m) => m[1]),
  loadMore: /load.?more|ecs-load/i.test(html),
});
