import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { matchesLeadQuery } from '../../leads/dashboard.js';
import { FileLeadStore } from '../../leads/file-store.js';
import { getLeadEnv } from '../../context.js';

export const prerender = false;

/** List leads for the central CMS. Auth: INTERNAL_JOB_SECRET bearer. */
export const GET: APIRoute = async ({ request, url }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const env = getLeadEnv();
  const q = url.searchParams.get('q') || '';
  const status = url.searchParams.get('status') || '';
  const store = new FileLeadStore({ rootDir: env.leadStoreDir, maxFileBytes: env.leadStoreMaxFileBytes });
  let records = await store.listSubmissions();
  if (q) records = records.filter((r) => matchesLeadQuery(r, q));
  if (status) records = records.filter((r) => r.deliveryStatus === status);

  return internalJson({ success: true, count: records.length, leads: records });
};
