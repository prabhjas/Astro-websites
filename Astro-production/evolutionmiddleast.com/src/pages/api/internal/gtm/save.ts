import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../../env/server';
import { hasDashboardRole, requireCsrf } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import { writeGlobalGtmConfig } from '../../../../lib/gtm/store';
import { applyInternalNoIndexHeaders, dashboardSeeOther } from '../../../../lib/security/internal-response';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = new Headers();
  applyInternalNoIndexHeaders(headers);
  const session = readDashboardSession(cookies);
  if (!session || !hasDashboardRole(session, 'super_admin')) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const formData = await request.formData();
  const csrfToken = String(formData.get('csrfToken') || '');
  if (!requireCsrf(session, csrfToken)) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const env = getServerEnv();
  await writeGlobalGtmConfig(env.internalAdminDir, {
    headScript: String(formData.get('headScript') || ''),
    bodyHtml: String(formData.get('bodyHtml') || ''),
    footerScript: String(formData.get('footerScript') || ''),
    updatedBy: session.email,
  });
  return dashboardSeeOther(request, '/internal/operations/gtm/?saved=1');
};
