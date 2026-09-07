/**
 * Rank Math–compatible sitemap / robots configuration.
 * Entry limit mirrors smaller Rank Math child sitemaps (protocol max is 50,000).
 */
import deletedBlogPathsFile from '../../data/deleted-blog-paths.json';

export const SITEMAP_ENTRY_LIMIT = Number.parseInt(
  process.env.SITEMAP_ENTRY_LIMIT ?? '100',
  10,
) || 100;

/** Paths disallowed for crawlers (mirrors live WordPress robots.txt). */
export const ROBOTS_DISALLOW_PATHS = ['/tag/', '/category/', '/wp-admin/'] as const;

/** Off-topic blogs permanently removed — never re-list in XML sitemaps. */
export const DELETED_BLOG_PATHS = new Set(
  (deletedBlogPathsFile.paths || []).map((p) => {
    const raw = String(p || '').trim();
    if (!raw) return '';
    const withSlash = raw.startsWith('/') ? raw : `/${raw}`;
    return withSlash.endsWith('/') ? withSlash : `${withSlash}/`;
  }).filter(Boolean),
);

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

export function isDeletedBlogPath(path: string): boolean {
  if (!path) return false;
  let p = path.trim();
  if (!p.startsWith('/')) p = `/${p}`;
  if (!p.endsWith('/')) p = `${p}/`;
  // Also match /ar/<slug>/ if it ever appears
  if (DELETED_BLOG_PATHS.has(p)) return true;
  if (p.startsWith('/ar/')) {
    const en = `/${p.slice(4)}`;
    return DELETED_BLOG_PATHS.has(en.endsWith('/') ? en : `${en}/`);
  }
  return false;
}

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
