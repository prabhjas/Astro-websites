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
    console.error('[redirects/bulk-delete] generate-redirects failed', error);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();

  const selected = formData
    .getAll('from')
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (!selected.length) {
    return internalJson({ success: false, message: 'No redirects selected' }, 400);
  }

  const env = getLeadEnv();
  const selectedSet = new Set(selected);
  const rules = await readManagedRedirects(env.internalAdminDir, process.cwd());
  await persistManagedRedirects(
    env.internalAdminDir,
    process.cwd(),
    rules.filter((rule) => !selectedSet.has(rule.from)),
  );
  await regenerateRedirectArtifacts();
  return internalJson({ success: true, deleted: selected.length, from: selected });
};
