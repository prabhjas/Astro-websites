/**
 * Compare live vs local robots + sitemap counts; patch robots default to match live.
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = 'd:/Astro-websites/Astro-production/emiratisationgateway.com';

let liveRobots = '';
try {
  liveRobots = await (await fetch('https://emiratisationgateway.com/robots.txt')).text();
  console.log('LIVE robots:\n', liveRobots);
} catch (e) {
  console.log('live robots fetch failed', e.message);
}

const localRobots = await (await fetch('http://127.0.0.1:5106/robots.txt')).text();
console.log('LOCAL robots:\n', localRobots);

// Prefer live content if fetched, else a faithful reconstruction from earlier live probe
const matchedLive = `User-agent: *
Disallow: /*.html
Disallow: /tag/
Disallow: /category/
Disallow: /feed/
Disallow: /wp-admin/
Disallow: /author/
Disallow: /sample-page/
Disallow: /cdn-cgi/
User-agent: GPTBot
Allow: /
User-agent: Google-Extended
Allow: /
User-agent: Claude-Web
Allow: /
User-agent: PerplexityBot
Allow: /

Sitemap: https://emiratisationgateway.com/sitemap_index.xml
`;

const body = (liveRobots && /User-agent:/i.test(liveRobots) ? liveRobots.trim() + '\n' : matchedLive)
  // ensure sitemap line absolute canonical
  .replace(/Sitemap:\s*\S+/i, 'Sitemap: https://emiratisationgateway.com/sitemap_index.xml');

// Write as default (with header comment for fleet)
const out = `# Emiratisation Gateway - robots.txt defaults matching live
# FLOW can override via managed text file.

${body.replace(/^#.*\n/gm, '').trim()}\n`;

writeFileSync(join(root, 'src/data/robots-live-default.txt'), out);
console.log('wrote robots-live-default.txt');

// live sitemap counts if possible
try {
  const page = await (await fetch('https://emiratisationgateway.com/page-sitemap.xml')).text();
  const post = await (await fetch('https://emiratisationgateway.com/post-sitemap.xml')).text();
  const pl = (page.match(/<loc>/g) || []).length;
  const po = (post.match(/<loc>/g) || []).length;
  console.log({ livePages: pl, livePosts: po });
} catch (e) {
  console.log('live sitemap fetch failed', e.message);
}
