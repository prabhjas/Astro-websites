import type { APIRoute } from 'astro';
import {
  ARCHIVE_POSTS_PER_PAGE,
  buildInsightsCardHtml,
  getAllBlogPosts,
} from '../../../lib/blog';

export const prerender = false;

/** Insights page shows 12 ECS cards initially (template 124 grid), then 6 per Load More. */
const DEFAULT_PER_PAGE = 6;
const DEFAULT_OFFSET = 12;

export const GET: APIRoute = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get('perPage') || DEFAULT_PER_PAGE) || DEFAULT_PER_PAGE),
  );
  // Skip cards already rendered in the static page-1 HTML (12 in f2c45fb)
  const offset = Math.max(
    0,
    Number(url.searchParams.get('offset') || String(DEFAULT_OFFSET)) || DEFAULT_OFFSET,
  );

  // Preserve Insights order from wp-blog-order.json (newest posts are prepended first).
  const sorted = getAllBlogPosts();

  // Page N (N>=2) relative to offset: start = offset + (page-2)*perPage
  // When page=2, start=offset (skip first page)
  const start = offset + Math.max(0, page - 2) * perPage;
  const slice = sorted.slice(start, start + perPage);
  const remaining = Math.max(0, sorted.length - (start + slice.length));
  const hasMore = remaining > 0;

  const html = slice.map((p) => buildInsightsCardHtml(p)).join('\n');

  return new Response(
    JSON.stringify({
      ok: true,
      page,
      perPage,
      offset,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil((sorted.length - offset) / perPage) + 1),
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      html,
      // keep ARCHIVE_POSTS_PER_PAGE referenced for consistency with archive routes
      archivePerPage: ARCHIVE_POSTS_PER_PAGE,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=60',
      },
    },
  );
};
