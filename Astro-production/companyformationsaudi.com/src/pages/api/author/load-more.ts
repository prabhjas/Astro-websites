import type { APIRoute } from 'astro';
import { getAuthorArchiveSlice, AUTHOR_ARCHIVE_LOAD_MORE } from '../../../lib/authors.ts';

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const slug = String(url.searchParams.get('slug') || '').trim();
  if (!slug) {
    return new Response(JSON.stringify({ ok: false, message: 'slug required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const offset = Math.max(0, Number(url.searchParams.get('offset') || '0') || 0);
  const perPage = Math.min(
    24,
    Math.max(1, Number(url.searchParams.get('perPage') || AUTHOR_ARCHIVE_LOAD_MORE) || AUTHOR_ARCHIVE_LOAD_MORE),
  );

  const slice = getAuthorArchiveSlice(slug, offset, perPage);
  return new Response(
    JSON.stringify({
      ok: true,
      slug,
      ...slice,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30',
      },
    },
  );
};
