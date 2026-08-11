/**
 * Write src/data/wp-blog-order.json in live blog archive order (publishedAt DESC).
 * Sitemap order is NOT the same as /blog/ listing order on WordPress.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const OUT = join(ROOT, 'src/data/wp-blog-order.json');

const posts = readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const p = JSON.parse(readFileSync(join(BLOG_DIR, f), 'utf8'));
    return {
      slug: p.slug || f.replace(/\.json$/, ''),
      publishedAt: p.publishedAt || '',
    };
  })
  .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

writeFileSync(OUT, `${JSON.stringify(posts.map((p) => p.slug), null, 2)}\n`);
console.log('wrote', posts.length, 'first=', posts[0]?.slug);
