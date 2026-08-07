import { readFileSync } from 'node:fs';

const html = readFileSync('src/legacy/minimum-wage-in-uae.cleaned.html', 'utf8');
const idx = html.indexOf('ecs-posts');
console.log('ecs-posts count', (html.match(/ecs-posts/g) || []).length);
const chunk = html.slice(idx, idx + 8000);
// count articles in first related grid
const articles = chunk.match(/<article[\s\S]*?<\/article>/gi) || [];
console.log('articles near first ecs', articles.length);
console.log('first article classes', (articles[0] || '').match(/class="[^"]+"/)?.[0]);
console.log('loop id', (articles[0] || '').match(/data-elementor-id="(\d+)"/)?.[1]);
console.log('widget settings', html.match(/data-settings="\{&quot;current_page&quot;:1[\s\S]*?a3d4398[\s\S]*?\}"/)?.[0]?.slice(0,400));

// How many posts rendered in related section
const relatedSection = html.match(/ecs-posts[\s\S]*?ecs-load-more-button/);
if (relatedSection) {
  const arts = relatedSection[0].match(/<article/gi) || [];
  console.log('posts before load more', arts.length);
  console.log('snippet card title', relatedSection[0].match(/<h[12][^>]*>[\s\S]*?<\/h[12]>/)?.[0]?.slice(0,200));
}

// Compare card builder options in blog.ts - look for loop 346 or similar
const blog = readFileSync('src/lib/blog.ts', 'utf8');
console.log('loop templates mentioned', blog.match(/elementor-id="\d+"/g));
