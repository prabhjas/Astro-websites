import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { readGlobalGtmConfig } from '../../gtm/store.js';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const env = getLeadEnv();
  const config = await readGlobalGtmConfig(env.internalAdminDir);
  return internalJson({ success: true, config });
};
