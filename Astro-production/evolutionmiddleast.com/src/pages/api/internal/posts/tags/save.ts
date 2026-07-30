import type { APIRoute } from 'astro';
import { hasDashboardRole, requireCsrf } from '../../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../../lib/auth/session';
import { applyInternalNoIndexHeaders } from '../../../../../lib/security/internal-response';
import { upsertTag } from '../../../../../lib/internal-posts/taxonomy-store';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const headers = new Headers();
  applyInternalNoIndexHeaders(headers);

  const session = readDashboardSession(cookies);
  if (!session || !hasDashboardRole(session, 'developer')) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const formData = await request.formData();
  const csrfToken = String(formData.get('csrfToken') || '');
  if (!requireCsrf(session, csrfToken)) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const originalSlug = String(formData.get('originalSlug') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();

  if (!name) return new Response('Missing name', { status: 400, headers });
  if (!slug && !name) return new Response('Missing slug', { status: 400, headers });

  try {
    const result = upsertTag({ originalSlug: originalSlug || undefined, name, slug });
    return redirect(`/internal/operations/posts/tags/${encodeURIComponent(result.term.slug)}/`, 303);
  } catch (e: any) {
    return new Response(String(e?.message || 'Failed to save tag'), { status: 400, headers });
  }
};

