import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../../env/server';
import { hasDashboardRole, requireCsrf } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import { InternalUploadStore } from '../../../../lib/internal-uploads/store';
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
  const uploadId = String(formData.get('uploadId') || '');
  if (!requireCsrf(session, csrfToken) || !uploadId) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const env = getServerEnv();
  const store = new InternalUploadStore({ rootDir: env.internalUploadDir });
  await store.delete(uploadId);
  return redirect('/internal/operations/uploads/', 303);
};
