import type { APIRoute } from 'astro';
import { buildAuthorElementorLoopCardHtml } from '../../../lib/author-blog-card.ts';
import { getPostsByAuthorSlug } from '../../../lib/blog.ts';

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
  const slug = String(url.searchParams.get('slug') || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '');
  if (!slug) {
    return json({ ok: false, message: 'Missing author slug' }, 400);
  }

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

  const all = getPostsByAuthorSlug(slug);
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
};
