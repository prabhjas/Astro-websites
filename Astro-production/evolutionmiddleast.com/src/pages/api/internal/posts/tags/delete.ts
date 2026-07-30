import type { APIRoute } from 'astro';
import { hasDashboardRole, requireCsrf } from '../../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../../lib/auth/session';
import { applyInternalNoIndexHeaders } from '../../../../../lib/security/internal-response';
import { deleteTagPermanently, moveTagToTrash, restoreTagFromTrash } from '../../../../../lib/internal-posts/taxonomy-store';

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

  const slug = String(formData.get('slug') || '').trim();
  const mode = String(formData.get('mode') || 'trash').trim();
  if (!slug) return new Response('Missing slug', { status: 400, headers });

  if (mode === 'restore') {
    restoreTagFromTrash(slug);
  } else if (mode === 'permanent') {
    deleteTagPermanently(slug);
  } else {
    moveTagToTrash(slug);
  }

  const nextStatus = mode === 'trash' ? 'trash' : 'all';
  return redirect(`/internal/operations/posts/tags/?status=${nextStatus}`, 303);
};

