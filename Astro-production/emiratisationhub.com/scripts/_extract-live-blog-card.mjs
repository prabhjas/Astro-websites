const live = await (await fetch('https://emiratisationhub.com/')).text();
const local = await (await fetch('http://127.0.0.1:5107/')).text();

function menuItems(html) {
  const m = html.match(/elementor-nav-menu--main[\s\S]{0,4000}/);
  if (!m) return [];
  return [...m[0].matchAll(/class="elementor-item[^"]*"[^>]*>([^<]+)</g)].map((x) => x[1].trim());
}
console.log('live menu', menuItems(live));
console.log('local menu', menuItems(local));

// Live article 1975 structure
const blog = await (await fetch('https://emiratisationhub.com/blog/')).text();
const art = blog.match(/<article[^>]*id="post-3951"[\s\S]*?<\/article>/);
console.log('\n--- LIVE CARD 1975 ---');
console.log(art?.[0]?.slice(0, 3500));

// Check post CSS for loop 1975
console.log('\npost-1975?', blog.includes('post-1975.css') || blog.includes('elementor-1975'));
const cssLinks = [...blog.matchAll(/href=['"]([^'"]*post-1975[^'"]*)['"]/g)].map((m) => m[1]);
console.log('css', cssLinks);

// FAQ icon markup live
const faqLive = live.match(/elementor-accordion-icon[\s\S]{0,300}/);
console.log('\nfaq icon live', faqLive?.[0]?.replace(/\s+/g, ' ')?.slice(0, 250));
const faqLocal = local.match(/elementor-accordion-icon[\s\S]{0,300}/);
console.log('faq icon local', faqLocal?.[0]?.replace(/\s+/g, ' ')?.slice(0, 250));

// sticky parent id on post
const post = await (await fetch('http://127.0.0.1:5107/outsourcing-vs-insourcing/')).text();
const stickyParents = [...post.matchAll(/class="([^"]*)"[^>]*data-settings="[^"]*sticky[^"]*"/gi)].map((m) =>
  m[1].split(/\s+/).find((c) => c.startsWith('elementor-element-')),
);
console.log('sticky classes', stickyParents.slice(0, 8));
