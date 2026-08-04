import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../../context.js';
import { requireInternalJobAuth, internalJson } from '../../../auth/internal-job.js';
import { deleteSitemapOverride, upsertSitemapOverride } from '../../../seo/sitemap-overrides-store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const updatedBy = String(formData.get('updatedBy') || 'internal-job');

  const path = String(formData.get('path') || '').trim();
  const env = getLeadEnv();
  const priority = formData.get('priority');
  const changefreq = formData.get('changefreq');
  const bothEmpty =
    String(priority || '').trim() === '' && String(changefreq || '').trim() === '';

  try {
    if (bothEmpty) {
      await deleteSitemapOverride(env.internalAdminDir, path, updatedBy);
    } else {
      await upsertSitemapOverride(
        env.internalAdminDir,
        path,
        { priority, changefreq },
        updatedBy,
      );
    }
  } catch (error) {
    return internalJson(
      { success: false, message: error instanceof Error ? error.message : 'Invalid override' },
      400,
    );
  }

  return internalJson({ success: true, path, deleted: bothEmpty });
};
