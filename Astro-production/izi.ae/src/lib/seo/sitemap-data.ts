/**
 * Sitemap data layer — IZI Rent a Car inventory + dashboard blog JSON.
 */
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { getAllBlogPosts } from '../blog.ts';
import { listAllPreparedPaths, loadInventory } from '../inventory.js';
import {
  SITEMAP_ENTRY_LIMIT,
  type SitemapEntry,
} from './sitemap-config.ts';
import {
  pathFromSitemapUrl,
  readSitemapOverridesSync,
  type SitemapOverride,
} from './sitemap-overrides-store.ts';
import { absoluteUrl, resolveSiteOrigin, type ResolveSiteOriginOptions } from './site-url.ts';
import {
  chunkEntries,
  dedupeEntries,
  sitemapChunkFilename,
  sortEntries,
} from './sitemap-utils.ts';
import { buildIndexItemsFromChunks, type SitemapIndexItem } from './sitemap-xml.ts';

const ROOT = process.cwd();
const LEGACY_DIR = join(ROOT, 'src/legacy');

export type SitemapDataOptions = ResolveSiteOriginOptions & {
  entryLimit?: number;
  adminDir?: string;
};

function lastmodForSlug(slug: string): string | undefined {
  const fileSlug = slug === '' ? 'homepage' : slug;
  const path = join(LEGACY_DIR, `${fileSlug}.cleaned.html`);
  if (!existsSync(path)) return undefined;
  return statSync(path).mtime.toISOString();
}

function pathForSlug(slug: string): string {
  if (!slug || slug === 'homepage') return '/';
  return `/${slug}/`;
}

function applyOverrides(
  entries: SitemapEntry[],
  siteOrigin: string,
  overrides: Record<string, SitemapOverride>,
): SitemapEntry[] {
  if (!Object.keys(overrides).length) return entries;
  return entries.map((entry) => {
    const path = pathFromSitemapUrl(entry.url, siteOrigin);
    if (!path) return entry;
    const override = overrides[path];
    if (!override) return entry;
    return {
      ...entry,
      ...(override.priority != null ? { priority: override.priority } : {}),
      ...(override.changefreq ? { changefreq: override.changefreq } : {}),
    };
  });
}

function collectFromInventory(
  siteOrigin: string,
  overrides: Record<string, SitemapOverride>,
): { pages: SitemapEntry[]; posts: SitemapEntry[]; cars: SitemapEntry[] } {
  const inventory = loadInventory();
  const prepared = new Set(listAllPreparedPaths());

  const pageSlugs = inventory.pages.length
    ? inventory.pages.map((p) => (p.slug === 'homepage' ? '' : p.slug))
    : [...prepared].filter((s) => s === '');

  const pages: SitemapEntry[] = [];
  for (const slug of pageSlugs) {
    if (slug !== '' && slug !== 'blog' && !prepared.has(slug)) continue;
    if (slug === '' && !prepared.has('')) continue;
    pages.push({
      url: absoluteUrl(siteOrigin, pathForSlug(slug)),
      lastmod: lastmodForSlug(slug === 'blog' ? 'blog' : slug),
      changefreq: slug === '' ? 'weekly' : 'monthly',
      priority: slug === '' ? 1.0 : 0.8,
      type: 'page',
    });
  }

  const posts: SitemapEntry[] = getAllBlogPosts().map((post) => ({
    url: absoluteUrl(siteOrigin, pathForSlug(post.slug)),
    lastmod: post.modifiedAt || post.publishedAt,
    changefreq: 'monthly' as const,
    priority: 0.6,
    type: 'post' as const,
  }));

  const cars: SitemapEntry[] = [];
  for (const car of inventory.cars || []) {
    const slug = car.slug;
    if (!prepared.has(slug)) continue;
    cars.push({
      url: absoluteUrl(siteOrigin, pathForSlug(slug)),
      lastmod: lastmodForSlug(slug),
      changefreq: 'monthly',
      priority: 0.7,
      type: 'page',
    });
  }

  return {
    pages: sortEntries(dedupeEntries(applyOverrides(pages, siteOrigin, overrides))),
    posts: sortEntries(dedupeEntries(applyOverrides(posts, siteOrigin, overrides))),
    cars: sortEntries(dedupeEntries(applyOverrides(cars, siteOrigin, overrides))),
  };
}

export function collectPageEntries(
  siteOrigin: string,
  overrides: Record<string, SitemapOverride> = {},
): SitemapEntry[] {
  return collectFromInventory(siteOrigin, overrides).pages;
}

export function collectPostEntries(
  siteOrigin: string,
  overrides: Record<string, SitemapOverride> = {},
): SitemapEntry[] {
  return collectFromInventory(siteOrigin, overrides).posts;
}

export function collectCarEntries(
  siteOrigin: string,
  overrides: Record<string, SitemapOverride> = {},
): SitemapEntry[] {
  return collectFromInventory(siteOrigin, overrides).cars;
}

export type SitemapDataset = {
  siteOrigin: string;
  entryLimit: number;
  pages: SitemapEntry[];
  posts: SitemapEntry[];
  cars: SitemapEntry[];
  pageChunks: SitemapEntry[][];
  postChunks: SitemapEntry[][];
  carChunks: SitemapEntry[][];
  indexItems: SitemapIndexItem[];
};

export function buildSitemapDataset(options: SitemapDataOptions = {}): SitemapDataset {
  const siteOrigin = resolveSiteOrigin(options);
  const entryLimit = options.entryLimit ?? SITEMAP_ENTRY_LIMIT;
  const overrides = options.adminDir
    ? readSitemapOverridesSync(options.adminDir).entries
    : {};
  const { pages, posts, cars } = collectFromInventory(siteOrigin, overrides);
  const pageChunks = chunkEntries(pages, entryLimit);
  const postChunks = chunkEntries(posts, entryLimit);
  const carChunks = chunkEntries(cars, entryLimit);
  const indexItems = buildIndexItemsFromChunks(
    siteOrigin,
    pageChunks,
    postChunks,
    sitemapChunkFilename,
  );

  // Live Rank Math emits car-sitemap.xml for the car CPT
  const origin = siteOrigin.replace(/\/$/, '');
  const carNewest = cars
    .map((e) => e.lastmod)
    .filter(Boolean)
    .sort()
    .at(-1);
  if (cars.length) {
    indexItems.push({
      loc: `${origin}/car-sitemap.xml`,
      lastmod: carNewest,
    });
  }

  return {
    siteOrigin,
    entryLimit,
    pages,
    posts,
    cars,
    pageChunks,
    postChunks,
    carChunks,
    indexItems,
  };
}
