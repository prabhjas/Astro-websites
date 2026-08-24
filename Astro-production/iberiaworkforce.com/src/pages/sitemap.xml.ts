/**
 * Alias: robots and crawlers on this domain use `/sitemap-index.xml`.
 */
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ url }) =>
  new Response(null, {
    status: 301,
    headers: { Location: new URL("/sitemap-index.xml", url).href },
  });
