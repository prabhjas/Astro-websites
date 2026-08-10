import { writeFileSync } from 'node:fs';

const cat = await (await fetch('https://emiratisationgateway.com/category/emiratisation/')).text();
console.log('len', cat.length);
console.log('article count', (cat.match(/<article/g) || []).length);
console.log('has elementor-posts', cat.includes('elementor-posts'));
console.log('has ecs-posts', cat.includes('ecs-posts'));
console.log('has type-post', /type-post/.test(cat));
const idx = cat.indexOf('elementor-posts');
console.log('around posts', cat.slice(Math.max(0, idx), Math.max(0, idx) + 500));
writeFileSync(
  'd:/Astro-websites/Astro-production/emiratisationgateway.com/.tmp-live-category-snippet.html',
  cat.slice(0, 5000),
);

const sample = await (
  await fetch('https://emiratisationgateway.com/wp-json/wp/v2/posts?per_page=3&_embed=1')
).json();
for (const p of sample) {
  console.log({
    slug: p.slug,
    cats: p.categories,
    author: p.author,
    embeddedCats: p._embedded?.['wp:term']?.[0]?.map((c) => c.slug),
    authorSlug: p._embedded?.author?.[0]?.slug,
  });
}
