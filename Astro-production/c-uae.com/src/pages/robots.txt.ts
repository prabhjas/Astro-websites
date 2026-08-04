import type { APIRoute } from 'astro';
import { resolveInternalAdminDir } from '../env/server.ts';
import { getDataset, textResponse } from '../lib/seo/sitemap-response.ts';
import {
  defaultRobotsContent,
  resolveManagedTextContent,
} from '../lib/seo/text-files-store.ts';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const { siteOrigin } = getDataset(context);
  const body = await resolveManagedTextContent(
    resolveInternalAdminDir(),
    'robots',
    defaultRobotsContent(siteOrigin),
  );
  return textResponse(body);
};
