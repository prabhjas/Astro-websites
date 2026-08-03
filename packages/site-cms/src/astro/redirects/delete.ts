import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import { persistManagedRedirects, readManagedRedirects } from '../../runtime-redirects/store.js';

const execFileAsync = promisify(execFile);

export const prerender = false;

async function regenerateRedirectArtifacts(): Promise<void> {
  try {
    await execFileAsync('node', ['scripts/generate-redirects.mjs'], { cwd: process.cwd() });
  } catch (error) {
    console.error('[redirects/delete] generate-redirects failed', error);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const from = String(formData.get('deleteFrom') || formData.get('from') || '').trim();
  if (!from) {
    return internalJson({ success: false, message: 'Missing from' }, 400);
  }

  const env = getLeadEnv();
  const rules = await readManagedRedirects(env.internalAdminDir, process.cwd());
  await persistManagedRedirects(
    env.internalAdminDir,
    process.cwd(),
    rules.filter((rule) => rule.from !== from),
  );
  await regenerateRedirectArtifacts();
  return internalJson({ success: true, from });
};
