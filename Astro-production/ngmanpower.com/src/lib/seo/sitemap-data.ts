/**
 * Sitemap data layer — Rank Math–style pages/posts for the SEO dashboard
 * and public /sitemap_index.xml endpoints.
 *
 * Discovery comes from pages.json / posts.json (the live content store), so new
 * posts appear without a re-sync. src/data/sitemap-urls.json (synced from live
 * via `npm run sitemap:sync`) only fills in lastmod, or stands in wholesale if
 * the content store is empty.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { getPages, getPosts } from '../content.ts';
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
  normaliseCanonicalPath,
  pickLastmod,
  resolveSitemapLoc,
  sitemapChunkFilename,
  sortEntries,
} from './sitemap-utils.ts';
import { buildIndexItemsFromChunks, type SitemapIndexItem } from './sitemap-xml.ts';

const ROOT = process.cwd();
const SITEMAP_URLS_FILE = join(ROOT, 'src/data/sitemap-urls.json');
const REDIRECTS_FILE = join(ROOT, 'src/data/redirects.yml');

export type SitemapDataOptions = ResolveSiteOriginOptions & {
  entryLimit?: number;
  /** INTERNAL_ADMIN_DIR — when set, merge dashboard priority/changefreq overrides. */
  adminDir?: string;
};

type LiveSitemapRow = { path: string; type?: string; lastmod?: string };

type LiveSitemapFile = {
  source?: string;
  fetchedAt?: string;
  pages?: LiveSitemapRow[];
  posts?: LiveSitemapRow[];
  guides?: LiveSitemapRow[];
  country?: LiveSitemapRow[];
  eor?: LiveSitemapRow[];
};

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
      const normalised = normaliseCanonicalPath(path);
      if (normalised) sources.add(normalised);
    }
  } catch {
    // ignore malformed redirects file
  }
  return sources;
}

function readLiveSitemapFile(): LiveSitemapFile | null {
  if (!existsSync(SITEMAP_URLS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(SITEMAP_URLS_FILE, 'utf8')) as LiveSitemapFile;
  } catch {
    return null;
  }
}

function robotsString(robots?: { index?: string; follow?: string } | string | null): string | null {
  if (!robots) return null;
  if (typeof robots === 'string') return robots;
  return [robots.index, robots.follow].filter(Boolean).join(', ') || null;
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

function entriesFromLiveRows(
  rows: Array<{ path: string; lastmod?: string }> | undefined,
  type: SitemapEntry['type'],
  siteOrigin: string,
  redirectSources: Set<string>,
): SitemapEntry[] {
  if (!rows?.length) return [];
  const entries: SitemapEntry[] = [];
  for (const row of rows) {
    const path = normaliseCanonicalPath(row.path);
    if (!path) continue;
    if (redirectSources.has(path)) continue;
    const slug = path === '/' ? '' : path.replace(/^\/|\/$/g, '');
    if (type === 'page' && EXCLUDED_PAGE_SLUGS.has(slug.split('/')[0] || '')) continue;

    const url = resolveSitemapLoc(path, path, siteOrigin);
    if (!url) continue;
    entries.push({
      url,
      lastmod: pickLastmod(row.lastmod),
      type,
    });
  }
  return entries;
}

function entriesFromContentPages(
  siteOrigin: string,
  redirectSources: Set<string>,
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const page of getPages()) {
    const path = normaliseCanonicalPath(page.path || `/${page.slug}/`);
    if (!path) continue;
    const slug = path === '/' ? '' : path.replace(/^\/|\/$/g, '');
    const topSlug = slug.split('/')[0] || '';
    if (EXCLUDED_PAGE_SLUGS.has(topSlug)) continue;
    if (redirectSources.has(path)) continue;
    if (!isIndexableRobots(robotsString(page.seo?.robots))) continue;

    const canonical = page.seo?.canonical || path;
    const url = resolveSitemapLoc(path, canonical || path, siteOrigin);
    if (!url) continue;
    entries.push({
      url,
      lastmod: pickLastmod(page.modified, page.date),
      type: 'page',
    });
  }
  return entries;
}

function entriesFromContentPosts(
  siteOrigin: string,
  redirectSources: Set<string>,
): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const post of getPosts()) {
    const path = normaliseCanonicalPath(post.path || `/${post.slug}/`);
    if (!path) continue;
    if (redirectSources.has(path)) continue;
    if (!isIndexableRobots(robotsString(post.seo?.robots))) continue;

    const canonical = post.seo?.canonical || path;
    const url = resolveSitemapLoc(path, canonical || path, siteOrigin);
    if (!url) continue;
    entries.push({
      url,
      lastmod: pickLastmod(post.modified, post.date),
      type: 'post',
    });
  }
  return entries;
}

/** Discover static marketing page slugs (legacy helper kept for tests). */
export function listStaticPageSlugs(): string[] {
  const live = readLiveSitemapFile();
  if (live?.pages?.length) {
    return live.pages
      .map((row) => {
        const path = normaliseCanonicalPath(row.path);
        if (!path) return null;
        if (path === '/') return '';
        return path.replace(/^\/|\/$/g, '');
      })
      .filter((s): s is string => s != null)
      .sort((a, b) => a.localeCompare(b));
  }
  return getPages()
    .map((p) => {
      const path = normaliseCanonicalPath(p.path || `/${p.slug}/`);
      if (!path) return null;
      if (path === '/') return '';
      return path.replace(/^\/|\/$/g, '');
    })
    .filter((s): s is string => s != null)
    .sort((a, b) => a.localeCompare(b));
}

/**
 * pages.json / posts.json decide what the site actually serves.
 * For public Rank Math child sitemaps on EOR, prefer the synced live snapshot
 * when present so page/post/guides/country/eor lists match production.
 * Content store still fills gaps if a snapshot bucket is empty.
 */
function preferLiveSnapshot(snapshot: SitemapEntry[], content: SitemapEntry[]): SitemapEntry[] {
  if (snapshot.length) {
    const lastmodByUrl = new Map(content.map((entry) => [entry.url, entry.lastmod]));
    return snapshot.map((entry) =>
      entry.lastmod ? entry : { ...entry, lastmod: lastmodByUrl.get(entry.url) },
    );
  }
  return content;
}

export function collectPageEntries(
  siteOrigin: string,
  overrides: Record<string, SitemapOverride> = {},
): SitemapEntry[] {
  const redirectSources = loadRedirectSources();
  const live = readLiveSitemapFile();
  const liveGuidesCountryEor = new Set(
    [...(live?.guides || []), ...(live?.country || []), ...(live?.eor || [])]
      .map((row) => normaliseCanonicalPath(row.path))
      .filter(Boolean),
  );
  const contentPages = entriesFromContentPages(siteOrigin, redirectSources).filter((entry) => {
    try {
      const path = normaliseCanonicalPath(new URL(entry.url).pathname);
      if (!path) return true;
      if (path.startsWith('/guides/')) return false;
      if (liveGuidesCountryEor.has(path)) return false;
      return true;
    } catch {
      return true;
    }
  });
  const entries = preferLiveSnapshot(
    entriesFromLiveRows(live?.pages, 'page', siteOrigin, redirectSources),
    contentPages,
  );
  return sortEntries(dedupeEntries(applyOverrides(entries, siteOrigin, overrides)));
}

export function collectPostEntries(
  siteOrigin: string,
  overrides: Record<string, SitemapOverride> = {},
): SitemapEntry[] {
  const redirectSources = loadRedirectSources();
  const live = readLiveSitemapFile();
  const entries = preferLiveSnapshot(
    entriesFromLiveRows(live?.posts, 'post', siteOrigin, redirectSources),
    entriesFromContentPosts(siteOrigin, redirectSources),
  );
  return sortEntries(dedupeEntries(applyOverrides(entries, siteOrigin, overrides)));
}

export type SitemapDataset = {
  siteOrigin: string;
  entryLimit: number;
  pages: SitemapEntry[];
  posts: SitemapEntry[];
  guides: SitemapEntry[];
  country: SitemapEntry[];
  eor: SitemapEntry[];
  pageChunks: SitemapEntry[][];
  postChunks: SitemapEntry[][];
  indexItems: SitemapIndexItem[];
  sourceLabel?: string;
};

function collectTypedLiveEntries(
  live: LiveSitemapFile | null,
  key: 'guides' | 'country' | 'eor',
  siteOrigin: string,
  overrides: Record<string, SitemapOverride>,
): SitemapEntry[] {
  const redirectSources = loadRedirectSources();
  const entries = entriesFromLiveRows(live?.[key], key, siteOrigin, redirectSources);
  return sortEntries(dedupeEntries(applyOverrides(entries, siteOrigin, overrides)));
}

export function buildSitemapDataset(options: SitemapDataOptions = {}): SitemapDataset {
  const siteOrigin = resolveSiteOrigin(options);
  const entryLimit = options.entryLimit ?? SITEMAP_ENTRY_LIMIT;
  const overrides = options.adminDir
    ? readSitemapOverridesSync(options.adminDir).entries
    : {};
  const live = readLiveSitemapFile();
  const pages = collectPageEntries(siteOrigin, overrides);
  const posts = collectPostEntries(siteOrigin, overrides);
  const guides = collectTypedLiveEntries(live, 'guides', siteOrigin, overrides);
  const country = collectTypedLiveEntries(live, 'country', siteOrigin, overrides);
  const eor = collectTypedLiveEntries(live, 'eor', siteOrigin, overrides);
  const pageChunks = chunkEntries(pages, entryLimit);
  const postChunks = chunkEntries(posts, entryLimit);
  const origin = siteOrigin.replace(/\/$/, '');
  const indexItems: SitemapIndexItem[] = [
    ...buildIndexItemsFromChunks(siteOrigin, pageChunks, postChunks, sitemapChunkFilename),
  ];
  // Rank Math child sitemaps (NG Manpower)
  if (guides.length) {
    indexItems.push({ loc: `${origin}/guides-sitemap.xml`, lastmod: guides[0]?.lastmod });
  }
  if (country.length) {
    indexItems.push({ loc: `${origin}/country-sitemap.xml`, lastmod: country[0]?.lastmod });
  }
  if (eor.length) {
    indexItems.push({ loc: `${origin}/eor-sitemap.xml`, lastmod: eor[0]?.lastmod });
  }

  return {
    siteOrigin,
    entryLimit,
    pages,
    posts,
    guides,
    country,
    eor,
    pageChunks,
    postChunks,
    indexItems,
    sourceLabel: live?.source
      ? `Synced from ${live.source}${live.fetchedAt ? ` (${live.fetchedAt})` : ''}`
      : 'Discovered from pages.json / posts.json',
  };
}

export function getPageChunk(
  chunkNumber: number,
  options: SitemapDataOptions = {},
): SitemapEntry[] | null {
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
