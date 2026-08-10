import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { FileLeadStore } from '../../leads/file-store.js';
import { getLeadEnv } from '../../context.js';
import { isValidPublicId } from '../../leads/public-id.js';

export const prerender = false;

/** Lead detail + delivery attempts for the central CMS. */
export const GET: APIRoute = async ({ request, params }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const publicId = String(params.publicId || '');
  if (!publicId) return internalJson({ success: false, message: 'Missing publicId' }, 400);
  if (!isValidPublicId(publicId)) return internalJson({ success: false, message: 'Invalid publicId' }, 400);

  const env = getLeadEnv();
  const store = new FileLeadStore({ rootDir: env.leadStoreDir, maxFileBytes: env.leadStoreMaxFileBytes });
  const lead = await store.getSubmission(publicId);
  if (!lead) return internalJson({ success: false, message: 'Not found' }, 404);

  const attempts = await store.listAttempts(publicId);
  return internalJson({ success: true, lead, attempts });
};
