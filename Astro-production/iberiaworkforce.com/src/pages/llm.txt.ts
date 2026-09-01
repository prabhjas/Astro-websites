/**
 * Singular alias — some crawlers request /llm.txt instead of /llms.txt.
 */
import type { APIRoute } from 'astro';
import { resolveInternalAdminDir } from '../env/server.ts';
import { buildLlmsTxt } from '../lib/llms';
import { resolveManagedTextContent } from '../lib/seo/text-files-store.ts';

export const prerender = false;

export const GET: APIRoute = async () => {
  const fallback = await buildLlmsTxt();
  const body = await resolveManagedTextContent(
    resolveInternalAdminDir(),
    'llm',
    fallback,
  );
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
