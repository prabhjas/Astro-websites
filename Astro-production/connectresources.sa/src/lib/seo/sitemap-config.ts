/**
 * Rank Math–compatible sitemap / robots configuration.
 * Keep a high enough default that Connect Resources Saudi posts fit in one child
 * sitemap (avoids post-sitemap2.xml). Protocol max is 50,000.
 */

export const SITEMAP_ENTRY_LIMIT = Number.parseInt(
  process.env.SITEMAP_ENTRY_LIMIT ?? '50000',
  10,
) || 50000;

/** Paths disallowed for crawlers (aligned with live Yoast robots.txt). */
export const ROBOTS_DISALLOW_PATHS = [
  '/?s=',
  '/page/*/?s=',
  '/search/',
  '/wp-json/',
  '/?rest_route=',
  '/wp-admin/',
  '/wp-includes/',
  '/tag/',
  '/blog/page/',
  '/category/',
  '/*feed*/',
  '/*rss*/',
  '/cgi-bin/',
  '/tmp/',
  '/login',
  '/register',
  '/cart',
  '/checkout',
  '/my-account',
  '/*cdn-cgi*/',
  '/*.php$',
  '/*.cgi$',
  '/private/',
  '/old-site-backups/',
  '/*?replytocom=',
] as const;

/** Static page slugs excluded from the page sitemap (demo / internal). */
export const EXCLUDED_PAGE_SLUGS = new Set([
  'demo',
  'status',
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

export type SitemapEntry = {
  url: string;
  lastmod?: string;
  changefreq?: SitemapChangeFreq;
  priority?: number;
  type: 'page' | 'post';
};
