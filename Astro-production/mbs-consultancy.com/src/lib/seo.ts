import { absoluteUrl, site, type SeoData } from "./content";
import { hasLicencePdf, licence } from "./licence";

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
  const title = input.title || fallback?.title || `${site.name} | Business Consultants in Dubai`;
  const description =
    input.description || fallback?.description || site.description;
  const canonical = absoluteUrl(input.canonical || fallback?.canonical || "/");
  const ogImage = absoluteUrl(
    input.ogImage || fallback?.ogImage || site.ogImage || site.logo || "/",
  );
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
    legalName: licence.businessName,
    url: site.url,
    identifier: {
      "@type": "PropertyValue",
      name: "DET Trade Licence Number",
      value: licence.number,
    },
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      name: `${licence.type} Trade Licence ${licence.number}`,
      credentialCategory: licence.type,
      identifier: licence.number,
      dateCreated: licence.issueDate,
      url: licence.verifyUrl,
      recognizedBy: {
        "@type": "GovernmentOrganization",
        name: licence.issuingAuthority,
        url: "https://www.dubaided.gov.ae/",
      },
      ...(hasLicencePdf()
        ? {
            subjectOf: {
              "@type": "DigitalDocument",
              url: absoluteUrl(licence.pdfPath),
            },
          }
        : {}),
    },
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
