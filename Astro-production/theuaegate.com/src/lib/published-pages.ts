/**
 * Published marketing-page allowlist (from spreadsheet column D = Done).
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

const ROOT = process.cwd();
const FILE = join(ROOT, 'src/data/published-pages.yml');

export type PublishedPage = {
  slug: string;
  path: string;
};

let cache: { slugs: Set<string>; pages: PublishedPage[] } | null = null;

export function loadPublishedPages(): PublishedPage[] {
  if (cache) return cache.pages;
  if (!existsSync(FILE)) {
    cache = { slugs: new Set(), pages: [] };
    return cache.pages;
  }
  const data = parse(readFileSync(FILE, 'utf8')) ?? {};
  const list = Array.isArray(data.pages) ? data.pages : [];
  const pages: PublishedPage[] = [];
  for (const row of list) {
    const slug = String(row?.slug ?? '').trim();
    const path =
      String(row?.path ?? '').trim() ||
      (slug === '' ? '/' : `/${slug}/`);
    pages.push({ slug, path });
  }
  cache = {
    pages,
    slugs: new Set(pages.map((p) => p.slug)),
  };
  return cache.pages;
}

export function getPublishedPageSlugs(): Set<string> {
  loadPublishedPages();
  return cache!.slugs;
}

/** Homepage uses slug "" in the allowlist. */
export function isPublishedPageSlug(slug: string): boolean {
  return getPublishedPageSlugs().has(slug);
}
