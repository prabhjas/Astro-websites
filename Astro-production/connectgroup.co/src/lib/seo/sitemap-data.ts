/**
 * Sitemap data layer — collects indexable pages and posts from the existing
 * static content sources (src/pages + src/content/blog + SEO YAML).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { getAllBlogSlugs, getBlogPost, getReservedSlugs } from '../blog.ts';
import { isPublishedPageSlug } from '../published-pages.ts';
import type { PageSeo } from '../seo.ts';
import {
  EXCLUDED_PAGE_SLUGS,
  SITEMAP_ENTRY_LIMIT,
  type SitemapEntry,
} from './sitemap-config.ts';
import {
  pathFromSitemapUrl,
  readSitemapOverridesSync,
  type SitemapOverride,
} from './sitemap-overrides-store.ts';
import { resolveSiteOrigin, type ResolveSiteOriginOptions } from './site-url.ts';
import {
  chunkEntries,
  dedupeEntries,
  isIndexableRobots,
  pickLastmod,
  resolveSitemapLoc,
  sitemapChunkFilename,
  sortEntries,
} from './sitemap-utils.ts';
import { buildIndexItemsFromChunks, type SitemapIndexItem } from './sitemap-xml.ts';

const ROOT = process.cwd();
const PAGES_DIR = join(ROOT, 'src/pages');
const SEO_DIR = join(ROOT, 'src/data/seo');
const REDIRECTS_FILE = join(ROOT, 'src/data/redirects.yml');

export type SitemapDataOptions = ResolveSiteOriginOptions & {
  entryLimit?: number;
  /** INTERNAL_ADMIN_DIR — when set, merge dashboard priority/changefreq overrides. */
  adminDir?: string;
};

function loadPageSeoSafe(slug: string): PageSeo | null {
  const filePath = join(SEO_DIR, `${slug === '' ? 'home' : slug}.yml`);
  if (!existsSync(filePath)) return null;
  try {
    return parse(readFileSync(filePath, 'utf8')) as PageSeo;
  } catch {
    return null;
  }
}

function loadRedirectSources(): Set<string> {
  const sources = new Set<string>();
  if (!existsSync(REDIRECTS_FILE)) return sources;
  try {
    const data = parse(readFileSync(REDIRECTS_FILE, 'utf8')) ?? {};
    const list = Array.isArray(data.redirects) ? data.redirects : [];
    for (const row of list) {
      if (!row?.from) continue;
      const from = String(row.from);
      const path = from.startsWith('http')
        ? (() => {
            try {
              return new URL(from).pathname;
            } catch {
              return from;
            }
          })()
        : from;
      const normalised = path.endsWith('/') || path === '/' ? path : `${path}/`;
      sources.add(normalised === '//' ? '/' : normalised);
    }
  } catch {
    // ignore malformed redirects file
  }
  return sources;
}

/** Discover static marketing page slugs from src/pages/*.astro */
export function listStaticPageSlugs(): string[] {
  if (!existsSync(PAGES_DIR)) return [];
  const slugs: string[] = [];
  for (const name of readdirSync(PAGES_DIR)) {
    if (!name.endsWith('.astro')) continue;
    const base = name.replace(/\.astro$/, '');
    if (base.startsWith('[')) continue;
    if (base === 'index') {
      slugs.push('');
      continue;
    }
    slugs.push(base);
  }
  return slugs.sort((a, b) => a.localeCompare(b));
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

export function collectPageEntries(
  siteOrigin: string,
  overrides: Record<string, SitemapOverride> = {},
): SitemapEntry[] {
  const redirectSources = loadRedirectSources();
  const entries: SitemapEntry[] = [];

  for (const slug of listStaticPageSlugs()) {
    if (EXCLUDED_PAGE_SLUGS.has(slug)) continue;
    // Spreadsheet column D = Done allowlist
    if (!isPublishedPageSlug(slug)) continue;

    const seo = loadPageSeoSafe(slug);
    if (seo && !isIndexableRobots(seo.robots)) continue;

    const path = slug === '' ? '/' : `/${slug}/`;
    if (redirectSources.has(path)) continue;

    const canonicalSource = seo?.canonical ?? path;
    const url = resolveSitemapLoc(path, canonicalSource, siteOrigin);
    if (!url) continue;

    entries.push({
      url,
      lastmod: pickLastmod(seo?.schema?.dateModified, seo?.schema?.datePublished),
      type: 'page',
    });
  }

  return sortEntries(dedupeEntries(applyOverrides(entries, siteOrigin, overrides)));
}

export function collectPostEntries(
  siteOrigin: string,
  overrides: Record<string, SitemapOverride> = {},
): SitemapEntry[] {
  const reserved = getReservedSlugs();
  const redirectSources = loadRedirectSources();
  const entries: SitemapEntry[] = [];

  const slugs = getAllBlogSlugs().sort((a, b) => a.localeCompare(b));

  for (const slug of slugs) {
    if (reserved.has(slug)) continue;

    const post = getBlogPost(slug);
    if (!post) continue;
    if (!isIndexableRobots(post.robots)) continue;

    const path = `/${slug}/`;
    if (redirectSources.has(path)) continue;

    const url = resolveSitemapLoc(path, post.canonical, siteOrigin);
    if (!url) continue;

    entries.push({
      url,
      lastmod: pickLastmod(post.modifiedAt, post.publishedAt),
      type: 'post',
    });
  }

  // Deterministic: URL ascending (already sorted via sortEntries)
  return sortEntries(dedupeEntries(applyOverrides(entries, siteOrigin, overrides)));
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
  const pages = collectPageEntries(siteOrigin, overrides);
  const posts = collectPostEntries(siteOrigin, overrides);
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

export function getPageChunk(
  chunkNumber: number,
  options: SitemapDataOptions = {},
): SitemapEntry[] | null {
  // chunkNumber: 1 = first file (page-sitemap.xml), 2 = page-sitemap2.xml, ...
  if (!Number.isInteger(chunkNumber) || chunkNumber < 1) return null;
  const { pageChunks } = buildSitemapDataset(options);
  const chunk = pageChunks[chunkNumber - 1];
  return chunk && chunk.length > 0 ? chunk : null;
}

export function getPostChunk(
  chunkNumber: number,
  options: SitemapDataOptions = {},
): SitemapEntry[] | null {
  if (!Number.isInteger(chunkNumber) || chunkNumber < 1) return null;
  const { postChunks } = buildSitemapDataset(options);
  const chunk = postChunks[chunkNumber - 1];
  return chunk && chunk.length > 0 ? chunk : null;
}
