#!/usr/bin/env node
/**
 * Backfill tags and category slugs on migrated blog posts from WP REST API.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const BLOG_DIR = join(ROOT, 'src/content/blog');
const TAX_DIR = join(ROOT, 'src/content/taxonomies');
const ORIGIN = 'https://connectgroup.co';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ConnectGroupAstro/1.0)' },
  });
  if (!res.ok) throw new Error(`Failed ${url}: ${res.status}`);
  return res.json();
}

async function fetchAllTags() {
  const tags = [];
  let page = 1;
  while (true) {
    const batch = await fetchJson(`${ORIGIN}/wp-json/wp/v2/tags?per_page=100&page=${page}`);
    if (!batch.length) break;
    tags.push(...batch.map((t) => ({ name: t.name, slug: t.slug })));
    if (batch.length < 100) break;
    page++;
  }
  return tags;
}

async function fetchPostTerms(slug) {
  const data = await fetchJson(
    `${ORIGIN}/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_embed`,
  );
  const post = data[0];
  if (!post) return null;

  const categories = [];
  const tags = [];
  for (const group of post._embedded?.['wp:term'] || []) {
    for (const term of group) {
      if (term.taxonomy === 'category') {
        categories.push({
          name: term.name,
          slug: term.slug,
          url: `/category/${term.slug}/`,
        });
      }
      if (term.taxonomy === 'post_tag') {
        tags.push({
          name: term.name,
          slug: term.slug,
          url: `/tag/${term.slug}/`,
        });
      }
    }
  }
  return { categories, tags };
}

async function main() {
  console.log('Fetching tags from WordPress...');
  const allTags = await fetchAllTags();
  mkdirSync(TAX_DIR, { recursive: true });
  writeFileSync(join(TAX_DIR, 'tags.json'), JSON.stringify(allTags, null, 2));
  console.log(`Saved ${allTags.length} tags`);

  const files = readdirSync(BLOG_DIR).filter((f) => f.endsWith('.json'));
  let updated = 0;

  for (const file of files) {
    const path = join(BLOG_DIR, file);
    const post = JSON.parse(readFileSync(path, 'utf8'));
    try {
      const terms = await fetchPostTerms(post.slug);
      if (!terms) continue;
      post.categories = terms.categories.length ? terms.categories : post.categories;
      post.tags = terms.tags;
      writeFileSync(path, JSON.stringify(post, null, 2));
      updated++;
      if (updated % 25 === 0) console.log(`  Updated ${updated}/${files.length}`);
    } catch (e) {
      console.warn(`  Skip ${post.slug}: ${e.message}`);
    }
  }

  console.log(`Done. Updated ${updated} posts.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
