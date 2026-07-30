import type { APIRoute } from 'astro';
import { hasDashboardRole, requireCsrf } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import { deletePostPermanently, movePostToTrash, restorePostFromTrash } from '../../../../lib/internal-posts/store';
import { applyInternalNoIndexHeaders } from '../../../../lib/security/internal-response';

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
  if (!slug) return new Response('Missing slug', { status: 400, headers });

  const mode = String(formData.get('mode') || 'trash').trim();
  if (mode === 'restore') {
    restorePostFromTrash(slug);
  } else if (mode === 'permanent') {
    deletePostPermanently(slug);
  } else {
    movePostToTrash(slug);
  }
  return redirect('/internal/operations/posts/', 303);
};

