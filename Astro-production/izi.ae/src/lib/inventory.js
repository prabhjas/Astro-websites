import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LEGACY_DIR = join(ROOT, 'src/legacy');
const INVENTORY = join(ROOT, 'src/data/sitemap-inventory.json');

/**
 * @returns {{
 *   pages: { slug: string, url: string }[],
 *   posts: { slug: string, url: string }[],
 *   cars?: { slug: string, url: string }[],
 * }}
 */
export function loadInventory() {
  if (!existsSync(INVENTORY)) {
    return { pages: [], posts: [], cars: [] };
  }
  try {
    const data = JSON.parse(readFileSync(INVENTORY, 'utf8'));
    return {
      pages: data.pages || [],
      posts: data.posts || [],
      cars: data.cars || [],
    };
  } catch {
    return { pages: [], posts: [], cars: [] };
  }
}

/** Recursively list cleaned HTML slugs under src/legacy (supports nested paths). */
function listCleanedSlugs(dir = LEGACY_DIR, prefix = '') {
  if (!existsSync(dir)) return [];
  /** @type {string[]} */
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory()) {
      // Skip chrome/shell helper folders
      if (['chrome', 'blog-shell', 'tag-shell', 'author-shell'].includes(name.name)) continue;
      out.push(...listCleanedSlugs(join(dir, name.name), prefix ? `${prefix}/${name.name}` : name.name));
      continue;
    }
    if (!name.name.endsWith('.cleaned.html')) continue;
    const slug = name.name.replace(/\.cleaned\.html$/, '');
    out.push(prefix ? `${prefix}/${slug}` : slug);
  }
  return out;
}

/** Slugs that have cleaned HTML ready (excluding homepage which is routed at /). */
export function listPreparedSlugs() {
  return listCleanedSlugs()
    .filter((slug) => slug !== 'homepage')
    .sort((a, b) => a.localeCompare(b));
}

/** All prepared slugs including homepage → empty path for `/`. */
export function listAllPreparedPaths() {
  return listCleanedSlugs()
    .map((slug) => (slug === 'homepage' ? '' : slug))
    .sort((a, b) => a.localeCompare(b));
}

export function isPostSlug(slug) {
  const inv = loadInventory();
  return inv.posts.some((p) => p.slug === slug);
}

export function isCarSlug(slug) {
  const inv = loadInventory();
  return (inv.cars || []).some((p) => p.slug === slug);
}

export function isPageSlug(slug) {
  const inv = loadInventory();
  const normalised = slug === '' || slug === 'homepage' ? 'homepage' : slug;
  // Car CPT URLs are mirror pages (e.g. car/toyota-yaris-2024)
  return (
    inv.pages.some((p) => p.slug === normalised) ||
    (inv.cars || []).some((p) => p.slug === normalised)
  );
}
