/**
 * Matches the live crawler URL (`/sitemap-index.xml` → `/sitemap-0.xml`).
 */
import type { APIRoute } from "astro";
import { SITE } from "../lib/schema";
import { xmlHeaders } from "../lib/sitemap";

export const GET: APIRoute = () => {
  const body = `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${SITE}/sitemap-0.xml</loc></sitemap></sitemapindex>`;
  return new Response(body, { headers: xmlHeaders });
};
