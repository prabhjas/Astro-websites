import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { PhpFileStore } from '../../php-files/store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || !file.name.endsWith('.php')) {
    return internalJson({ success: false, message: 'Missing or invalid .php file' }, 400);
  }

  const updatedBy = String(formData.get('updatedBy') || 'internal-job');
  const env = getLeadEnv();
  const store = new PhpFileStore(
    env.internalAdminDir,
    env.internalEnhancedLiveDir || '.data/enhanced-live',
  );
  await store.deploy(file, updatedBy);
  return internalJson({ success: true, fileName: file.name });
};
