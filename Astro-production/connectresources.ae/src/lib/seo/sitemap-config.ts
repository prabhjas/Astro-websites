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
]);

/** Paid / campaign LPs — noindex, nofollow (not for organic search). */
export const NOINDEX_NOFOLLOW_PAGE_SLUGS = new Set([
  // Existing paid / campaign LPs
  'corporate-pro-services',
  'outsourcing',
  'recruitment',
  'payroll-outsourcing-uae',
  'freelance-journey',
  'lp-page-cr',
  // Lana sheet — Landing Page column (keep live, noindex)
  'employer-of-record-lp',
  'employer-of-record-lp2',
  'landing-page-international-relocation',
  'landing-page-employee-mobility',
  'family-residency',
  'residency-uae',
]);

export function isNoIndexNoFollowPageSlug(slug: string): boolean {
  const top = (slug || '').replace(/^\/|\/$/g, '').split('/')[0] || '';
  return NOINDEX_NOFOLLOW_PAGE_SLUGS.has(top);
}

export function isNoIndexNoFollowPath(path: string): boolean {
  const normalised = path === '/' ? '' : path.replace(/^\/|\/$/g, '');
  return isNoIndexNoFollowPageSlug(normalised);
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
