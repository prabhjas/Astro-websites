import type { APIRoute } from 'astro';
import {
  buildCafCardHtml,
  buildCafPaginationHtml,
  filterPostsByTermIds,
  getIndexedPosts,
} from '../../../lib/posts-index';

export const prerender = false;

/**
 * Category Ajax Filter (CAF) replacement for WP admin-ajax `get_filter_posts`.
 * Accepts jQuery-serialized form: action + params[page] + params[term] + …
 */
async function handle(request: Request): Promise<Response> {
  let page = 1;
  let term = '';
  let perPage = 6;
  let action = '';

  if (request.method === 'POST') {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
      action = String(body.action || '');
      const params = (body.params || {}) as Record<string, unknown>;
      page = Math.max(1, Number(params.page) || 1);
      term = String(params.term || '');
      perPage = Math.min(24, Math.max(1, Number(params['per-page']) || 6));
    } else {
      const form = await request.formData().catch(() => null);
      if (form) {
        action = String(form.get('action') || '');
        // jQuery may send params as nested keys or JSON string
        const paramsRaw = form.get('params');
        if (typeof paramsRaw === 'string' && paramsRaw.startsWith('{')) {
          try {
            const params = JSON.parse(paramsRaw) as Record<string, unknown>;
            page = Math.max(1, Number(params.page) || 1);
            term = String(params.term || '');
            perPage = Math.min(24, Math.max(1, Number(params['per-page']) || 6));
          } catch {
            /* fall through */
          }
        }
        page = Math.max(1, Number(form.get('params[page]') ?? form.get('page') ?? page) || page);
        term = String(form.get('params[term]') ?? form.get('term') ?? term);
        perPage = Math.min(
          24,
          Math.max(1, Number(form.get('params[per-page]') ?? form.get('per-page') ?? perPage) || perPage),
        );
      }
    }
  } else {
    const url = new URL(request.url);
    action = url.searchParams.get('action') || 'get_filter_posts';
    page = Math.max(1, Number(url.searchParams.get('page') || url.searchParams.get('params[page]') || '1') || 1);
    term = url.searchParams.get('term') || url.searchParams.get('params[term]') || '';
    perPage = Math.min(
      24,
      Math.max(
        1,
        Number(url.searchParams.get('per-page') || url.searchParams.get('params[per-page]') || '6') || 6,
      ),
    );
  }

  if (action && action !== 'get_filter_posts') {
    return new Response(JSON.stringify({ status: 400, message: 'unsupported action', found: 0, content: '' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const filtered = filterPostsByTermIds(getIndexedPosts(), term);
  const found = filtered.length;
  if (!found) {
    return new Response(
      JSON.stringify({
        status: 201,
        found: 0,
        message: 'No posts found',
        content: '<div class="status"></div><div class="error-caf">No posts found</div>',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=30',
        },
      },
    );
  }

  const totalPages = Math.max(1, Math.ceil(found / perPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * perPage;
  const slice = filtered.slice(start, start + perPage);
  const cards = slice.map((p) => buildCafCardHtml(p)).join('');
  const pagination = buildCafPaginationHtml(safePage, totalPages);
  const content = `<div class="status"></div>${cards}${pagination}`;

  return new Response(
    JSON.stringify({
      status: 200,
      found,
      message: 'ok',
      content,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=30',
      },
    },
  );
}

export const GET: APIRoute = async ({ request }) => handle(request);
export const POST: APIRoute = async ({ request }) => handle(request);
