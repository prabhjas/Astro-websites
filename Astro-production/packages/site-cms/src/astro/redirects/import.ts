import type { APIRoute } from 'astro';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getLeadEnv } from '../../context.js';
import { requireInternalJobAuth, internalJson } from '../../auth/internal-job.js';
import {
  parseRankMathRedirectImport,
  persistManagedRedirects,
  readManagedRedirects,
} from '../../runtime-redirects/store.js';

const execFileAsync = promisify(execFile);

export const prerender = false;

async function regenerateRedirectArtifacts(): Promise<void> {
  try {
    await execFileAsync('node', ['scripts/generate-redirects.mjs'], { cwd: process.cwd() });
  } catch (error) {
    console.error('[redirects/import] generate-redirects failed', error);
  }
}

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return internalJson({ success: false, message: 'Missing file' }, 400);
  }

  const fileName = (file.name || '').toLowerCase();
  const raw = await file.text();
  let parsed;
  try {
    parsed = parseRankMathRedirectImport(raw);
  } catch (error) {
    console.error('[redirects/import] parse failed', fileName, error);
    return internalJson({ success: false, message: 'Failed to parse import file' }, 400);
  }

  if (!parsed.length) {
    return internalJson({ success: false, message: 'Import file contains no redirects' }, 400);
  }

  const env = getLeadEnv();
  const deduped = Array.from(new Map(parsed.map((rule) => [rule.from, rule])).values());
  const existing = await readManagedRedirects(env.internalAdminDir, process.cwd());
  const mergedDeduped = Array.from(
    new Map([...existing, ...deduped].map((rule) => [rule.from, rule])).values(),
  );
  await persistManagedRedirects(env.internalAdminDir, process.cwd(), mergedDeduped);
  await regenerateRedirectArtifacts();

  return internalJson({ success: true, imported: deduped.length, total: mergedDeduped.length });
};
