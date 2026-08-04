import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { getPostsAdapter } from '../../adapters.js';

export const prerender = false;

/** Single post JSON for the central CMS. */
export const GET: APIRoute = async ({ request, params }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const postsApi = getPostsAdapter();

  const slug = String(params.slug || '').trim();
  if (!slug) return internalJson({ success: false, message: 'Missing slug' }, 400);

  const post = postsApi.getPost(slug);
  if (!post) return internalJson({ success: false, message: 'Not found' }, 404);

  return internalJson({ success: true, post });
};
