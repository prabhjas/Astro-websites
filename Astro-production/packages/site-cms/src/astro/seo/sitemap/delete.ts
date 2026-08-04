import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../../context.js';
import { requireInternalJobAuth, internalJson } from '../../../auth/internal-job.js';
import { deleteSitemapOverride } from '../../../seo/sitemap-overrides-store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const updatedBy = String(formData.get('updatedBy') || 'internal-job');

  const path = String(formData.get('path') || '').trim();
  const env = getLeadEnv();

  try {
    await deleteSitemapOverride(env.internalAdminDir, path, updatedBy);
  } catch (error) {
    return internalJson(
      { success: false, message: error instanceof Error ? error.message : 'Invalid path' },
      400,
    );
  }

  return internalJson({ success: true, path });
};
