import type { APIRoute } from 'astro';
import { resolveInternalAdminDir } from '../env/server.ts';
import {
  defaultRobotsContent,
  resolveManagedTextContent,
} from '../lib/seo/text-files-store.ts';

export const prerender = false;

export const GET: APIRoute = async ({ site }) => {
  const origin = (site?.origin ?? 'https://iberiaworkforce.com').replace(/\/$/, '');
  const body = await resolveManagedTextContent(
    resolveInternalAdminDir(),
    'robots',
    defaultRobotsContent(origin),
  );
  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  });
};
