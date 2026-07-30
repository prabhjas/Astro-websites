import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getServerEnv } from '../../../../env/server';
import { canManageRedirects, requireCsrf } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import { persistManagedRedirects, readManagedRedirects } from '../../../../lib/runtime-redirects/store';
import { applyInternalNoIndexHeaders, dashboardSeeOther } from '../../../../lib/security/internal-response';

const execFileAsync = promisify(execFile);

export const prerender = false;

async function regenerateRedirectArtifacts(): Promise<void> {
  try {
    await execFileAsync('node', ['scripts/generate-redirects.mjs'], { cwd: process.cwd() });
  } catch (error) {
    console.error('[redirects/bulk-delete] generate-redirects failed', error);
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
  if (!requireCsrf(session, csrfToken)) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const selected = formData
    .getAll('from')
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (!selected.length) {
    return dashboardSeeOther(request, '/internal/operations/redirects/?error=none-selected');
  }

  const env = getServerEnv();
  const selectedSet = new Set(selected);
  const rules = await readManagedRedirects(env.internalAdminDir, process.cwd());
  await persistManagedRedirects(
    env.internalAdminDir,
    process.cwd(),
    rules.filter((rule) => !selectedSet.has(rule.from)),
  );
  await regenerateRedirectArtifacts();
  return dashboardSeeOther(request, `/internal/operations/redirects/?deleted=${selected.length}`);
};
