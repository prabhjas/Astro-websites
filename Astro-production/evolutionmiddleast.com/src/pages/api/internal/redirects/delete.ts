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
    console.error('[redirects/delete] generate-redirects failed', error);
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
  // Prefer deleteFrom so checkbox "from" values in the bulk form do not steal the target.
  const from = String(formData.get('deleteFrom') || formData.get('from') || '').trim();
  if (!requireCsrf(session, csrfToken) || !from) {
    return new Response('Forbidden', { status: 403, headers });
  }

  const env = getServerEnv();
  const rules = await readManagedRedirects(env.internalAdminDir, process.cwd());
  await persistManagedRedirects(
    env.internalAdminDir,
    process.cwd(),
    rules.filter((rule) => rule.from !== from),
  );
  await regenerateRedirectArtifacts();
  return dashboardSeeOther(request, '/internal/operations/redirects/?deleted=1');
};
