/**
 * The sitemap.
 *
 * Hand-rolled rather than `@astrojs/sitemap`, for two reasons. The integration
 * emits a `sitemap-index.xml` pointing at a `sitemap-0.xml`, which is machinery
 * an eighteen-page site does not need; and it invites a `lastmod` this site
 * cannot honestly supply. There is no per-page modified date anywhere in the
 * content collection, and a `lastmod` derived from the build clock says every
 * page changed every deploy — which crawlers learn to ignore. So none is
 * emitted. `changefreq` and `priority` are omitted for the same reason: Google
 * has said publicly it ignores both.
 *
 * URLs carry a trailing slash, matching the canonical tag in `Layout.astro` and
 * the directory-per-route shape of the build itself.
 *
 * English and Spanish editions are listed as separate URLs. Hreflang lives in
 * the HTML head; the sitemap stays a flat loc list.
 */
import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { pageUrl, SITE } from "../lib/schema";

const STATIC_PATHS = ["/", "/about", "/contact", "/services"];

export const GET: APIRoute = async () => {
  const [services, servicesEs] = await Promise.all([
    getCollection("services"),
    getCollection("servicesEs"),
  ]);

  const urls = [
    ...STATIC_PATHS.flatMap((path) => [
      path === "/" ? `${SITE}/` : pageUrl(path),
      path === "/" ? pageUrl("", "es") : pageUrl(path, "es"),
    ]),
    ...services.map((entry) => pageUrl(entry.id)),
    ...servicesEs.map((entry) => pageUrl(entry.id, "es")),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
