import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const LEGACY_DIR = join(ROOT, 'src/legacy');
const INVENTORY = join(ROOT, 'src/data/sitemap-inventory.json');

/**
 * @returns {{ pages: { slug: string, url: string }[], posts: { slug: string, url: string }[] }}
 */
export function loadInventory() {
  if (!existsSync(INVENTORY)) {
    return { pages: [], posts: [] };
  }
  try {
    return JSON.parse(readFileSync(INVENTORY, 'utf8'));
  } catch {
    return { pages: [], posts: [] };
  }
}

/** Slugs that have cleaned HTML ready (excluding homepage which is routed at /). */
export function listPreparedSlugs() {
  if (!existsSync(LEGACY_DIR)) return [];
  return readdirSync(LEGACY_DIR)
    .filter((name) => name.endsWith('.cleaned.html'))
    .map((name) => name.replace(/\.cleaned\.html$/, ''))
    .filter((slug) => slug !== 'homepage')
    .sort((a, b) => a.localeCompare(b));
}

/** All prepared slugs including homepage → empty path for `/`. */
export function listAllPreparedPaths() {
  if (!existsSync(LEGACY_DIR)) return [];
  return readdirSync(LEGACY_DIR)
    .filter((name) => name.endsWith('.cleaned.html'))
    .map((name) => name.replace(/\.cleaned\.html$/, ''))
    .map((slug) => (slug === 'homepage' ? '' : slug))
    .sort((a, b) => a.localeCompare(b));
}

export function isPostSlug(slug) {
  const inv = loadInventory();
  return inv.posts.some((p) => p.slug === slug);
}

export function isPageSlug(slug) {
  const inv = loadInventory();
  const normalised = slug === '' || slug === 'homepage' ? 'homepage' : slug;
  return inv.pages.some((p) => p.slug === normalised);
}
