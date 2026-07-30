import type { APIRoute } from 'astro';
import { authenticateDashboardUser, dashboardAuthEnabled } from '../../../lib/auth/users';
import { createDashboardSession, setDashboardSessionCookie } from '../../../lib/auth/session';
import { applyInternalNoIndexHeaders } from '../../../lib/security/internal-response';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const headers = new Headers();
  applyInternalNoIndexHeaders(headers);

  if (!dashboardAuthEnabled()) {
    return new Response('Dashboard authentication is not configured.', { status: 503, headers });
  }

  const formData = await request.formData();
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');
  const user = authenticateDashboardUser(email, password);
  if (!user) {
    return redirect('/internal/operations/login?error=1', 303);
  }

  const token = createDashboardSession(user.email, user.role);
  setDashboardSessionCookie(cookies, token);
  if (user.role === 'seo') {
    return redirect('/internal/operations/seo/', 303);
  }
  return redirect('/internal/operations/', 303);
};
