/**
 * Backfill empty post categories from WP REST API.
 * Usage: node scripts/backfill-categories-from-wp.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'src/content/blog');
const TAX_DIR = path.join(ROOT, 'src/content/taxonomies');
const ORIGIN = 'https://connectfreelance.ae';

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'connectfreelance-backfill/1.0' },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchAllPosts() {
  const out = [];
  let page = 1;
  while (true) {
    const batch = await fetchJson(
      `${ORIGIN}/wp-json/wp/v2/posts?per_page=100&page=${page}&_fields=slug,categories`,
    );
    if (!Array.isArray(batch) || !batch.length) break;
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return out;
}

async function fetchAllCategories() {
  const out = [];
  let page = 1;
  while (true) {
    const batch = await fetchJson(
      `${ORIGIN}/wp-json/wp/v2/categories?per_page=100&page=${page}&_fields=id,slug,name,link,count`,
    );
    if (!Array.isArray(batch) || !batch.length) break;
    out.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return out;
}

function toLocalCat(cat) {
  return {
    name: cat.name,
    slug: cat.slug,
    url: `/category/${cat.slug}/`,
  };
}

async function main() {
  console.log('Fetching WP categories…');
  const cats = await fetchAllCategories();
  const byId = new Map(cats.map((c) => [c.id, c]));
  console.log(`categories: ${cats.length}`);

  console.log('Fetching WP posts…');
  const posts = await fetchAllPosts();
  console.log(`posts: ${posts.length}`);

  let updated = 0;
  let missing = 0;
  const used = new Map();

  for (const wp of posts) {
    const file = path.join(BLOG_DIR, `${wp.slug}.json`);
    if (!fs.existsSync(file)) {
      missing += 1;
      continue;
    }
    const local = JSON.parse(fs.readFileSync(file, 'utf8'));
    const categories = (wp.categories || [])
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map(toLocalCat)
      // Prefer real categories over Uncategorized when others exist
      .filter((c, _, arr) => (arr.length > 1 ? c.slug !== 'uncategorized' : true));

    if (!categories.length) continue;

    local.categories = categories;
    for (const c of categories) {
      used.set(c.slug, { name: c.name, slug: c.slug, url: c.url });
    }
    fs.writeFileSync(file, JSON.stringify(local, null, 2) + '\n');
    updated += 1;
  }

  fs.mkdirSync(TAX_DIR, { recursive: true });
  const taxPath = path.join(TAX_DIR, 'categories.json');
  const taxList = [...used.values()].sort((a, b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync(taxPath, JSON.stringify(taxList, null, 2) + '\n');

  console.log(`updated posts: ${updated}`);
  console.log(`wp posts without local file: ${missing}`);
  console.log(`taxonomy categories written: ${taxList.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
