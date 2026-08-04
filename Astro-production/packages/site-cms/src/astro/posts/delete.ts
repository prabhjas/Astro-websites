import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { getPostsAdapter } from '../../adapters.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const postsApi = getPostsAdapter();

  const formData = await request.formData();

  const slug = String(formData.get('slug') || '').trim();
  if (!slug) return internalJson({ success: false, message: 'Missing slug' }, 400);

  const mode = String(formData.get('mode') || 'trash').trim();
  if (mode === 'restore') {
    postsApi.restorePostFromTrash(slug);
  } else if (mode === 'permanent') {
    postsApi.deletePostPermanently(slug);
  } else {
    postsApi.movePostToTrash(slug);
  }
  return internalJson({ success: true, slug, mode });
};
