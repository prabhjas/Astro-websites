import type { APIRoute } from 'astro';
import { getLeadEnv } from '../context.js';
import { requireInternalJobAuth, internalJson } from '../auth/internal-job.js';
import { FileLeadStore } from '../leads/file-store.js';
import { deliverStoredLead } from '../leads/service.js';

export const prerender = false;

const runRetries: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const env = getLeadEnv();
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

  return internalJson({
    success: true,
    processed: results.length,
    scanned: due.length,
    results,
  });
};

export const GET = runRetries;
export const POST = runRetries;
