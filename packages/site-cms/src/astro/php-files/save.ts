import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { PhpFileStore } from '../../php-files/store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const fileName = String(formData.get('fileName') || '');
  const content = String(formData.get('content') || '');
  if (!fileName) {
    return internalJson({ success: false, message: 'Missing fileName' }, 400);
  }

  const updatedBy = String(formData.get('updatedBy') || 'internal-job');
  const env = getLeadEnv();
  const store = new PhpFileStore(
    env.internalAdminDir,
    env.internalEnhancedLiveDir || '.data/enhanced-live',
  );
  await store.saveEditedLiveFile(fileName, content, updatedBy);
  return internalJson({ success: true, fileName });
};
