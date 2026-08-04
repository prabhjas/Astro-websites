import type { APIRoute } from 'astro';
import { getLeadEnv } from '../../../context.js';
import { requireInternalJobAuth, internalJson } from '../../../auth/internal-job.js';
import { writeLlmsConfig } from '../../../seo/llms-config-store.js';
import { writeManagedTextFile } from '../../../seo/text-files-store.js';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const denied = requireInternalJobAuth(request);
  if (denied) return denied;

  const formData = await request.formData();
  const updatedBy = String(formData.get('updatedBy') || 'internal-job');

  const env = getLeadEnv();
  const mode = String(formData.get('mode') || 'auto') === 'override' ? 'override' : 'auto';

  await writeLlmsConfig(env.internalAdminDir, {
    mode,
    siteTitle: String(formData.get('siteTitle') || ''),
    summary: String(formData.get('summary') || ''),
    details: String(formData.get('details') || ''),
    groupOrder: String(formData.get('groupOrder') || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    postsCount: Number(formData.get('postsCount') || 15),
    optionalMarkdown: String(formData.get('optionalMarkdown') || ''),
    blogNote: String(formData.get('blogNote') || ''),
    updatedBy,
  });

  if (mode === 'override') {
    await writeManagedTextFile(env.internalAdminDir, 'llm', {
      content: String(formData.get('content') || ''),
      updatedBy,
    });
  }

  return internalJson({ success: true, mode });
};
