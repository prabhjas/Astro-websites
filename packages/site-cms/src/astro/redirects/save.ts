import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import {
  normaliseRedirectRule,
  persistManagedRedirects,
  readManagedRedirects,
} from '../../runtime-redirects/store.js';

const execFileAsync = promisify(execFile);

export const prerender = false;

async function regenerateRedirectArtifacts(): Promise<void> {
  try {
    await execFileAsync('node', ['scripts/generate-redirects.mjs'], { cwd: process.cwd() });
  } catch (error) {
    console.error('[redirects/save] generate-redirects failed', error);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();

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
    return internalJson({ success: false, message: 'Invalid redirect rule' }, 400);
  }

  const env = getLeadEnv();
  const rules = await readManagedRedirects(env.internalAdminDir, process.cwd());
  const filtered = rules.filter((existing) => existing.from !== originalFrom && existing.from !== rule.from);
  await persistManagedRedirects(env.internalAdminDir, process.cwd(), [...filtered, rule]);
  await regenerateRedirectArtifacts();
  return internalJson({ success: true, from: rule.from, to: rule.to, status: rule.status });
};
