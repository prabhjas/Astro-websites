import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { readManagedRedirects, readRedirectStats } from '../../runtime-redirects/store.js';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const env = getLeadEnv();
  const redirects = await readManagedRedirects(env.internalAdminDir, process.cwd());
  const stats = await readRedirectStats(env.internalAdminDir);
  return internalJson({ success: true, count: redirects.length, redirects, stats });
};
