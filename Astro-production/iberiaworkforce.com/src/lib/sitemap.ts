/**
 * URL list for `/sitemap-0.xml`. No `lastmod` — there is no honest per-page
 * date in the content collection, and a build-clock date would claim every
 * URL changed on every deploy.
 */
import { getCollection } from "astro:content";
import { pageUrl, SITE } from "./schema";

const STATIC_PATHS = ["/", "/about", "/contact", "/services"];

export async function sitemapLocs(): Promise<string[]> {
  const [services, servicesEs] = await Promise.all([
    getCollection("services"),
    getCollection("servicesEs"),
  ]);

  return [
    ...STATIC_PATHS.flatMap((path) => [
      path === "/" ? `${SITE}/` : pageUrl(path),
      path === "/" ? pageUrl("", "es") : pageUrl(path, "es"),
    ]),
    ...services.map((entry) => pageUrl(entry.id)),
    ...servicesEs.map((entry) => pageUrl(entry.id, "es")),
  ];
}

export const xmlHeaders = {
  "Content-Type": "application/xml; charset=utf-8",
};
