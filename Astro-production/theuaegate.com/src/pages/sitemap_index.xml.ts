import type { APIRoute } from 'astro';
import { buildSitemapDataset } from '../lib/seo/sitemap-data.ts';
import { renderSitemapIndex, xmlResponse } from '../lib/seo/sitemap-xml.ts';
import { resolveInternalAdminDir } from '../env/server.ts';

export const prerender = false;

export const GET: APIRoute = ({ site, request }) => {
  const { indexItems } = buildSitemapDataset({
    astroSite: site ?? undefined,
    request,
    env: process.env,
    adminDir: resolveInternalAdminDir(),
  });
  return xmlResponse(renderSitemapIndex(indexItems));
};
