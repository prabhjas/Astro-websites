import type { APIRoute } from 'astro';
import { getDataset, siteOptionsFromAstro, xmlResponse } from '@/lib/seo/sitemap-response';
import { renderSitemapIndex } from '@/lib/seo/sitemap-xml';
import { caseStudyIndexItem } from '@/lib/seo/case-studies-sitemap';

export const prerender = false;

export const GET: APIRoute = (context) => {
  const { indexItems } = getDataset(context);
  const caseStudies = caseStudyIndexItem(siteOptionsFromAstro(context));
  const items = caseStudies ? [...indexItems, caseStudies] : indexItems;
  return xmlResponse(renderSitemapIndex(items));
};
