import type { APIRoute } from 'astro';
import {
  ARCHIVE_POSTS_PER_PAGE,
  buildInsightsCardHtml,
  getAllBlogPosts,
  getCategorySlug,
  getPostsByAuthorSlug,
} from '../../../lib/blog';
import { buildAuthorArticleCardHtml } from '../../../lib/authors';

export const prerender = false;

/** Insights page shows 6 ECS cards initially (legacy ECS dump). */
const DEFAULT_PER_PAGE = 6;

export const GET: APIRoute = async ({ url }) => {
  const authorSlug = String(url.searchParams.get('author') || url.searchParams.get('slug') || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get('perPage') || DEFAULT_PER_PAGE) || DEFAULT_PER_PAGE),
  );

  if (authorSlug) {
    const offset = Math.max(0, Number(url.searchParams.get('offset') || '0') || 0);
    const all = getPostsByAuthorSlug(authorSlug);
    const slice = all.slice(offset, offset + perPage);
    const hasMore = offset + slice.length < all.length;
    const html = slice.map((p) => buildAuthorArticleCardHtml(p)).join('\n');

    return new Response(
      JSON.stringify({
        ok: true,
        page,
        perPage,
        offset,
        count: slice.length,
        total: all.length,
        hasMore,
        nextPage: hasMore ? page + 1 : null,
        html,
        message: slice.length ? undefined : 'No more post found',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
        },
      },
    );
  }

  // Skip cards already rendered in the static page-1 HTML
  const offset = Math.max(
    0,
    Number(url.searchParams.get('offset') || String(DEFAULT_PER_PAGE)) || DEFAULT_PER_PAGE,
  );

  const category = (url.searchParams.get('category') || '').trim().toLowerCase();
  const sorted = getAllBlogPosts()
    .filter((post) => !category || post.categories.some((item) => getCategorySlug(item) === category))
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

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
