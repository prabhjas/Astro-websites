import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../env/server';
import { FileLeadStore } from '../../../lib/leads/file-store';
import { deliverStoredLead } from '../../../lib/leads/service';
import { applyInternalNoIndexHeaders } from '../../../lib/security/internal-response';

export const prerender = false;

function isAuthorized(request: Request, secret: string): boolean {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const header = request.headers.get('x-internal-job-secret')?.trim();
  const url = new URL(request.url);
  const query = url.searchParams.get('secret')?.trim();
  return Boolean(secret && (bearer === secret || header === secret || query === secret));
}

const runRetries: APIRoute = async ({ request }) => {
  const env = getServerEnv();
  const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8' });
  applyInternalNoIndexHeaders(headers);

  if (!env.internalJobSecret) {
    return new Response(JSON.stringify({ success: false, message: 'INTERNAL_JOB_SECRET is not configured.' }), {
      status: 503,
      headers,
    });
  }

  if (!isAuthorized(request, env.internalJobSecret)) {
    return new Response(JSON.stringify({ success: false, message: 'Forbidden' }), { status: 403, headers });
  }

  const url = new URL(request.url);
  const limitRaw = Number(url.searchParams.get('limit') || 25);
  const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, limitRaw)) : 25;
  const store = new FileLeadStore({ rootDir: env.leadStoreDir, maxFileBytes: env.leadStoreMaxFileBytes });
  const due = (await store.listDueRetries(new Date().toISOString())).slice(0, limit);

  const results = [];
  for (const record of due) {
    const updated = await deliverStoredLead(env, store, record, crypto.randomUUID(), 'automatic_retry');
    results.push({
      publicId: updated.publicId,
      deliveryStatus: updated.deliveryStatus,
      pipedriveLeadId: updated.pipedriveLeadId,
      lastErrorMessage: updated.lastErrorMessage,
      lastAttemptAt: updated.lastAttemptAt,
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      processed: results.length,
      scanned: due.length,
      results,
    }),
    { status: 200, headers },
  );
};

export const GET = runRetries;
export const POST = runRetries;
