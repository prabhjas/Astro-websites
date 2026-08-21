import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireSiteScopedInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { GtmConfigValidationError, writeGlobalGtmConfig } from '../../gtm/store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = await requireSiteScopedInternalJobAuth(request, 'gtm:write');
  if (denied) return denied;

  const formData = await request.formData();
  const updatedBy = String(formData.get('updatedBy') || 'internal-job');
  const values = (...names: string[]): string[] =>
    names.flatMap((name) => formData.getAll(name)).map((value) => String(value));

  const env = getLeadEnv();
  try {
    await writeGlobalGtmConfig(env.internalAdminDir, {
      gtmIds: values('gtmIds', 'gtmId', 'containerId'),
      ga4Ids: values('ga4Ids', 'ga4Id', 'measurementId'),
      // Presence is tolerated for old clients only when all three are empty.
      headScript: String(formData.get('headScript') || ''),
      bodyHtml: String(formData.get('bodyHtml') || ''),
      footerScript: String(formData.get('footerScript') || ''),
      updatedBy,
    });
  } catch (error) {
    if (error instanceof GtmConfigValidationError) {
      return internalJson({ success: false, message: error.message }, 422);
    }
    throw error;
  }
  return internalJson({ success: true });
};
