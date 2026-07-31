import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { FileLeadStore } from '../../leads/file-store.js';
import { getLeadEnv } from '../../context.js';

export const prerender = false;

/** Lead detail + delivery attempts for the central CMS. */
export const GET: APIRoute = async ({ request, params }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const publicId = String(params.publicId || '').trim();
  if (!publicId) return internalJson({ success: false, message: 'Missing publicId' }, 400);

  const env = getLeadEnv();
  const store = new FileLeadStore({ rootDir: env.leadStoreDir, maxFileBytes: env.leadStoreMaxFileBytes });
  const lead = await store.getSubmission(publicId);
  if (!lead) return internalJson({ success: false, message: 'Not found' }, 404);

  const attempts = await store.listAttempts(publicId);
  return internalJson({ success: true, lead, attempts });
};
