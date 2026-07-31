import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { InternalUploadStore } from '../../internal-uploads/store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const uploadId = String(formData.get('uploadId') || '');
  if (!uploadId) {
    return internalJson({ success: false, message: 'Missing uploadId' }, 400);
  }

  const env = getLeadEnv();
  const store = new InternalUploadStore({ rootDir: env.internalUploadDir });
  await store.delete(uploadId);
  return internalJson({ success: true, uploadId });
};
