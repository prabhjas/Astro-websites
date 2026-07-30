import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../env/server';
import { hasDashboardRole, requireCsrf } from '../../../lib/auth/permissions';
import { readDashboardSession } from '../../../lib/auth/session';
import { FileLeadStore } from '../../../lib/leads/file-store';
import { deliverStoredLead } from '../../../lib/leads/service';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const session = readDashboardSession(cookies);
  if (!session || !hasDashboardRole(session, 'developer')) {
    return new Response('Forbidden', { status: 403 });
  }

  const formData = await request.formData();
  const publicId = String(formData.get('publicId') || '');
  const csrfToken = String(formData.get('csrfToken') || '');
  if (!requireCsrf(session, csrfToken) || !publicId) {
    return new Response('Forbidden', { status: 403 });
  }

  const env = getServerEnv();
  const store = new FileLeadStore({ rootDir: env.leadStoreDir, maxFileBytes: env.leadStoreMaxFileBytes });
  const record = await store.getSubmission(publicId);
  if (!record) {
    return new Response('Not found', { status: 404 });
  }

  await deliverStoredLead(env, store, record, crypto.randomUUID(), 'manual_retry');
  return redirect(`/internal/operations/leads/${publicId}/`, 303);
};
