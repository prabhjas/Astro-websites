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
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
};

export function resolveSeo(input: SeoInput = {}, fallback?: SeoData) {
  const title = input.title || fallback?.title || `${site.name} | EOR, PEO, Payroll and HR Solutions`;
  const description =
    input.description || fallback?.description || site.description;
  const canonical = absoluteUrl(input.canonical || fallback?.canonical || "/");
  const ogImage = absoluteUrl(input.ogImage || fallback?.ogImage || site.ogImage);
  const ogType = input.ogType || "website";
  const robots = input.noindex ? "noindex, follow" : "index, follow, max-snippet:-1, max-video-preview:-1, max-image-preview:large";

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

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "LocalBusiness"],
    "@id": `${site.url.replace(/\/$/, "")}/#organization`,
    name: site.name,
    ...licenceSchemaFragment(absoluteUrl(licence.pdfPath)),
    url: site.url,
    logo: absoluteUrl(site.logo),
    image: absoluteUrl(site.ogImage || site.logo),
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
