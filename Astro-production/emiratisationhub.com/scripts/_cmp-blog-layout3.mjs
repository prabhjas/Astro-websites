const local = await (await fetch('http://127.0.0.1:5107/blog/')).text();
const live = await (await fetch('https://emiratisationhub.com/blog/')).text();

function titles(html, label) {
  const arts = [...html.matchAll(/<article\b[\s\S]*?<h2[^>]*>\s*<a[^>]*>([^<]+)/gi)].map((m) => m[1].trim());
  console.log(label, 'article titles', arts.length);
  arts.slice(0, 8).forEach((t, i) => console.log(' ', i + 1, t.slice(0, 70)));
}

titles(local, 'LOCAL');
titles(live, 'LIVE');

// CSS links
function css(html, label) {
  const hrefs = [...html.matchAll(/href="([^"]+\.css[^"]*)"/gi)].map((m) => m[1].split('?')[0]);
  const interesting = hrefs.filter((h) => /post-1199|post-1975|post-1985|frontend|astra|archive|blog/i.test(h));
  console.log(label, 'css', [...new Set(interesting)]);
}
css(local, 'LOCAL');
css(live, 'LIVE');

// Check if elementor-grid-2 parent exists after inject
console.log('LOCAL grid-2', /elementor-grid-2/.test(local));
console.log('LIVE grid-2', /elementor-grid-2/.test(live));
console.log('LOCAL pagination count', (local.match(/elementor-pagination/g) || []).length);
console.log('LIVE pagination count', (live.match(/elementor-pagination/g) || []).length);

// Parent structure around second ecs after inject — is pagination inside right column?
const pi = local.indexOf('elementor-pagination');
console.log('pag parent ctx', local.slice(pi - 400, pi + 100).replace(/\s+/g, ' '));

// Check ARCHIVE override presence
console.log('has astro archive css', /astro-archive|ARCHIVE_FIX|filter-post \.main-post/.test(local));
console.log('live main-post grid css', /grid-template-columns:40% 58%/.test(live));
console.log('local main-post grid css', /grid-template-columns:40% 58%/.test(local));
console.log('local flex override', /filter-post \.main-post\.post-wrap\{display:flex/.test(local));
