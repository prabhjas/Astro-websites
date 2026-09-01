/**
 * Alias: robots and crawlers on this domain use `/sitemap-index.xml`.
 * Must be SSR — static prerender turns this Response into HTML meta-refresh (200).
 * Middleware also 301s `/sitemap.xml` → `/sitemap-index.xml` as a belt-and-suspenders.
 */
import type { APIRoute } from "astro";

export const prerender = false;

export const GET: APIRoute = ({ url }) =>
  new Response(null, {
    status: 301,
    headers: { Location: new URL("/sitemap-index.xml", url).pathname + url.search },
  });
