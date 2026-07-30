import type { APIRoute } from 'astro';
import { requireCsrf } from '../../../lib/auth/permissions';
import { clearDashboardSessionCookie, readDashboardSession } from '../../../lib/auth/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = readDashboardSession(cookies);
  const formData = await request.formData();
  const csrfToken = String(formData.get('csrfToken') || '');
  if (!requireCsrf(session, csrfToken)) {
    return new Response('Forbidden', { status: 403 });
  }

  clearDashboardSessionCookie(cookies);
  return redirect('/internal/operations/login', 303);
};
