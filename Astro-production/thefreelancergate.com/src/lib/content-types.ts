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
  /**
   * Prefer the exact live meta robots string (e.g. "index, follow, max-image-preview:large, …").
   * Object form kept for Yoast REST imports — serialized without dropping max-* tokens.
   */
  robots?: string | { index?: string; follow?: string; [key: string]: string | undefined };
};

export type PageEntry = {
  id: number;
  type: "page";
  /** Original WP type when mirrored (page | guides | country | eor). */
  wpType?: string;
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
