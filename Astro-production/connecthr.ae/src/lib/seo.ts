import { absoluteUrl, decodeHtmlEntities, site, type SeoData } from "./content";

export type SeoInput = {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  schemas?: unknown[];
  noindex?: boolean;
  nofollow?: boolean;
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
};

export function seoRobotsFlags(
  robots?: { index?: string; follow?: string } | null,
  pathFlags?: { noindex?: boolean; nofollow?: boolean },
): { noindex: boolean; nofollow: boolean } {
  const noindex =
    Boolean(pathFlags?.noindex) || robots?.index?.toLowerCase() === "noindex";
  const nofollow =
    Boolean(pathFlags?.nofollow) || robots?.follow?.toLowerCase() === "nofollow";
  return { noindex, nofollow };
}

function decodeDeep(value: unknown): unknown {
  if (typeof value === "string") return decodeHtmlEntities(value);
  if (Array.isArray(value)) return value.map(decodeDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, decodeDeep(v)]),
    );
  }
  return value;
}

export function resolveSeo(input: SeoInput = {}, fallback?: SeoData) {
  const title = decodeHtmlEntities(
    input.title || fallback?.title || `${site.shortName} | HR & Payroll Software UAE`,
  );
  const description = decodeHtmlEntities(
    input.description || fallback?.description || site.description,
  );
  const canonical = absoluteUrl(input.canonical || fallback?.canonical || "/");
  const rawOgImage =
    [input.ogImage, fallback?.ogImage, site.ogImage].find(
      (value) => typeof value === "string" && value.trim().length > 0,
    ) || site.logo;
  const ogImage = absoluteUrl(rawOgImage);
  const ogType = input.ogType || "website";
  const robots =
    input.noindex && input.nofollow
      ? "noindex, nofollow"
      : input.noindex
        ? "noindex, follow"
        : "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large";

  const schemas = decodeDeep([
    ...(input.schemas || fallback?.schemas || []),
  ].filter(Boolean)) as unknown[];

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

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${site.url.replace(/\/$/, "")}/#organization`,
    name: site.name,
    url: site.url,
    logo: absoluteUrl(site.logo),
    image: absoluteUrl(site.ogImage),
    email: site.email,
    telephone: site.phone,
    address: {
      "@type": "PostalAddress",
      addressCountry: "AE",
      addressRegion: "Dubai",
    },
    areaServed: {
      "@type": "Country",
      name: "United Arab Emirates",
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

export function articleSchema(input: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.url),
    image: absoluteUrl(input.image || site.ogImage),
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
        url: absoluteUrl(site.logo),
      },
    },
    mainEntityOfPage: absoluteUrl(input.url),
  };
}
