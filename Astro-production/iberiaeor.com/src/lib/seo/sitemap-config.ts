/**
 * Rank Math–compatible sitemap / robots configuration.
 * Entry limit mirrors smaller Rank Math child sitemaps (protocol max is 50,000).
 */

export const SITEMAP_ENTRY_LIMIT = Number.parseInt(
  process.env.SITEMAP_ENTRY_LIMIT ?? '1000',
  10,
) || 1000;

/** Paths disallowed for crawlers (Connecthr-style robots defaults for Iberia). */
export const ROBOTS_DISALLOW_PATHS = [
  '/wp-admin/',
  '/tag/',
  '/category/',
  '/blog/page/',
  '/insights/page/',
  '/search/',
  '/api/',
] as const;

/** Static page slugs excluded from the page sitemap (demo / internal). */
export const EXCLUDED_PAGE_SLUGS = new Set([
  'demo',
  'status',
]);

/** Full paths kept live but excluded from XML sitemaps (noindex pages). */
export const EXCLUDED_SITEMAP_PATHS = new Set([
  '/es/privacy-policy/',
  '/ru/about-us/',
  '/ru/privacy-policy/',
  '/es/about-us/',
  '/privacy-policy-2/',
  '/es/iberia-eor-landing-page-english-2/',
  '/iberia-eor-landing-page-english-1/',
  '/hr-services-spain-new/',
  '/author/',
]);

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

export type SitemapEntryType = 'page' | 'post' | 'guides' | 'country' | 'eor';

export type SitemapEntry = {
  url: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
  type: SitemapEntryType;
};
