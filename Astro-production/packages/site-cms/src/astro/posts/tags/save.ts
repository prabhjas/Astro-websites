import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../../auth/internal-job.js';
import { getTaxonomyAdapter } from '../../../adapters.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const taxonomy = getTaxonomyAdapter();

  const formData = await request.formData();

  const originalSlug = String(formData.get('originalSlug') || '').trim();
  const name = String(formData.get('name') || '').trim();
  const slug = String(formData.get('slug') || '').trim();

  if (!name) return internalJson({ success: false, message: 'Missing name' }, 400);
  if (!slug && !name) return internalJson({ success: false, message: 'Missing slug' }, 400);

  try {
    const result = taxonomy.upsertTag({ originalSlug: originalSlug || undefined, name, slug });
    return internalJson({ success: true, slug: result.term.slug });
  } catch (e: any) {
    return internalJson({ success: false, message: String(e?.message || 'Failed to save tag') }, 400);
  }
};
