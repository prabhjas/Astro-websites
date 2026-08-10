import type { APIRoute } from 'astro';
import { resolveLlmsTxtBody } from '../lib/seo/llms-serve.ts';
import { textResponse } from '../lib/seo/sitemap-response.ts';

export const prerender = false;

/** Alias of /llms.txt for crawlers that request /llm.txt. */
export const GET: APIRoute = async (context) => {
  const { body } = await resolveLlmsTxtBody({
    astroSite: context.site ?? undefined,
    request: context.request,
    trustRequestHost: false,
  });
  return textResponse(body);
};
