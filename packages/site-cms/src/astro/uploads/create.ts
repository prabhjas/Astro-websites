import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { InternalUploadStore } from '../../internal-uploads/store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return internalJson({ success: false, message: 'Missing file' }, 400);
  }

  const env = getLeadEnv();
  if (file.size > env.internalUploadMaxFileBytes) {
    return internalJson(
      { success: false, message: `File exceeds limit of ${env.internalUploadMaxFileBytes} bytes.` },
      413,
    );
  }

  const updatedBy = String(formData.get('updatedBy') || 'internal-job');
  const store = new InternalUploadStore({ rootDir: env.internalUploadDir });
  try {
    const record = await store.save(file, updatedBy);
    return internalJson({ success: true, uploadId: record.id, originalName: record.originalName });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload rejected';
    return internalJson({ success: false, message }, 400);
  }
};
