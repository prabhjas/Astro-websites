import type { APIRoute } from 'astro';
import { getLeadEnv } from '../context.js';
import { requireInternalJobAuth, internalJson } from '../auth/internal-job.js';
import { FileLeadStore } from '../leads/file-store.js';
import { deliverStoredLead } from '../leads/service.js';
import { isValidPublicId } from '../leads/public-id.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  let publicId = '';
  const contentType = request.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = (await request.json()) as Record<string, unknown>;
    publicId = String(json.publicId || '').trim();
  } else {
    const formData = await request.formData();
    publicId = String(formData.get('publicId') || '').trim();
  }

  if (!publicId) {
    return internalJson({ success: false, message: 'Missing publicId' }, 400);
  }
  if (!isValidPublicId(publicId)) {
    return internalJson({ success: false, message: 'Invalid publicId' }, 400);
  }

  const env = getLeadEnv();
  const store = new FileLeadStore({ rootDir: env.leadStoreDir, maxFileBytes: env.leadStoreMaxFileBytes });
  const record = await store.getSubmission(publicId);
  if (!record) {
    return internalJson({ success: false, message: 'Not found' }, 404);
  }

  const updated = await deliverStoredLead(env, store, record, crypto.randomUUID(), 'manual_retry');
  return internalJson({
    success: true,
    publicId: updated.publicId,
    deliveryStatus: updated.deliveryStatus,
  });
};
