import type { SitemapEntry } from './sitemap-config.ts';
import { SITEMAP_ENTRY_LIMIT } from './sitemap-config.ts';
import { absoluteUrl, normaliseSiteOrigin } from './site-url.ts';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function isIndexableRobots(robots?: string | null): boolean {
  if (!robots) return true;
  return !/\bnoindex\b/i.test(robots);
}

/**
 * Normalise a path or absolute URL to a canonical site path with trailing slash
 * (matches Astro `build.format: 'directory'`).
 */
export function normaliseCanonicalPath(input: string | null | undefined): string | null {
  if (input == null || typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;
  if (raw.includes('#') || raw.includes('?')) {
    const without = raw.split('#')[0]?.split('?')[0] ?? '';
    return normaliseCanonicalPath(without);
  }

  let pathname: string;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname;
    } catch {
      return null;
    }
  } else {
    pathname = raw.startsWith('/') ? raw : `/${raw}`;
  }

  if (!pathname || pathname === '/') return '/';

  const cleaned = pathname.replace(/\/{2,}/g, '/');
  return cleaned.endsWith('/') ? cleaned : `${cleaned}/`;
}

export function isSameOriginUrl(url: string, siteOrigin: string): boolean {
  try {
    const origin = normaliseSiteOrigin(siteOrigin);
    const parsed = new URL(url);
    return normaliseSiteOrigin(parsed.origin) === origin;
  } catch {
    return false;
  }
}

/**
 * Decide whether a route should appear in the sitemap and return its absolute loc.
 *
 * Sitemap locs always use the resolved deployment origin.
 * SEO/blog canonical hosts from migrated WordPress YAML/JSON are rewritten when the
 * canonical *path* matches this route. Entries are excluded when:
 * - canonical path points at a different internal URL
 * - canonical is an absolute URL whose path does not match this route
 */
export function resolveSitemapLoc(
  routePath: string,
  canonical: string | undefined,
  siteOrigin: string,
): string | null {
  const pagePath = normaliseCanonicalPath(routePath);
  if (pagePath == null) return null;

  if (canonical && canonical.trim()) {
    const canonicalPath = normaliseCanonicalPath(canonical);
    if (canonicalPath == null) return null;
    if (canonicalPath !== pagePath) return null;
  }

  return absoluteUrl(siteOrigin, pagePath);
}

export function isValidIsoDate(value: string | undefined | null): value is string {
  if (!value) return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

/** Prefer modified date; fall back to published. Never invent "now". */
export function pickLastmod(...candidates: Array<string | undefined | null>): string | undefined {
  for (const c of candidates) {
    if (isValidIsoDate(c)) {
      return new Date(c!).toISOString();
    }
  }
  return undefined;
}

export function dedupeEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const seen = new Set<string>();
  const out: SitemapEntry[] = [];
  for (const entry of entries) {
    const key = entry.url;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

export function sortEntries(entries: SitemapEntry[]): SitemapEntry[] {
  return [...entries].sort((a, b) => a.url.localeCompare(b.url));
}

export function chunkEntries<T>(items: T[], limit = SITEMAP_ENTRY_LIMIT): T[][] {
  const size = Math.max(1, limit);
  if (items.length === 0) return [];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Rank Math-style child sitemap filename.
 * chunkIndex 0 → `{prefix}-sitemap.xml`
 * chunkIndex 1 → `{prefix}-sitemap2.xml`
 */
export function sitemapChunkFilename(
  prefix: 'page' | 'post',
  chunkIndex: number,
): string {
  if (chunkIndex < 0 || !Number.isInteger(chunkIndex)) {
    throw new Error(`Invalid sitemap chunk index: ${chunkIndex}`);
  }
  if (chunkIndex === 0) return `${prefix}-sitemap.xml`;
  return `${prefix}-sitemap${chunkIndex + 1}.xml`;
}

/** Parse numeric suffix from Rank Math-style filenames (2+ only). */
export function parseSitemapSuffix(pageParam: string | undefined): number | null {
  if (pageParam == null || pageParam === '') return null;
  if (!/^\d+$/.test(pageParam)) return null;
  const n = Number.parseInt(pageParam, 10);
  if (!Number.isInteger(n) || n < 2) return null;
  return n;
}

export function newestLastmod(entries: SitemapEntry[]): string | undefined {
  let best: string | undefined;
  let bestMs = -Infinity;
  for (const e of entries) {
    if (!isValidIsoDate(e.lastmod)) continue;
    const ms = Date.parse(e.lastmod!);
    if (ms > bestMs) {
      bestMs = ms;
      best = new Date(e.lastmod!).toISOString();
    }
  }
  return best;
}
