export type NavItem = {
  label: string;
  href: string;
  children?: NavItem[];
};

export type SeoData = {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  schemas?: unknown[];
  robots?: { index?: string; follow?: string };
};

export type PageEntry = {
  id: number;
  type: "page";
  /** WPML language of this entry ("en" default, "ar" for /ar/ routes) */
  lang?: "en" | "ar";
  slug: string;
  path: string;
  link: string;
  title: string;
  content: string;
  bodyHtml?: string;
  excerpt: string;
  date: string;
  modified: string;
  parent: number;
  menuOrder: number;
  featuredImage: string;
  elementorCss?: string;
  pageCss?: string[];
  seo: SeoData;
};

export type PostEntry = {
  id: number;
  type: "post";
  lang?: "en" | "ar";
  slug: string;
  path: string;
  link: string;
  title: string;
  content: string;
  bodyHtml?: string;
  excerpt: string;
  date: string;
  modified: string;
  categories: number[];
  tags: number[];
  author: number;
  authorName: string;
  authorSlug: string;
  featuredImage: string;
  seo: SeoData;
  elementorCss?: string;
  pageCss?: string[];
  status?: "draft" | "published" | "trash";
};

export type CaseStudyEntry = {
  id: number;
  type: "case_study";
  lang?: "en" | "ar";
  slug: string;
  path: string;
  link: string;
  title: string;
  content: string;
  bodyHtml?: string;
  excerpt: string;
  date: string;
  modified: string;
  parent: number;
  menuOrder: number;
  featuredImage: string;
  elementorCss?: string;
  pageCss?: string[];
  seo: SeoData;
};

export type CategoryEntry = {
  id: number;
  name: string;
  slug: string;
  path: string;
  description: string;
  count: number;
  parent: number;
  status?: "active" | "trash";
};

export type TagEntry = {
  id: number;
  name: string;
  slug: string;
  path: string;
  description: string;
  count: number;
  status?: "active" | "trash";
};

export type AuthorEntry = {
  id: number;
  name: string;
  slug: string;
  path: string;
  description: string;
  avatar: string;
};
