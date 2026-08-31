/**
 * Sitemap data layer — KPM Pro inventory + dashboard blog JSON.
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
import { getRedirectSourcePaths } from './redirected-routes.ts';
import {
  chunkEntries,
  dedupeEntries,
  resolveSitemapLoc,
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
): { pages: SitemapEntry[]; posts: SitemapEntry[] } {
  const inventory = loadInventory();
  const prepared = new Set(listAllPreparedPaths());

  const pageSlugs = inventory.pages.length
    ? inventory.pages.map((p) => (p.slug === 'homepage' ? '' : p.slug))
    : [...prepared].filter((s) => s === '');

  const redirectSources = getRedirectSourcePaths(ROOT);

  const pages: SitemapEntry[] = [];
  for (const slug of pageSlugs) {
    if (slug !== '' && slug !== 'blog' && !prepared.has(slug)) continue;
    if (slug === '' && !prepared.has('')) continue;
    const routePath = pathForSlug(slug);
    if (redirectSources.has(routePath)) continue;
    pages.push({
      url: absoluteUrl(siteOrigin, routePath),
      lastmod: lastmodForSlug(slug === 'blog' ? 'blog' : slug),
      changefreq: slug === '' ? 'weekly' : 'monthly',
      priority: slug === '' ? 1.0 : 0.8,
      type: 'page',
    });
  }

  const posts: SitemapEntry[] = [];
  for (const post of getAllBlogPosts()) {
    const routePath = pathForSlug(post.slug);
    if (redirectSources.has(routePath)) continue;
    const loc = resolveSitemapLoc(routePath, post.canonical, siteOrigin);
    if (!loc) continue;
    posts.push({
      url: loc,
      lastmod: post.modifiedAt || post.publishedAt,
      changefreq: 'monthly' as const,
      priority: 0.6,
      type: 'post' as const,
    });
  }

  return {
    pages: sortEntries(dedupeEntries(applyOverrides(pages, siteOrigin, overrides))),
    posts: sortEntries(dedupeEntries(applyOverrides(posts, siteOrigin, overrides))),
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

export type SitemapDataset = {
  siteOrigin: string;
  entryLimit: number;
  pages: SitemapEntry[];
  posts: SitemapEntry[];
  pageChunks: SitemapEntry[][];
  postChunks: SitemapEntry[][];
  indexItems: SitemapIndexItem[];
};

export function buildSitemapDataset(options: SitemapDataOptions = {}): SitemapDataset {
  const siteOrigin = resolveSiteOrigin(options);
  const entryLimit = options.entryLimit ?? SITEMAP_ENTRY_LIMIT;
  const overrides = options.adminDir
    ? readSitemapOverridesSync(options.adminDir).entries
    : {};
  const { pages, posts } = collectFromInventory(siteOrigin, overrides);
  const pageChunks = chunkEntries(pages, entryLimit);
  const postChunks = chunkEntries(posts, entryLimit);
  const indexItems = buildIndexItemsFromChunks(
    siteOrigin,
    pageChunks,
    postChunks,
    sitemapChunkFilename,
  );

  return {
    siteOrigin,
    entryLimit,
    pages,
    posts,
    pageChunks,
    postChunks,
    indexItems,
  };
}
