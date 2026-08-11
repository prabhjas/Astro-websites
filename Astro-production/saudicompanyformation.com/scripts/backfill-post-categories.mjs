#!/usr/bin/env node
/**
 * Backfill empty blog post categories from cleaned HTML mirrors
 * (og:article:section + /category/ links).
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG = join(ROOT, 'src/content/blog');
const LEGACY = join(ROOT, 'src/legacy');
const TAX = join(ROOT, 'src/content/taxonomies/categories.json');

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/&amp;/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractCategories(html) {
  const cats = [];
  const seen = new Set();
  const push = (name, slug, url) => {
    const s = (slug || slugify(name)).toLowerCase();
    if (!s || seen.has(s)) return;
    seen.add(s);
    cats.push({
      name: name.replace(/&amp;/g, '&').trim(),
      slug: s,
      url: url || `/category/${s}/`,
    });
  };

  for (const m of html.matchAll(
    /<meta\s+property=["']article:section["']\s+content=["']([^"']+)["']/gi,
  )) {
    push(m[1], slugify(m[1]));
  }
  for (const m of html.matchAll(/href=["'](\/category\/([^"'/]+)\/)["'][^>]*>([^<]+)/gi)) {
    push(m[3], m[2], m[1]);
  }
  for (const m of html.matchAll(/rel=["']category tag["'][^>]*href=["'](\/category\/([^"'/]+)\/)["'][^>]*>([^<]+)/gi)) {
    push(m[3], m[2], m[1]);
  }
  return cats;
}

const taxMap = new Map();
let updated = 0;
let stillEmpty = 0;

for (const name of readdirSync(BLOG)) {
  if (!name.endsWith('.json')) continue;
  const slug = name.replace(/\.json$/, '');
  const path = join(BLOG, name);
  const post = JSON.parse(readFileSync(path, 'utf8'));
  if (Array.isArray(post.categories) && post.categories.length) {
    for (const c of post.categories) taxMap.set(c.slug || slugify(c.name), c);
    continue;
  }
  const cleaned = join(LEGACY, `${slug}.cleaned.html`);
  if (!existsSync(cleaned)) {
    stillEmpty++;
    continue;
  }
  const cats = extractCategories(readFileSync(cleaned, 'utf8'));
  if (!cats.length) {
    stillEmpty++;
    continue;
  }
  post.categories = cats;
  writeFileSync(path, `${JSON.stringify(post, null, 2)}\n`, 'utf8');
  for (const c of cats) taxMap.set(c.slug, c);
  updated++;
  console.log('OK', slug, cats.map((c) => c.slug).join(','));
}

writeFileSync(
  TAX,
  `${JSON.stringify(
    [...taxMap.values()].sort((a, b) => String(a.slug).localeCompare(String(b.slug))),
    null,
    2,
  )}\n`,
  'utf8',
);
console.log(`Updated ${updated} posts; still empty ${stillEmpty}; categories ${taxMap.size}`);
