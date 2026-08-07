import type { APIRoute } from 'astro';
import { getDataset, xmlResponse } from '@/lib/seo/sitemap-response';
import { renderSitemapIndex } from '@/lib/seo/sitemap-xml';

export const prerender = false;

export const GET: APIRoute = (context) => {
  const { indexItems } = getDataset(context);
  return xmlResponse(renderSitemapIndex(indexItems));
};
