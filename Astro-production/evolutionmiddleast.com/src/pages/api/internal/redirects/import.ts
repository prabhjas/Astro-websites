import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getServerEnv } from '../../../../env/server';
import { canManageRedirects, requireCsrf } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import {
  parseRankMathRedirectImport,
  persistManagedRedirects,
  readManagedRedirects,
} from '../../../../lib/runtime-redirects/store';
import { applyInternalNoIndexHeaders, dashboardSeeOther } from '../../../../lib/security/internal-response';

const execFileAsync = promisify(execFile);

export const prerender = false;

async function regenerateRedirectArtifacts(): Promise<void> {
  try {
    await execFileAsync('node', ['scripts/generate-redirects.mjs'], { cwd: process.cwd() });
  } catch (error) {
    console.error('[redirects/import] generate-redirects failed', error);
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const headers = new Headers();
  applyInternalNoIndexHeaders(headers);
  const session = readDashboardSession(cookies);
  if (!session || !canManageRedirects(session)) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const formData = await request.formData();
  const csrfToken = String(formData.get('csrfToken') || '');
  const file = formData.get('file');
  if (!requireCsrf(session, csrfToken) || !(file instanceof File)) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const fileName = (file.name || '').toLowerCase();
  const raw = await file.text();
  let parsed;
  try {
    parsed = parseRankMathRedirectImport(raw);
  } catch (error) {
    console.error('[redirects/import] parse failed', fileName, error);
    return dashboardSeeOther(request, '/internal/operations/redirects/?error=import-parse');
  }

  if (!parsed.length) {
    return dashboardSeeOther(request, '/internal/operations/redirects/?error=import-empty');
  }

  const env = getServerEnv();
  const deduped = Array.from(new Map(parsed.map((rule) => [rule.from, rule])).values());
  const existing = await readManagedRedirects(env.internalAdminDir, process.cwd());
  const mergedDeduped = Array.from(
    new Map([...existing, ...deduped].map((rule) => [rule.from, rule])).values(),
  );
  await persistManagedRedirects(env.internalAdminDir, process.cwd(), mergedDeduped);
  await regenerateRedirectArtifacts();

  return dashboardSeeOther(
    request,
    `/internal/operations/redirects/?imported=${deduped.length}&total=${mergedDeduped.length}`,
  );
};
