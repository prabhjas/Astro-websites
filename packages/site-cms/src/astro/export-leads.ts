import type { APIRoute } from 'astro';
import { getLeadEnv } from '../context.js';
import { requireInternalJobAuth } from '../auth/internal-job.js';
import { matchesLeadQuery, toLeadCsv, toLeadJson } from '../leads/dashboard.js';
import { FileLeadStore } from '../leads/file-store.js';
import { applyInternalNoIndexHeaders } from '../security/internal-response.js';

export const prerender = false;

export const GET: APIRoute = async ({ url, request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const env = getLeadEnv();
  const q = url.searchParams.get('q') || '';
  const format = url.searchParams.get('format') === 'json' ? 'json' : 'csv';
  const store = new FileLeadStore({ rootDir: env.leadStoreDir, maxFileBytes: env.leadStoreMaxFileBytes });
  const records = (await store.listSubmissions()).filter((record) => matchesLeadQuery(record, q));
  const timestamp = Date.now();
  const headers = new Headers(
    format === 'json'
      ? {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="operations-${timestamp}.json"`,
        }
      : {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="operations-${timestamp}.csv"`,
        },
  );
  applyInternalNoIndexHeaders(headers);
  return new Response(format === 'json' ? toLeadJson(records) : toLeadCsv(records), { status: 200, headers });
};
