import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../../auth/internal-job.js';
import { getTaxonomyAdapter } from '../../../adapters.js';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const taxonomy = getTaxonomyAdapter();

  const includeTrash = url.searchParams.get('trash') === '1';
  const q = url.searchParams.get('q') || '';
  const tags = taxonomy.listTagTerms(includeTrash, q);
  return internalJson({ success: true, count: tags.length, tags });
};
