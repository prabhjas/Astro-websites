/**
 * URL set listed from `/sitemap-index.xml`. Trailing slashes match canonicals.
 * English and Spanish are separate loc entries; hreflang lives in HTML.
 */
import type { APIRoute } from "astro";
import { sitemapLocs, xmlHeaders } from "../lib/sitemap";

export const GET: APIRoute = async () => {
  const urls = await sitemapLocs();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(body, { headers: xmlHeaders });
};
