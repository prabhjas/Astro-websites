const blog = await (await fetch('/blog/')).text();
const arts = [...blog.matchAll(/<article[^>]*ecs-post-loop[\s\S]*?<\/article>/g)].map((m) => m[0]);
console.log('articles', arts.length);
const t1975 = arts.filter((a) => a.includes('elementor-1975')).length;
const t1985 = arts.filter((a) => a.includes('elementor-1985')).length;
console.log({ t1975, t1985 });
const a1985 = arts.find((a) => a.includes('elementor-1985')) || '';
const cleaned = a1985
  .replace(/data-lazy-srcset="[^"]*"/g, '')
  .replace(/data-lazy-sizes="[^"]*"/g, '')
  .replace(/srcset="[^"]*"/g, '')
  .replace(/src="data:image[^"]*"/g, 'src="FEATURED"')
  .replace(/data-lazy-src="[^"]*"/g, 'data-lazy-src="FEATURED"')
  .replace(/href="https:\/\/emiratisationhub\.com\/[^"]*"/g, 'href="POST_URL"');
console.log(cleaned.slice(0, 4000));
