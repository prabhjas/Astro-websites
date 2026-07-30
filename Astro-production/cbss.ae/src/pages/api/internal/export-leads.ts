import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../env/server';
import { hasDashboardRole } from '../../../lib/auth/permissions';
import { readDashboardSession } from '../../../lib/auth/session';
import { matchesLeadQuery, toLeadCsv, toLeadJson } from '../../../lib/leads/dashboard';
import { FileLeadStore } from '../../../lib/leads/file-store';
import { applyInternalNoIndexHeaders } from '../../../lib/security/internal-response';

export const prerender = false;

export const GET: APIRoute = async ({ url, cookies }) => {
  const session = readDashboardSession(cookies);
  if (!session || !hasDashboardRole(session, 'viewer')) {
    return new Response('Forbidden', { status: 403 });
  }

  const env = getServerEnv();
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
