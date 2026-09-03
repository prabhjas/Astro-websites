import type { APIRoute } from 'astro';
import { getLeadEnv } from '../context.js';
import { requireInternalJobAuth, internalJson } from '../auth/internal-job.js';
import { FileLeadStore } from '../leads/file-store.js';
import { deliverStoredLead } from '../leads/service.js';
import { readFlowConfig } from '../leads/destinations/flow.js';
import { flowSelfTest } from '../leads/destinations/flow.js';

export const prerender = false;

const runRetries: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const env = getLeadEnv();
  const url = new URL(request.url);

  /**
   * Post-deploy self-test: `?selftest=flow`.
   *
   * It lives on this route rather than its own because every site already mounts
   * this one, and a new route would mean a file in 36 site packages while publish
   * accepts at most 8 changed sites per release.
   *
   * Run against a site's backend, a 200 proves in one call that this process is
   * on the release carrying the adapter, holds working credentials, has a clock
   * inside the signature window, is posting from an allow-listed address, and can
   * reach Flow. A publish that switched only the front cannot produce a 200 here,
   * because this code would not be running — it answers `unsupported` instead.
   */
  if (url.searchParams.get('selftest') === 'flow') {
    const config = readFlowConfig(env);
    if (!config) {
      return internalJson({ success: false, selftest: 'flow', configured: false, error: 'Flow is not enabled for this site' }, 503);
    }
    const result = await flowSelfTest(config);
    return internalJson(
      { success: result.ok, selftest: 'flow', siteId: config.siteId, ...result },
      result.ok ? 200 : 502,
    );
  }
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
