import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const live = await (await fetch('https://emiratisationgateway.com/blog/')).text();
const settings = [...live.matchAll(/data-settings="([^"]*load_method[^"]*)"/g)].map((m) =>
  m[1].replace(/&quot;/g, '"'),
);
console.log('ecs settings', settings.slice(0, 3));

const author = await (await fetch('https://emiratisationgateway.com/author/binju-t-r/')).text();
console.log('author title', (author.match(/<title>([^<]+)/) || [])[1]);
console.log('author articles', (author.match(/ecs-post-loop/g) || []).length);
console.log('author loop ids', [...new Set([...(author.matchAll(/elementor-(\d{3,5})/g) || [])].map((m) => m[1]))].slice(0, 12));

const cat = await (await fetch('https://emiratisationgateway.com/category/emiratisation/')).text();
console.log('cat title', (cat.match(/<title>([^<]+)/) || [])[1]);
console.log('cat articles', (cat.match(/ecs-post-loop/g) || []).length);
console.log('cat loop ids', [...new Set([...(cat.matchAll(/elementor-(\d{3,5})/g) || [])].map((m) => m[1]))].slice(0, 12));

const dir = await (await fetch('https://emiratisationgateway.com/author/')).text();
console.log('dir title', (dir.match(/<title>([^<]+)/) || [])[1], 'len', dir.length);

// Save author + category first cards for templates
import * as cheerio from 'cheerio';
const $a = cheerio.load(author);
writeFileSync(
  'd:/Astro-websites/Astro-production/emiratisationgateway.com/.tmp-live-author-card.html',
  $a('.ecs-posts article, article.elementor-post').first().toString() || 'NONE',
);
const $c = cheerio.load(cat);
writeFileSync(
  'd:/Astro-websites/Astro-production/emiratisationgateway.com/.tmp-live-cat-card.html',
  $c('.ecs-posts article, article.elementor-post').first().toString() || 'NONE',
);

// Check shells across peers
for (const peer of ['pittant.com', 'emiratisationgate.org', 'emiratisationgateway.com']) {
  const base = join('d:/Astro-websites/Astro-production', peer, 'src/legacy');
  console.log(peer, {
    authorShell: existsSync(join(base, 'author-shell/template.html')),
    tagShell: existsSync(join(base, 'tag-shell/template.html')),
    authorCleaned: existsSync(join(base, 'author.cleaned.html')),
    authorsLegacy: existsSync(join(base, 'author'))
      ? readdirSync(join(base, 'author')).slice(0, 8)
      : [],
  });
}
