import siteJson from "../data/site.json";
import {
  readAuthors,
  readCaseStudies,
  readCategories,
  readPages,
  readPosts,
  readTags,
} from "./data-store";
import type {
  AuthorEntry,
  CaseStudyEntry,
  CategoryEntry,
  PageEntry,
  PostEntry,
  TagEntry,
} from "./content-types";

export type {
  AuthorEntry,
  CaseStudyEntry,
  CategoryEntry,
  NavItem,
  PageEntry,
  PostEntry,
  SeoData,
  TagEntry,
} from "./content-types";

export const site = siteJson as typeof siteJson & {
  navigation: import("./content-types").NavItem[];
  footerServices: { label: string; href: string }[];
  footerQuickLinks: { label: string; href: string }[];
};

/** Live getters — always read from disk so dashboard edits apply in SSR/dev. */
export function getPages(): PageEntry[] {
  return readPages();
}

export function getPosts(includeNonPublished = false): PostEntry[] {
  const rows = readPosts();
  if (includeNonPublished) return rows;
  return rows.filter((p) => !p.status || p.status === "published");
}

export function getCategories(includeTrash = false): CategoryEntry[] {
  const rows = readCategories();
  if (includeTrash) return rows;
  return rows.filter((c) => !c.status || c.status === "active");
}

export function getTags(includeTrash = false): TagEntry[] {
  const rows = readTags();
  if (includeTrash) return rows;
  return rows.filter((t) => !t.status || t.status === "active");
}

export function getAuthors(): AuthorEntry[] {
  return readAuthors();
}

export function getCaseStudies(): CaseStudyEntry[] {
  return readCaseStudies();
}

export function getCaseStudyByPath(pathname: string): CaseStudyEntry | undefined {
  const normalized = normalizePath(pathname);
  return getCaseStudies().find((c) => normalizePath(c.path) === normalized);
}

/** @deprecated Prefer getPages() for live data; kept for compatibility */
export const pages = readPages();
/** @deprecated Prefer getPosts() */
export const posts = readPosts().filter((p) => !p.status || p.status === "published");
/** @deprecated Prefer getCategories() */
export const categories = readCategories().filter((c) => !c.status || c.status === "active");
/** @deprecated Prefer getTags() */
export const tags = readTags().filter((t) => !t.status || t.status === "active");
/** @deprecated Prefer getAuthors() */
export const authors = readAuthors();

export function getPageByPath(pathname: string): PageEntry | undefined {
  const normalized = normalizePath(pathname);
  return getPages().find((p) => normalizePath(p.path) === normalized);
}

export function getPostByPath(pathname: string): PostEntry | undefined {
  const normalized = normalizePath(pathname);
  return getPosts(true).find((p) => normalizePath(p.path) === normalized);
}

export function getPublishedPostByPath(pathname: string): PostEntry | undefined {
  const post = getPostByPath(pathname);
  if (!post) return undefined;
  if (post.status && post.status !== "published") return undefined;
  return post;
}

export function getCategoryBySlug(slug: string): CategoryEntry | undefined {
  return getCategories().find((c) => c.slug === slug);
}

export function getTagBySlug(slug: string): TagEntry | undefined {
  return getTags().find((t) => t.slug === slug);
}

export function getAuthorBySlug(slug: string): AuthorEntry | undefined {
  return getAuthors().find((a) => a.slug === slug);
}

export function getPostsByCategory(categoryId: number): PostEntry[] {
  return getPosts()
    .filter((p) => p.categories.includes(categoryId))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPostsByTag(tagId: number): PostEntry[] {
  return getPosts()
    .filter((p) => p.tags.includes(tagId))
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

export function getPostsByAuthor(authorId: number): PostEntry[] {
  const author = getAuthors().find((a) => a.id === authorId);
  // Live WP author archive /author/adm_connecthr/ (user id 8) aggregates all
  // "Connect HR" bylines — mirrored posts also use ids 6/12 and slug connecthr.
  const isInternalConnectHr =
    author?.slug === "adm_connecthr" ||
    author?.slug === "connecthr" ||
    authorId === 8 ||
    authorId === 12 ||
    authorId === 6;
  const aliasSlugs = new Set(
    isInternalConnectHr
      ? ["adm_connecthr", "connecthr"]
      : author?.slug
        ? [author.slug]
        : [],
  );
  const aliasIds = new Set(
    isInternalConnectHr
      ? [8, 12, 6]
      : aliasSlugs.size
        ? getAuthors()
            .filter((a) => aliasSlugs.has(a.slug))
            .map((a) => a.id)
        : [authorId],
  );
  return getPosts()
    .filter((p) => {
      if (aliasIds.has(p.author)) return true;
      if (author && p.authorName && p.authorName === author.name) return true;
      if (aliasSlugs.size && aliasSlugs.has(p.authorSlug)) return true;
      return p.author === authorId;
    })
    .sort((a, b) => +new Date(b.date) - +new Date(a.date));
}

/** Live Theme Builder "related" block uses recent posts (not category scoring). */
export function getRelatedPosts(post: PostEntry, limit = 4): PostEntry[] {
  return getPosts()
    .filter((p) => p.id !== post.id)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))
    .slice(0, limit);
}

export function getPrimaryCategoryName(post: PostEntry): string {
  const cats = getCategories();
  for (const id of post.categories || []) {
    const cat = cats.find((c) => c.id === id);
    if (cat?.name) return cat.name.replace(/&amp;/g, "&");
  }
  return "Blog";
}

export function normalizePath(pathname: string): string {
  if (!pathname || pathname === "/") return "/";
  let p = pathname.split("?")[0].split("#")[0];
  if (!p.startsWith("/")) p = `/${p}`;
  if (!p.endsWith("/")) p = `${p}/`;
  return p;
}

export function absoluteUrl(pathname: string): string {
  if (pathname.startsWith("http")) return pathname;
  const base = site.url.replace(/\/$/, "");
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${base}${path}`;
}

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeHtmlEntitiesOnce(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : _;
    })
    .replace(/&([a-z]+);/gi, (match, name: string) => NAMED_HTML_ENTITIES[name.toLowerCase()] ?? match);
}

/** Decode single- and double-encoded WP entities (&#038;, &#8211;, &amp;, …). */
export function decodeHtmlEntities(text: string): string {
  if (!text || !/&(?:#x?[0-9a-f]+|[a-z]+);/i.test(text)) return text;
  let out = text;
  let prev = "";
  while (out !== prev) {
    prev = out;
    out = decodeHtmlEntitiesOnce(out);
  }
  return out;
}

export function stripHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-AE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function paginate<T>(items: T[], page: number, perPage = 9) {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const current = Math.min(Math.max(1, page), totalPages);
  const start = (current - 1) * perPage;
  return {
    items: items.slice(start, start + perPage),
    page: current,
    perPage,
    total,
    totalPages,
    hasPrev: current > 1,
    hasNext: current < totalPages,
  };
}

export const POSTS_PER_PAGE = 9;
