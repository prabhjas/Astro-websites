import type { APIRoute } from 'astro';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';

export const prerender = false;

/**
 * PHP upload/deploy is disabled (security audit P0-3).
 * Offline conversions should use a Node route, not server-side PHP execution.
 */
export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  return internalJson(
    {
      success: false,
      message:
        'PHP file upload/deploy is disabled. Use a Node-based enhanced conversion route instead of executable PHP on the origin.',
    },
    410,
  );
};
