import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

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

/** Load SEO YAML from src/data/seo/<slug>.yml (SEO team edits these). */
export function loadPageSeo(slug: string): PageSeo {
  const filePath = join(process.cwd(), 'src/data/seo', `${slug}.yml`);
  const raw = readFileSync(filePath, 'utf8');
  return parse(raw) as PageSeo;
}
