import type { APIRoute } from 'astro';
import { getServerEnv } from '../../../../env/server';
import { hasDashboardRole } from '../../../../lib/auth/permissions';
import { readDashboardSession } from '../../../../lib/auth/session';
import { InternalUploadStore } from '../../../../lib/internal-uploads/store';
import { applyInternalNoIndexHeaders } from '../../../../lib/security/internal-response';

export const prerender = false;

export const GET: APIRoute = async ({ params, cookies }) => {
  const session = readDashboardSession(cookies);
  if (!session || !hasDashboardRole(session, 'viewer')) {
    return new Response('Forbidden', { status: 403 });
  }

  const env = getServerEnv();
  const store = new InternalUploadStore({ rootDir: env.internalUploadDir });
  const payload = await store.readBinary(params.uploadId || '');
  if (!payload) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers({
    'Content-Type': payload.record.mimeType || 'application/octet-stream',
    'Content-Disposition': `attachment; filename="${payload.record.originalName.replaceAll('"', '')}"`,
  });
  applyInternalNoIndexHeaders(headers);
  return new Response(payload.buffer, { status: 200, headers });
};
