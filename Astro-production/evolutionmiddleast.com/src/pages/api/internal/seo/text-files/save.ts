import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../../../env/server';
import { canManageSeo, requireCsrf } from '../../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../../lib/auth/session';
import { writeManagedTextFile, type ManagedTextKind } from '../../../../../lib/seo/text-files-store';
import { applyInternalNoIndexHeaders } from '../../../../../lib/security/internal-response';

export const prerender = false;

function kindFromForm(value: FormDataEntryValue | null): ManagedTextKind | null {
  const raw = String(value || '').trim();
  if (raw === 'robots' || raw === 'llm') return raw;
  return null;
}

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

  const kind = kindFromForm(formData.get('kind'));
  if (!kind) {
    return new Response('Invalid SEO text file kind', { status: 400, headers });
  }

  const env = getServerEnv();
  await writeManagedTextFile(env.internalAdminDir, kind, {
    content: String(formData.get('content') || ''),
    updatedBy: session.email,
  });

  return redirect(`/internal/operations/seo/${kind}/`, 303);
};
