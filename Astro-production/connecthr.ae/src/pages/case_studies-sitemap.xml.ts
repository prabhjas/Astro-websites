import type { APIRoute } from 'astro';
import { notFoundResponse, siteOptionsFromAstro, xmlResponse } from '@/lib/seo/sitemap-response';
import { renderUrlSet } from '@/lib/seo/sitemap-xml';
import { collectCaseStudyEntries } from '@/lib/seo/case-studies-sitemap';
import { resolveSiteOrigin } from '@/lib/seo/site-url';

export const prerender = false;

/** Case studies CPT sitemap: /case_studies-sitemap.xml */
export const GET: APIRoute = (context) => {
  const options = siteOptionsFromAstro(context);
  const siteOrigin = resolveSiteOrigin(options);
  const entries = collectCaseStudyEntries(siteOrigin);
  if (!entries.length) {
    return notFoundResponse('case_studies-sitemap.xml has no entries');
  }
  return xmlResponse(renderUrlSet(entries));
};
