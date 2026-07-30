import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../../env/server';
import { hasDashboardRole, requireCsrf } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import { PhpFileStore } from '../../../../lib/php-files/store';
import { applyInternalNoIndexHeaders } from '../../../../lib/security/internal-response';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const headers = new Headers();
  applyInternalNoIndexHeaders(headers);
  const session = readDashboardSession(cookies);
  if (!session || !hasDashboardRole(session, 'super_admin')) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const formData = await request.formData();
  const csrfToken = String(formData.get('csrfToken') || '');
  const file = formData.get('file');
  if (!requireCsrf(session, csrfToken) || !(file instanceof File) || !file.name.endsWith('.php')) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const env = getServerEnv();
  const store = new PhpFileStore(env.internalAdminDir, env.internalEnhancedLiveDir);
  await store.deploy(file, session.email);
  return redirect('/internal/operations/php-files/', 303);
};
