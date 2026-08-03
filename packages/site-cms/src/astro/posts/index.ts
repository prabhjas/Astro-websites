import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { getPostsAdapter } from '../../adapters.js';

export const prerender = false;

/** List blog posts (dashboard-managed JSON) for the central CMS. */
export const GET: APIRoute = async ({ request, url }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const postsApi = getPostsAdapter();

  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const status = (url.searchParams.get('status') || '').trim();
  let posts = postsApi.listAllPosts();
  if (status) posts = posts.filter((p) => (p.status || 'published') === status);
  if (q) {
    posts = posts.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q),
    );
  }

  return internalJson({ success: true, count: posts.length, posts });
};
