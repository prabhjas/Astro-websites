import { absoluteUrl, site, type SeoData } from "./content";
import { licence, licenceSchemaFragment } from "./licence";

export type SeoInput = {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  schemas?: unknown[];
  noindex?: boolean;
  nofollow?: boolean;
  /** Full robots directive; wins over noindex/nofollow flags when set. */
  robots?: string;
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
};

export type SeoOriginOpts = {
  /** Request origin (e.g. Astro.url.origin) — used to absolutize media on local. */
  mediaOrigin?: string;
};

function robotsFromFlags(noindex?: boolean, nofollow?: boolean): string | undefined {
  if (!noindex && !nofollow) return undefined;
  return `${noindex ? "noindex" : "index"}, ${nofollow ? "nofollow" : "follow"}`;
}

function robotsFromSeoData(seo?: SeoData): string | undefined {
  const r = seo?.robots as string | Record<string, string> | undefined;
  if (!r) return undefined;
  // Exact live directive string — never rewrite
  if (typeof r === "string") return r.trim() || undefined;

  // Yoast-style object: preserve all tokens. Prefer live/HTML order when present:
  // index, follow, max-image-preview:…, max-snippet:…, max-video-preview:…
  const index = r.index || "index";
  const follow = r.follow || "follow";
  const extras: string[] = [];
  const preferredExtraKeys = [
    "max-image-preview",
    "max-snippet",
    "max-video-preview",
  ] as const;
  for (const key of preferredExtraKeys) {
    const val = r[key];
    if (typeof val === "string" && val.trim()) {
      // Yoast stores values like "max-snippet:-1" already prefixed
      extras.push(val.includes(":") ? val : `${key}:${val}`);
    }
  }
  for (const [key, val] of Object.entries(r)) {
    if (key === "index" || key === "follow") continue;
    if ((preferredExtraKeys as readonly string[]).includes(key)) continue;
    if (typeof val === "string" && val.trim()) {
      extras.push(val.includes(":") ? val : `${key}:${val}`);
    }
  }
  return [index, follow, ...extras].join(", ");
}

export function resolveSeo(
  input: SeoInput = {},
  fallback?: SeoData,
  opts: SeoOriginOpts = {},
) {
  const mediaOrigin = opts.mediaOrigin;
  const title = input.title || fallback?.title || `${site.name} | EOR, PEO, Payroll and HR Solutions`;
  const description =
    input.description || fallback?.description || site.description;
  const canonical = absoluteUrl(input.canonical || fallback?.canonical || "/");
  const ogImage = absoluteUrl(
    input.ogImage || fallback?.ogImage || site.ogImage || site.logo || "/",
    mediaOrigin,
  );
  const ogType = input.ogType || "website";
  const robots =
    input.robots ||
    robotsFromFlags(input.noindex, input.nofollow) ||
    robotsFromSeoData(fallback) ||
    "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large";

  const schemas = [
    ...(input.schemas || fallback?.schemas || []),
  ].filter(Boolean);

  return {
    title,
    description,
    canonical,
    ogImage,
    ogType,
    robots,
    schemas,
    publishedTime: input.publishedTime,
    modifiedTime: input.modifiedTime,
    authorName: input.authorName,
    siteName: site.name,
  };
}

export function organizationSchema(mediaOrigin?: string) {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${site.url.replace(/\/$/, "")}/#organization`,
    name: site.name,
    ...licenceSchemaFragment(absoluteUrl(licence.pdfPath)),
    url: site.url,
    logo: absoluteUrl(site.logo, mediaOrigin),
    image: absoluteUrl(site.ogImage || site.logo, mediaOrigin),
    email: site.email,
    ...(site.phone ? { telephone: site.phone } : {}),
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
      addressRegion: "Dubai",
    },
    areaServed: {
      "@type": "Place",
      name: "Middle East",
    },
    sameAs: [],
  };
}

export function breadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url),
    })),
  };
}

export function articleSchema(
  input: {
    title: string;
    description: string;
    url: string;
    image?: string;
    datePublished: string;
    dateModified?: string;
    authorName?: string;
  },
  mediaOrigin?: string,
) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.url),
    image: absoluteUrl(input.image || site.ogImage || site.logo, mediaOrigin),
    datePublished: input.datePublished,
    dateModified: input.dateModified || input.datePublished,
    author: {
      "@type": "Person",
      name: input.authorName || site.name,
    },
    publisher: {
      "@type": "Organization",
      name: site.name,
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl(site.logo, mediaOrigin),
      },
    },
    mainEntityOfPage: absoluteUrl(input.url),
  };
}
