import type { APIRoute } from 'astro';
import {
  ARCHIVE_POSTS_PER_PAGE,
  buildInsightsCardHtml,
  getAllBlogPosts,
} from '../../../lib/blog';

export const prerender = false;

/** Live ECS grid shows 9 cards initially; Load More appends 9 at a time. */
const DEFAULT_PER_PAGE = 9;
const DEFAULT_OFFSET = 9;

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

  const sorted = getAllBlogPosts().sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );

  const exclude = String(url.searchParams.get('exclude') || '')
    .trim()
    .replace(/^\/+|\/+$/g, '');
  const pool = exclude ? sorted.filter((p) => p.slug !== exclude) : sorted;

  // Page N (N>=2) relative to offset: start = offset + (page-2)*perPage
  // When page=2, start=offset (skip first page)
  const start = offset + Math.max(0, page - 2) * perPage;
  const slice = pool.slice(start, start + perPage);
  const remaining = Math.max(0, pool.length - (start + slice.length));
  const hasMore = remaining > 0;

  const html = slice.map((p) => buildInsightsCardHtml(p)).join('\n');

  return new Response(
    JSON.stringify({
      ok: true,
      page,
      perPage,
      offset,
      total: pool.length,
      totalPages: Math.max(1, Math.ceil((pool.length - offset) / perPage) + 1),
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
