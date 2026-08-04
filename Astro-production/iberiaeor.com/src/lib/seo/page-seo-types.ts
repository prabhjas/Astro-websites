/** Page SEO YAML shape used by the operations dashboard sitemap tools. */
export interface PageSeo {
  title: string;
  description: string;
  canonical?: string;
  robots?: string;
  keywords?: string;
  og?: {
    title?: string;
    description?: string;
    type?: string;
    locale?: string;
    image?: string;
    imageWidth?: number;
    imageHeight?: number;
  };
  twitter?: {
    card?: string;
    title?: string;
    description?: string;
  };
  schema?: {
    pageType?: string;
    organizationName?: string;
    datePublished?: string;
    dateModified?: string;
  };
}
