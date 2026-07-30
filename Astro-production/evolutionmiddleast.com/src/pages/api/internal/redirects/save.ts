import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getServerEnv } from '../../../../env/server';
import { canManageRedirects, requireCsrf } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import {
  normaliseRedirectRule,
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
    console.error('[redirects/save] generate-redirects failed', error);
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

  const originalFrom = String(formData.get('originalFrom') || '').trim();
  const fromFieldKey = originalFrom ? `from:${originalFrom}` : 'from';
  const toFieldKey = originalFrom ? `to:${originalFrom}` : 'to';
  const statusFieldKey = originalFrom ? `status:${originalFrom}` : 'status';
  const rule = normaliseRedirectRule({
    from: String(formData.get(fromFieldKey) || formData.get('from') || ''),
    to: String(formData.get(toFieldKey) || formData.get('to') || ''),
    status: Number(formData.get(statusFieldKey) || formData.get('status') || 301),
    source: 'dashboard',
  });
  if (!rule.from || !rule.to) {
    return dashboardSeeOther(request, '/internal/operations/redirects/?error=invalid');
  }

  const env = getServerEnv();
  const rules = await readManagedRedirects(env.internalAdminDir, process.cwd());
  const filtered = rules.filter((existing) => existing.from !== originalFrom && existing.from !== rule.from);
  await persistManagedRedirects(env.internalAdminDir, process.cwd(), [...filtered, rule]);
  await regenerateRedirectArtifacts();
  return dashboardSeeOther(request, '/internal/operations/redirects/?saved=1');
};
