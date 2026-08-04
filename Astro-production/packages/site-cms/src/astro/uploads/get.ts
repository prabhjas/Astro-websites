import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { InternalUploadStore } from '../../internal-uploads/store.js';
import { applyInternalNoIndexHeaders } from '../../security/internal-response.js';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const env = getLeadEnv();
  const store = new InternalUploadStore({ rootDir: env.internalUploadDir });
  const payload = await store.readBinary(params.uploadId || '');
  if (!payload) {
    return internalJson({ success: false, message: 'Not found' }, 404);
  }

  const headers = new Headers({
    'Content-Type': payload.record.mimeType || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${payload.record.originalName.replaceAll('"', '')}"`,
  });
  applyInternalNoIndexHeaders(headers);
  return new Response(new Uint8Array(payload.buffer), { status: 200, headers });
};
