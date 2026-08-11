/**
 * Sitemap data layer — Connect Business Center inventory + dashboard blog JSON.
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
): { pages: SitemapEntry[]; posts: SitemapEntry[]; law: SitemapEntry[] } {
  const inventory = loadInventory() as {
    pages: { slug: string }[];
    posts: { slug: string }[];
    law?: { slug: string }[];
  };
  const prepared = new Set(listAllPreparedPaths());
  const lawSlugs = new Set((inventory.law || []).map((l) => l.slug));

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

  const postPaths = new Map<string, SitemapEntry>();

  for (const item of inventory.posts || []) {
    const slug = item.slug;
    if (!slug || slug === 'homepage') continue;
    if (lawSlugs.has(slug)) continue; // emitted under law-sitemap.xml
    if (!prepared.has(slug)) continue;
    postPaths.set(slug, {
      url: absoluteUrl(siteOrigin, pathForSlug(slug)),
      lastmod: lastmodForSlug(slug),
      changefreq: 'monthly',
      priority: 0.6,
      type: 'post',
    });
  }

  for (const post of getAllBlogPosts()) {
    if (lawSlugs.has(post.slug) || postPaths.has(post.slug)) continue;
    postPaths.set(post.slug, {
      url: absoluteUrl(siteOrigin, pathForSlug(post.slug)),
      lastmod: post.modifiedAt || post.publishedAt,
      changefreq: 'monthly',
      priority: 0.6,
      type: 'post',
    });
  }

  const law: SitemapEntry[] = [];
  for (const item of inventory.law || []) {
    if (!prepared.has(item.slug)) continue;
    law.push({
      url: absoluteUrl(siteOrigin, pathForSlug(item.slug)),
      lastmod: lastmodForSlug(item.slug),
      changefreq: 'monthly',
      priority: 0.6,
      type: 'post',
    });
  }

  return {
    pages: sortEntries(dedupeEntries(applyOverrides(pages, siteOrigin, overrides))),
    posts: sortEntries(dedupeEntries(applyOverrides([...postPaths.values()], siteOrigin, overrides))),
    law: sortEntries(dedupeEntries(applyOverrides(law, siteOrigin, overrides))),
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
  law: SitemapEntry[];
  pageChunks: SitemapEntry[][];
  postChunks: SitemapEntry[][];
  lawChunks: SitemapEntry[][];
  indexItems: SitemapIndexItem[];
};

export function buildSitemapDataset(options: SitemapDataOptions = {}): SitemapDataset {
  const siteOrigin = resolveSiteOrigin(options);
  const entryLimit = options.entryLimit ?? SITEMAP_ENTRY_LIMIT;
  const overrides = options.adminDir
    ? readSitemapOverridesSync(options.adminDir).entries
    : {};
  const { pages, posts, law } = collectFromInventory(siteOrigin, overrides);
  const pageChunks = chunkEntries(pages, entryLimit);
  const postChunks = chunkEntries(posts, entryLimit);
  const lawChunks = chunkEntries(law, entryLimit);
  const indexItems = buildIndexItemsFromChunks(
    siteOrigin,
    pageChunks,
    postChunks,
    sitemapChunkFilename,
    lawChunks,
  );

  return {
    siteOrigin,
    entryLimit,
    pages,
    posts,
    law,
    pageChunks,
    postChunks,
    lawChunks,
    indexItems,
  };
}
