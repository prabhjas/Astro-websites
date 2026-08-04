import type { APIContext } from 'astro';
import { resolveInternalAdminDir } from '../../env/server.ts';
import { SITEMAP_CACHE_CONTROL } from './sitemap-config.ts';
import { buildSitemapDataset, type SitemapDataOptions } from './sitemap-data.ts';

export function siteOptionsFromAstro(context: APIContext): SitemapDataOptions {
  return {
    astroSite: context.site ?? undefined,
    request: context.request,
    env: typeof process !== 'undefined' ? process.env : undefined,
    // Static hosting: never trust arbitrary Host headers for SEO URLs
    trustRequestHost: false,
    adminDir: resolveInternalAdminDir(),
  };
}

export function xmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': SITEMAP_CACHE_CONTROL,
    },
  });
}

export function textResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': SITEMAP_CACHE_CONTROL,
    },
  });
}

export function notFoundResponse(message = 'Not found'): Response {
  return new Response(message, {
    status: 404,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

export function getDataset(context: APIContext) {
  return buildSitemapDataset(siteOptionsFromAstro(context));
}
