import type { APIRoute } from 'astro';
import {
  getAuthor,
  getPostsByAuthorSlug,
  AUTHOR_LOAD_MORE_PAGE,
  buildAuthorPostCardHtml,
} from '../../../../lib/authors.ts';

export const prerender = false;

export const GET: APIRoute = async ({ params, url }) => {
  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ ok: false, error: 'Missing slug' }), { status: 400 });
  }

  const author = getAuthor(slug);
  if (!author) {
    return new Response(JSON.stringify({ ok: false, error: 'Author not found' }), { status: 404 });
  }

  const offset = Math.max(0, Number(url.searchParams.get('offset') || '0') || 0);
  const limit = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get('limit') || String(AUTHOR_LOAD_MORE_PAGE)) || AUTHOR_LOAD_MORE_PAGE),
  );

  const all = getPostsByAuthorSlug(slug);
  const slice = all.slice(offset, offset + limit);
  const nextOffset = offset + slice.length;
  const hasMore = nextOffset < all.length;

  const html = slice.map((p) => buildAuthorPostCardHtml(p)).join('\n');

  return new Response(
    JSON.stringify({
      ok: true,
      html,
      hasMore,
      nextOffset,
      total: all.length,
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
