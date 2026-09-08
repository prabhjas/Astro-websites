import type { APIRoute } from 'astro';
import { buildAuthorElementorLoopCardHtml } from '../../../lib/author-blog-card.ts';
import { getPostsByAuthorSlug, getAllBlogPosts, buildPostCardHtml } from '../../../lib/blog.ts';

export const prerender = false;

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=60',
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const authorSlug = String(url.searchParams.get('slug') || url.searchParams.get('author') || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');

  const offset = Math.max(0, Number(url.searchParams.get('offset') || 0) || 0);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get('limit') || DEFAULT_LIMIT) || DEFAULT_LIMIT),
  );

  const excludeRaw = String(url.searchParams.get('exclude') || '');
  const exclude = new Set(
    excludeRaw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );

  if (authorSlug) {
    const all = getPostsByAuthorSlug(authorSlug);
    const remaining = all.filter((post) => !exclude.has(post.slug));
    // Prefer exclude list (matches what's already on the page); fall back to offset.
    const pool = exclude.size > 0 ? remaining : all.slice(offset);
    const batch = pool.slice(0, limit);
    const html = batch.map((post) => buildAuthorElementorLoopCardHtml(post)).join('\n');
    const hasMore = pool.length > batch.length;

    return json({
      ok: true,
      html,
      count: batch.length,
      hasMore,
      total: all.length,
      message: batch.length ? undefined : 'No more post found',
    });
  }

  // Fallback: general blog load-more
  const all = getAllBlogPosts();
  const remaining = all.filter((post) => !exclude.has(post.slug));
  const pool = exclude.size > 0 ? remaining : all.slice(offset);
  const batch = pool.slice(0, limit);
  const html = batch.map((post) => buildPostCardHtml(post)).join('\n');
  const hasMore = pool.length > batch.length;

  return json({
    ok: true,
    html,
    count: batch.length,
    hasMore,
    total: all.length,
    message: batch.length ? undefined : 'No more post found',
  });
};
