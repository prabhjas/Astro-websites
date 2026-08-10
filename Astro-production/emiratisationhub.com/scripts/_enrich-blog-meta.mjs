/**
 * Enrich blog JSON with live og:image + dates (stripped from cleaned HTML).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG = join(ROOT, 'src/content/blog');
const ORIGIN = 'https://emiratisationhub.com';

const files = readdirSync(BLOG).filter((f) => f.endsWith('.json'));
let ok = 0;
let fail = 0;

for (const file of files) {
  const path = join(BLOG, file);
  const post = JSON.parse(readFileSync(path, 'utf8'));
  const slug = post.slug || file.replace(/\.json$/, '');
  try {
    const res = await fetch(`${ORIGIN}/${slug}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) {
      fail++;
      console.warn('FAIL', slug, res.status);
      continue;
    }
    const html = await res.text();
    const meta = (name) => {
      const re1 = new RegExp(
        `<meta[^>]+(?:property|name)=["']${name}["'][^>]+content=["']([^"']+)["']`,
        'i',
      );
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${name}["']`,
        'i',
      );
      return html.match(re1)?.[1] || html.match(re2)?.[1] || '';
    };
    const ogImage = meta('og:image');
    const published = meta('article:published_time');
    const modified = meta('article:modified_time');
    if (ogImage) {
      let src = ogImage;
      try {
        src = new URL(ogImage).pathname;
      } catch {
        /* keep */
      }
      post.featuredImage = {
        src,
        alt: post.title,
        originalUrl: src,
      };
      post.og = { ...(post.og || {}), image: src };
      post.twitter = { ...(post.twitter || {}), image: src };
    }
    if (published) post.publishedAt = new Date(published).toISOString();
    if (modified) post.modifiedAt = new Date(modified).toISOString();
    writeFileSync(path, JSON.stringify(post, null, 2) + '\n');
    ok++;
    console.log('OK', slug, post.featuredImage?.src || 'no-img');
  } catch (err) {
    fail++;
    console.warn('ERR', slug, err.message);
  }
}
console.log(`enriched ${ok}, failed ${fail}`);
