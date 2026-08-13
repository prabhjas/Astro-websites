import type { APIRoute } from 'astro';
import { basename } from 'node:path';
import { parseEnhancedDateQuery } from '../../lib/enhanced/dates.js';
import {
  enhancedNoIndexHeaders,
  formatEnhancedHtml,
  runEnhancedJob,
} from '../../lib/enhanced/run-job.js';
import { getEnhancedJob } from '../../lib/enhanced/jobs.js';
import { classifyEnhancedFailure, sendEnhancedFailureAlert } from '../../lib/enhanced/alert.js';

export const prerender = false;

function safePhpBasename(raw: string): string | null {
  const name = basename(String(raw || '').replace(/\\/g, '/'));
  if (!/^[a-zA-Z0-9._-]+\.php$/.test(name)) return null;
  return name.toLowerCase();
}

function authorised(request: Request, secret: string): boolean {
  if (!secret) return false;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  const enhanced = request.headers.get('x-enhanced-key')?.trim();
  const internal = request.headers.get('x-internal-job-secret')?.trim();
  return bearer === secret || enhanced === secret || internal === secret;
}

/**
 * Publish-safe enhanced job URL (no `..` in the filename).
 * GET /enhanced/job?file=kinzahr.php&date=YYYY-MM-DD
 */
export const GET: APIRoute = async ({ request }) => {
  const secret =
    process.env.ENHANCED_RUN_SECRET?.trim() ||
    process.env.INTERNAL_JOB_SECRET?.trim() ||
    '';

  if (!authorised(request, secret)) {
    return new Response('Unauthorized', {
      status: 401,
      headers: enhancedNoIndexHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
    });
  }

  const url = new URL(request.url);
  const fileName = safePhpBasename(url.searchParams.get('file') || '');
  if (!fileName || !getEnhancedJob(fileName)) {
    return new Response(`Enhanced script not found: ${fileName || 'missing file='}`, {
      status: 404,
      headers: enhancedNoIndexHeaders({ 'Content-Type': 'text/plain; charset=utf-8' }),
    });
  }

  const dateOverride = parseEnhancedDateQuery(url.searchParams);
  const result = await runEnhancedJob(fileName, dateOverride);

  if (!result.ok && result.status >= 500) {
    const { category, reason } = classifyEnhancedFailure(result.log, result.error);
    const detail =
      typeof result.error === 'string'
        ? result.error
        : result.error
          ? JSON.stringify(result.error, null, 2)
          : result.log.filter((l) => /error|missing|fail/i.test(l)).slice(-5).join('\n') || '(no detail)';
    await sendEnhancedFailureAlert({
      jobId: fileName,
      status: result.status,
      category,
      reason,
      detail: detail.slice(0, 4000),
      logTail: result.log.slice(-40).join('\n\n').slice(0, 8000),
      at: new Date().toISOString(),
    });
  }

  const headers = enhancedNoIndexHeaders({
    'Content-Type': 'text/html; charset=utf-8',
  });
  if (result.window) {
    headers['X-Enhanced-Window'] = `${result.window.start}/${result.window.end}`;
    headers['X-Enhanced-Window-Source'] = result.window.source;
  }

  return new Response(formatEnhancedHtml(result), {
    status: result.status,
    headers,
  });
};
