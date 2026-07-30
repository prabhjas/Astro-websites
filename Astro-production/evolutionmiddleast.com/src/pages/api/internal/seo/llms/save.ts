import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../../../env/server';
import { canManageSeo, requireCsrf } from '../../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../../lib/auth/session';
import { writeLlmsConfig } from '../../../../../lib/seo/llms-config-store';
import { writeManagedTextFile } from '../../../../../lib/seo/text-files-store';
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

  const env = getServerEnv();
  const mode = String(formData.get('mode') || 'auto') === 'override' ? 'override' : 'auto';

  await writeLlmsConfig(env.internalAdminDir, {
    mode,
    siteTitle: String(formData.get('siteTitle') || ''),
    summary: String(formData.get('summary') || ''),
    details: String(formData.get('details') || ''),
    groupOrder: String(formData.get('groupOrder') || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    postsCount: Number(formData.get('postsCount') || 15),
    optionalMarkdown: String(formData.get('optionalMarkdown') || ''),
    blogNote: String(formData.get('blogNote') || ''),
    updatedBy: session.email,
  });

  if (mode === 'override') {
    await writeManagedTextFile(env.internalAdminDir, 'llm', {
      content: String(formData.get('content') || ''),
      updatedBy: session.email,
    });
  }

  return redirect('/internal/operations/seo/llm/', 303);
};
