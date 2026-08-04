/**
 * Shared auth for machine callers (central CMS / cron).
 * Prefer Authorization: Bearer <INTERNAL_JOB_SECRET>
 * Also accepts x-internal-job-secret and ?secret= (legacy cron).
 */
import { getLeadEnv } from '../context.js';
import { applyInternalNoIndexHeaders } from '../security/internal-response.js';

export function isInternalJobAuthorized(request: Request, secret: string): boolean {
  if (!secret) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const header = request.headers.get('x-internal-job-secret')?.trim();
  const query = new URL(request.url).searchParams.get('secret')?.trim();
  return bearer === secret || header === secret || query === secret;
}

export function internalJsonHeaders(): Headers {
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  applyInternalNoIndexHeaders(headers);
  return headers;
}

export function internalJson(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: internalJsonHeaders() });
}

/** Returns an error Response if unauthorized / misconfigured; otherwise null. */
export function requireInternalJobAuth(request: Request): Response | null {
  let secret = '';
  try {
    secret = String(getLeadEnv().internalJobSecret || '');
  } catch {
    return internalJson({ success: false, message: 'Server configuration error.' }, 500);
  }

  if (!secret) {
    return internalJson({ success: false, message: 'INTERNAL_JOB_SECRET is not configured.' }, 503);
  }

  if (!isInternalJobAuthorized(request, secret)) {
    return internalJson({ success: false, message: 'Forbidden' }, 403);
  }

  return null;
}
