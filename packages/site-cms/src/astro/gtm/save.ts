import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { writeGlobalGtmConfig } from '../../gtm/store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const updatedBy = String(formData.get('updatedBy') || 'internal-job');

  const env = getLeadEnv();
  await writeGlobalGtmConfig(env.internalAdminDir, {
    headScript: String(formData.get('headScript') || ''),
    bodyHtml: String(formData.get('bodyHtml') || ''),
    footerScript: String(formData.get('footerScript') || ''),
    updatedBy,
  });
  return internalJson({ success: true });
};
