import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../../../env/server';
import { canManageSeo, requireCsrf } from '../../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../../lib/auth/session';
import { deleteSitemapOverride, upsertSitemapOverride } from '../../../../../lib/seo/sitemap-overrides-store';
import { applyInternalNoIndexHeaders } from '../../../../../lib/security/internal-response';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const headers = new Headers();
  applyInternalNoIndexHeaders(headers);
  const session = readDashboardSession(cookies);
  if (!session || !canManageSeo(session)) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const formData = await request.formData();
  const csrfToken = String(formData.get('csrfToken') || '');
  if (!requireCsrf(session, csrfToken)) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const path = String(formData.get('path') || '').trim();
  const q = String(formData.get('q') || '').trim();
  const page = String(formData.get('page') || '').trim();
  const env = getServerEnv();
  const priority = formData.get('priority');
  const changefreq = formData.get('changefreq');
  const bothEmpty =
    String(priority || '').trim() === '' && String(changefreq || '').trim() === '';

  try {
    if (bothEmpty) {
      await deleteSitemapOverride(env.internalAdminDir, path, session.email);
    } else {
      await upsertSitemapOverride(
        env.internalAdminDir,
        path,
        { priority, changefreq },
        session.email,
      );
    }
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Invalid override', {
      status: 400,
      headers,
    });
  }

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (page) params.set('page', page);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return redirect(`/internal/operations/seo/sitemap/${suffix}`, 303);
};
