import type { APIRoute } from 'astro';
import { getDataset, notFoundResponse, xmlResponse } from '../lib/seo/sitemap-response.ts';
import { parseSitemapSuffix } from '../lib/seo/sitemap-utils.ts';
import { renderUrlSet } from '../lib/seo/sitemap-xml.ts';

export const prerender = false;

/**
 * Additional post sitemaps: /post-sitemap2.xml, /post-sitemap3.xml, ...
 */
export const GET: APIRoute = (context) => {
  const suffix = parseSitemapSuffix(context.params.page);
  if (suffix == null) return notFoundResponse();

  const { postChunks } = getDataset(context);
  const chunk = postChunks[suffix - 1];
  if (!chunk || chunk.length === 0) return notFoundResponse();

  return xmlResponse(renderUrlSet(chunk));
};
