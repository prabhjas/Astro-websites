import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../../context.js';
import { requireInternalJobAuth, internalJson } from '../../../auth/internal-job.js';
import { writeManagedTextFile, type ManagedTextKind } from '../../../seo/text-files-store.js';

export const prerender = false;

function kindFromForm(value: FormDataEntryValue | null): ManagedTextKind | null {
  const raw = String(value || '').trim();
  if (raw === 'robots' || raw === 'llm') return raw;
  return null;
}

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();

  const kind = kindFromForm(formData.get('kind'));
  if (!kind) {
    return internalJson({ success: false, message: 'Invalid SEO text file kind' }, 400);
  }

  const updatedBy = String(formData.get('updatedBy') || 'internal-job');
  const env = getLeadEnv();
  await writeManagedTextFile(env.internalAdminDir, kind, {
    content: String(formData.get('content') || ''),
    updatedBy,
  });

  return internalJson({ success: true, kind });
};
