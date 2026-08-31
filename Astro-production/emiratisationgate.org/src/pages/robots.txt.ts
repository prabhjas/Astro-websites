import type { APIRoute } from 'astro';
import { resolveInternalAdminDir } from '../env/server.ts';
import { textResponse } from '../lib/seo/sitemap-response.ts';
import { resolveSiteOrigin } from '../lib/seo/site-url.ts';
import {
  defaultRobotsContent,
  resolveManagedTextContent,
} from '../lib/seo/text-files-store.ts';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  // Resolve origin without building the full sitemap dataset — a single bad
  // blog JSON must not take /robots.txt offline.
  let siteOrigin: string;
  try {
    siteOrigin = resolveSiteOrigin({
      astroSite: context.site ?? undefined,
      request: context.request,
      env: process.env,
      trustRequestHost: false,
    });
  } catch {
    siteOrigin = 'https://emiratisationgate.org';
  }
  const body = await resolveManagedTextContent(
    resolveInternalAdminDir(),
    'robots',
    defaultRobotsContent(siteOrigin),
  );
  return textResponse(body);
};
