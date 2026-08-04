import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../../auth/internal-job.js';
import { getTaxonomyAdapter } from '../../../adapters.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const taxonomy = getTaxonomyAdapter();

  const formData = await request.formData();

  const slug = String(formData.get('slug') || '').trim();
  const mode = String(formData.get('mode') || 'trash').trim();
  if (!slug) return internalJson({ success: false, message: 'Missing slug' }, 400);

  if (mode === 'restore') {
    taxonomy.restoreTagFromTrash(slug);
  } else if (mode === 'permanent') {
    taxonomy.deleteTagPermanently(slug);
  } else {
    taxonomy.moveTagToTrash(slug);
  }

  return internalJson({ success: true, slug, mode });
};
