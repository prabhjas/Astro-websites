import type { APIRoute } from 'astro';
import { getDataset, xmlResponse } from '../lib/seo/sitemap-response.ts';
import { renderSitemapIndex } from '../lib/seo/sitemap-xml.ts';

export const prerender = false;

export const GET: APIRoute = (context) => {
  const { indexItems } = getDataset(context);
  return xmlResponse(renderSitemapIndex(indexItems));
};
