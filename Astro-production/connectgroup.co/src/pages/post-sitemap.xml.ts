import type { APIRoute } from 'astro';
import { notFoundResponse, getDataset, xmlResponse } from '../lib/seo/sitemap-response.ts';
import { renderUrlSet } from '../lib/seo/sitemap-xml.ts';

export const prerender = false;

/** First post sitemap: /post-sitemap.xml */
export const GET: APIRoute = (context) => {
  const { postChunks } = getDataset(context);
  const chunk = postChunks[0];
  if (!chunk || chunk.length === 0) {
    return notFoundResponse('post-sitemap.xml has no entries');
  }
  return xmlResponse(renderUrlSet(chunk));
};
