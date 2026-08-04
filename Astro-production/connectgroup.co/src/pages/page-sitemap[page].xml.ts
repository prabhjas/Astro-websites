import type { APIRoute } from 'astro';
import { getDataset, notFoundResponse, xmlResponse } from '../lib/seo/sitemap-response.ts';
import { parseSitemapSuffix } from '../lib/seo/sitemap-utils.ts';
import { renderUrlSet } from '../lib/seo/sitemap-xml.ts';

export const prerender = false;

/**
 * Additional page sitemaps: /page-sitemap2.xml, /page-sitemap3.xml, ...
 * (Only populated when page count exceeds SITEMAP_ENTRY_LIMIT.)
 */
export const GET: APIRoute = (context) => {
  const suffix = parseSitemapSuffix(context.params.page);
  if (suffix == null) return notFoundResponse();

  const { pageChunks } = getDataset(context);
  const chunk = pageChunks[suffix - 1];
  if (!chunk || chunk.length === 0) return notFoundResponse();

  return xmlResponse(renderUrlSet(chunk));
};
