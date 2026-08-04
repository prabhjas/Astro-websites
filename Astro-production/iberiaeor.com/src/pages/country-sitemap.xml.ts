import type { APIRoute } from 'astro';
import { getDataset, notFoundResponse, xmlResponse } from '@/lib/seo/sitemap-response';
import { renderUrlSet } from '@/lib/seo/sitemap-xml';

export const prerender = false;

export const GET: APIRoute = (context) => {
  const { country } = getDataset(context);
  if (!country.length) return notFoundResponse('country-sitemap.xml has no entries');
  return xmlResponse(renderUrlSet(country));
};
