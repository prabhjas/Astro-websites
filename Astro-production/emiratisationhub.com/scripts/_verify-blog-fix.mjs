const local = await (await fetch('http://127.0.0.1:5107/blog/')).text();
const live = await (await fetch('/blog/')).text();

const localNav = (local.match(/<nav[^>]*elementor-pagination/gi) || []).length;
const liveNav = (live.match(/<nav[^>]*elementor-pagination/gi) || []).length;
console.log({ localNav, liveNav });

// Order of real sections
function realOrder(html, label) {
  const ecs = [...html.matchAll(/<div[^>]*class="[^"]*ecs-posts[^"]*"/gi)].map((m) => m.index);
  const latest = html.search(/>\s*Latest Blogs\s*</i);
  const filter = html.indexOf('class="filter-post"') >= 0 ? html.indexOf('class="filter-post"') : html.indexOf('filter-post');
  const nav = html.search(/<nav[^>]*elementor-pagination/i);
  console.log(label, { ecs, latest, filter, nav });
}
realOrder(local, 'LOCAL');
realOrder(live, 'LIVE');

// Latest Blogs layout: main-post uses grid from embedded CSS?
console.log('local flex override gone', !/filter-post \.main-post\.post-wrap\{display:flex/.test(local));
console.log('local hide pagination css', /elementor-pagination\{display:none/.test(local));

// Confirm page 2 has no nav + same titles
const local2 = await (await fetch('http://127.0.0.1:5107/blog/page/2/')).text();
console.log('page2 nav', (local2.match(/<nav[^>]*elementor-pagination/gi) || []).length);
console.log('page2 title', (local2.match(/<title>([^<]+)/i) || [])[1]);
