import type { APIRoute } from 'astro';
import { getDataset, notFoundResponse, xmlResponse } from '@/lib/seo/sitemap-response';
import { renderUrlSet } from '@/lib/seo/sitemap-xml';

export const prerender = false;

export const GET: APIRoute = (context) => {
  const { guides } = getDataset(context);
  if (!guides.length) return notFoundResponse('guides-sitemap.xml has no entries');
  return xmlResponse(renderUrlSet(guides));
};
