import type { APIRoute } from 'astro';
import {
  buildImprezaInsightsGridCardHtml,
  getAllBlogPosts,
  postMatchesAnyCategorySlug,
  postMatchesCategorySlug,
} from '../../../lib/blog';

export const prerender = false;

function parseList(param: string | null): Set<string> {
  return new Set(
    String(param || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export const GET: APIRoute = async ({ url }) => {
  const format = (url.searchParams.get('format') || 'elementor').toLowerCase();
  const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get('perPage') || '3') || 3),
  );
  const category = (url.searchParams.get('category') || '').trim();
  const categoriesParam = (url.searchParams.get('categories') || '').trim();
  const grid = (url.searchParams.get('grid') || '').trim();
  const excludeSlugs = parseList(url.searchParams.get('excludeSlugs'));

  let sorted = getAllBlogPosts()
    .filter((p) => (p.status || 'published') === 'published')
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));

  if (excludeSlugs.size) {
    sorted = sorted.filter((p) => !excludeSlugs.has(p.slug));
  }

  const categorySlugs = categoriesParam
    ? categoriesParam.split(',').map((s) => s.trim()).filter(Boolean)
    : category
      ? [category]
      : [];

  if (categorySlugs.length === 1) {
    sorted = sorted.filter((p) => postMatchesCategorySlug(p, categorySlugs[0]!));
  } else if (categorySlugs.length > 1) {
    sorted = sorted.filter((p) => postMatchesAnyCategorySlug(p, categorySlugs));
  }

  // Append-mode load more sends excludeSlugs for items already in the grid — always take the next chunk from the top.
  const start = excludeSlugs.size > 0 ? 0 : (page - 1) * perPage;
  const slice = sorted.slice(start, start + perPage);
  const hasMore = start + slice.length < sorted.length;

  const html =
    format === 'impreza'
      ? slice.map((p) => buildImprezaInsightsGridCardHtml(p)).join('\n')
      : slice.map((p) => buildImprezaInsightsGridCardHtml(p)).join('\n');

  return new Response(
    JSON.stringify({
      ok: true,
      page,
      perPage,
      grid,
      category: category || null,
      categories: categorySlugs.length ? categorySlugs : null,
      total: sorted.length,
      hasMore,
      nextPage: hasMore ? (excludeSlugs.size > 0 ? 1 : page + 1) : null,
      html,
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
