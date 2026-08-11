import type { APIRoute } from 'astro';
import { getDataset, notFoundResponse, xmlResponse } from '@/lib/seo/sitemap-response';
import { renderUrlSet } from '@/lib/seo/sitemap-xml';

export const prerender = false;

/** Rank Math local sitemap (locations.kml) — /local-sitemap.xml */
export const GET: APIRoute = (context) => {
  const { local } = getDataset(context);
  if (!local.length) return notFoundResponse('local-sitemap.xml has no entries');
  return xmlResponse(renderUrlSet(local));
};
