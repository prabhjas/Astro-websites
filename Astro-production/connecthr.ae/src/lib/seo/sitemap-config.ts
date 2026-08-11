/**
 * Rank Math–compatible sitemap / robots configuration.
 * Entry limit mirrors smaller Rank Math child sitemaps (protocol max is 50,000).
 */

export const SITEMAP_ENTRY_LIMIT = Number.parseInt(
  process.env.SITEMAP_ENTRY_LIMIT ?? '100',
  10,
) || 100;

/** Paths disallowed for crawlers (mirrors live WordPress robots.txt). */
export const ROBOTS_DISALLOW_PATHS = ['/tag/', '/category/', '/wp-admin/'] as const;

/** Static page slugs excluded from the page sitemap (demo / internal). */
export const EXCLUDED_PAGE_SLUGS = new Set([
  'demo',
  'status',
  'dummmy',
  'test',
  'test-form',
]);

/** Test / placeholder pages — noindex, nofollow (not for organic search). */
export const NOINDEX_NOFOLLOW_PAGE_SLUGS = new Set([
  'dummmy',
  'test',
  'test-form',
]);

export function isNoIndexNoFollowPageSlug(slug: string): boolean {
  const top = (slug || '').replace(/^\/|\/$/g, '').split('/')[0] || '';
  return NOINDEX_NOFOLLOW_PAGE_SLUGS.has(top);
}

export function isNoIndexNoFollowPath(path: string): boolean {
  const normalised = path === '/' ? '' : path.replace(/^\/|\/$/g, '');
  const top = normalised.startsWith('ar/') ? normalised.slice(3).split('/')[0] : normalised.split('/')[0];
  return NOINDEX_NOFOLLOW_PAGE_SLUGS.has(top || '');
}

export const NOINDEX_NOFOLLOW_ROBOTS = 'noindex, nofollow' as const;

/** Cache policy for sitemap/robots responses (static hosting may ignore; useful in preview/SSR). */
export const SITEMAP_CACHE_CONTROL =
  'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

export type SitemapChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

export type SitemapEntry = {
  url: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
  type: 'page' | 'post';
};
