import type { APIRoute } from 'astro';
import { getAllBlogSlugs } from '../../../lib/blog.ts';
import { getViewCount, incrementView } from '../../../lib/blog-views.ts';
import { getClientIp, isRateLimited } from '../../../utils/form/rate-limit';

export const prerender = false;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

const slugSet = new Set(getAllBlogSlugs());

export const POST: APIRoute = async ({ request }) => {
  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return json({ ok: false, error: 'rate_limited' }, 429);
  }

  let slug = '';
  try {
    const ct = request.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const body = (await request.json()) as { slug?: string };
      slug = String(body?.slug || '').trim();
    } else {
      const fd = await request.formData();
      slug = String(fd.get('slug') || '').trim();
    }
  } catch {
    return json({ ok: false, error: 'bad_request' }, 400);
  }

  slug = slug.replace(/^\/+|\/+$/g, '').split('/')[0] || '';
  if (!slug || !slugSet.has(slug)) {
    return json({ ok: false, error: 'unknown_slug' }, 404);
  }

  // Dedupe: one counted view per slug per browser session via header cookie-ish key
  const cookie = request.headers.get('cookie') || '';
  const seenKey = `cg_bv_${slug}`;
  if (cookie.includes(`${seenKey}=1`)) {
    return json({ ok: true, slug, views: getViewCount(slug), deduped: true });
  }

  const views = incrementView(slug);
  return new Response(JSON.stringify({ ok: true, slug, views }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Set-Cookie': `${seenKey}=1; Path=/; Max-Age=86400; SameSite=Lax`,
    },
  });
};

export const GET: APIRoute = async ({ url }) => {
  const slug = String(url.searchParams.get('slug') || '')
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .split('/')[0];
  if (!slug || !slugSet.has(slug)) {
    return json({ ok: false, error: 'unknown_slug' }, 404);
  }
  return json({ ok: true, slug, views: getViewCount(slug) });
};
