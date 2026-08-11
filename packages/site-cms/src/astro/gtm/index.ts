import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { readStoredGlobalGtmConfig } from '../../gtm/store.js';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const env = getLeadEnv();
  // Keep legacy content visible to authenticated admins for migration, while
  // runtime readers refuse to execute non-canonical legacy markup.
  const config = await readStoredGlobalGtmConfig(env.internalAdminDir);
  return internalJson({ success: true, config });
};
