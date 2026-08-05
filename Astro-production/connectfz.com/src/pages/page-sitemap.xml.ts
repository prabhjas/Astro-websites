import type { APIRoute } from 'astro';
import { getDataset, notFoundResponse, xmlResponse } from '@/lib/seo/sitemap-response';
import { renderUrlSet } from '@/lib/seo/sitemap-xml';

export const prerender = false;

/** First page sitemap: /page-sitemap.xml */
export const GET: APIRoute = (context) => {
  const { pageChunks } = getDataset(context);
  const chunk = pageChunks[0];
  if (!chunk || chunk.length === 0) {
    return notFoundResponse('page-sitemap.xml has no entries');
  }
  return xmlResponse(renderUrlSet(chunk));
};
