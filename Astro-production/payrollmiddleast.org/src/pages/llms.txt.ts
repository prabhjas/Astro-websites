import type { APIRoute } from 'astro';
import { resolveLlmsTxtBody } from '../lib/seo/llms-serve.ts';
import { textResponse } from '../lib/seo/sitemap-response.ts';

export const prerender = false;

/** Dynamic llms.txt (auto from sitemap discovery, or dashboard full override). */
export const GET: APIRoute = async (context) => {
  const { body } = await resolveLlmsTxtBody({
    astroSite: context.site ?? undefined,
    request: context.request,
    trustRequestHost: false,
  });
  return textResponse(body);
};
