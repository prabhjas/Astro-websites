import type { APIRoute } from 'astro';
import {
  ARCHIVE_POSTS_PER_PAGE,
  buildInsightsCardHtml,
  getAllBlogPosts,
  getPostsByAuthorSlug,
} from '../../../lib/blog';

export const prerender = false;

/** Blog page shows 15 ECS cards initially, then 15 per More Articles. Author pages use 9. */
const DEFAULT_PER_PAGE = 15;
const DEFAULT_OFFSET = 15;

export const GET: APIRoute = async ({ url }) => {
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get('perPage') || DEFAULT_PER_PAGE) || DEFAULT_PER_PAGE),
  );
  const offset = Math.max(
    0,
    Number(url.searchParams.get('offset') || String(DEFAULT_OFFSET)) || DEFAULT_OFFSET,
  );
  const author = (url.searchParams.get('author') || '').trim().toLowerCase();

  const sorted = (author ? getPostsByAuthorSlug(author) : getAllBlogPosts()).sort(
    (a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt),
  );

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
      author: author || null,
      total: sorted.length,
      totalPages: Math.max(1, Math.ceil((sorted.length - offset) / perPage) + 1),
      hasMore,
      nextPage: hasMore ? page + 1 : null,
      html,
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
